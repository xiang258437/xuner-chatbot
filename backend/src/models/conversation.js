const { db } = require('./database');

const Conversation = {
  /** 创建新会话 */
  create(userId, title = '新的聊天') {
    const result = db().run('INSERT INTO conversations (user_id, title) VALUES (?, ?)', userId, title);
    return this.findById(result.lastInsertRowid);
  },

  /** 根据ID查找 */
  findById(id) {
    return db().get('SELECT * FROM conversations WHERE id = ?', id);
  },

  /** 获取用户的会话列表（按最近活跃排序） */
  findByUserId(userId, limit = 50, offset = 0) {
    return db().all(
      'SELECT c.*, (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count FROM conversations c WHERE c.user_id = ? AND c.is_active = 1 ORDER BY c.updated_at DESC LIMIT ? OFFSET ?',
      userId, limit, offset
    );
  },

  /** 更新会话标题 */
  updateTitle(id, title) {
    db().run("UPDATE conversations SET title = ?, updated_at = datetime('now','localtime') WHERE id = ?", title, id);
    return this.findById(id);
  },

  /** 更新会话活跃时间 */
  touch(id) {
    db().run("UPDATE conversations SET updated_at = datetime('now','localtime') WHERE id = ?", id);
  },

  /** 归档会话 */
  archive(id) {
    db().run("UPDATE conversations SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?", id);
  },

  /** 删除会话及其消息 */
  delete(id) {
    db().run('DELETE FROM memory_access_log WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)', id);
    db().run('DELETE FROM messages WHERE conversation_id = ?', id);
    db().run('DELETE FROM conversations WHERE id = ?', id);
  },
};

module.exports = Conversation;
