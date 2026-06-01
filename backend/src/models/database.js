const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data.db');

let SQL = null;
let dbInstance = null;

// sql.js 兼容包装器，提供类似 better-sqlite3 的 API
class DatabaseWrapper {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  /** 执行 SQL（INSERT/UPDATE/DELETE） */
  run(sql, ...params) {
    const flatParams = params.flat();
    this.db.run(sql, flatParams);
    const lastId = this.db.exec('SELECT last_insert_rowid() as id');
    const changes = this.db.getRowsModified();
    return {
      lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
      changes,
    };
  }

  /** 执行查询，返回单行 */
  get(sql, ...params) {
    const flatParams = params.flat();
    const stmt = this.db.prepare(sql);
    if (flatParams.length > 0) {
      stmt.bind(flatParams);
    }
    let result = null;
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      result = {};
      columns.forEach((col, i) => {
        result[col] = values[i];
      });
    }
    stmt.free();
    return result;
  }

  /** 执行查询，返回多行 */
  all(sql, ...params) {
    const flatParams = params.flat();
    const results = [];
    const stmt = this.db.prepare(sql);
    if (flatParams.length > 0) {
      stmt.bind(flatParams);
    }
    const columns = stmt.getColumnNames();
    while (stmt.step()) {
      const values = stmt.get();
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      results.push(row);
    }
    stmt.free();
    return results;
  }

  /** 执行多条SQL（建表用） */
  exec(sql) {
    this.db.exec(sql);
  }

  /** 预处理语句（返回包装器） */
  prepare(sql) {
    return new StatementWrapper(this.db, sql);
  }
}

class StatementWrapper {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    return dbInstance.run(this.sql, ...params);
  }

  get(...params) {
    return dbInstance.get(this.sql, ...params);
  }

  all(...params) {
    return dbInstance.all(this.sql, ...params);
  }
}

/** 保存数据库到磁盘 */
function saveToDisk() {
  if (dbInstance && dbInstance.db) {
    const data = dbInstance.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/** 自动保存（每30秒和进程退出时） */
let saveInterval = null;
function startAutoSave() {
  if (saveInterval) return;
  saveInterval = setInterval(saveToDisk, 30000);
}

function stopAutoSave() {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

async function initDatabase() {
  const wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

  // 尝试用本地文件初始化
  let config = {};
  if (fs.existsSync(wasmPath)) {
    const wasmBuffer = fs.readFileSync(wasmPath);
    config = { wasmBinary: wasmBuffer };
  }

  SQL = await initSqlJs(config);

  // 如果已有数据库文件，加载它
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  dbInstance = new DatabaseWrapper(sqlDb);

  // 建表
  dbInstance.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openid TEXT UNIQUE NOT NULL,
        unionid TEXT,
        nickname TEXT DEFAULT '微信用户',
        avatar_url TEXT DEFAULT '',
        persona_context TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT DEFAULT '新的聊天',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        image_url TEXT,
        image_description TEXT,
        audio_url TEXT,
        audio_text TEXT,
        token_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        fact_key TEXT NOT NULL,
        fact_value TEXT NOT NULL,
        importance INTEGER DEFAULT 3,
        confidence REAL DEFAULT 1.0,
        source_message_ids TEXT,
        access_count INTEGER DEFAULT 0,
        last_accessed_at TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS memory_access_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        memory_ids TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (message_id) REFERENCES messages(id)
    );

    CREATE TABLE IF NOT EXISTS important_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        memory_id INTEGER,
        date_type TEXT NOT NULL,
        event_name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        is_recurring INTEGER DEFAULT 0,
        reminder_sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (memory_id) REFERENCES memories(id)
    );
  `);

  // 创建索引（分别执行）
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, category);',
    'CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, importance DESC);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_unique ON memories(user_id, category, fact_key);',
  ];
  for (const idx of indexes) {
    try { dbInstance.db.run(idx); } catch (e) { /* 索引可能已存在 */ }
  }

  saveToDisk();
  startAutoSave();

  console.log('[DB] 数据库初始化完成 (sql.js)');
  console.log(`[DB] 数据文件: ${DB_PATH}`);
}

// 进程退出时保存
process.on('exit', () => {
  stopAutoSave();
  saveToDisk();
});

process.on('SIGINT', () => {
  stopAutoSave();
  saveToDisk();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAutoSave();
  saveToDisk();
  process.exit(0);
});

module.exports = { db: () => dbInstance, initDatabase, saveToDisk };
