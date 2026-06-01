const { db } = require('./database');

const Memory = {
  /** 插入或更新记忆 */
  upsert({ userId, category, factKey, factValue, importance = 3, confidence = 1.0, sourceMessageId }) {
    const existing = db().get(
      'SELECT * FROM memories WHERE user_id = ? AND category = ? AND fact_key = ?',
      userId, category, factKey
    );

    if (existing) {
      const newImportance = Math.max(existing.importance, importance);
      const newConfidence = confidence >= existing.confidence ? confidence : existing.confidence;
      let sourceIds;
      if (existing.source_message_ids) {
        try {
          const ids = JSON.parse(existing.source_message_ids);
          if (!ids.includes(sourceMessageId)) ids.push(sourceMessageId);
          sourceIds = JSON.stringify(ids);
        } catch {
          sourceIds = JSON.stringify([sourceMessageId]);
        }
      } else {
        sourceIds = sourceMessageId ? JSON.stringify([sourceMessageId]) : null;
      }

      db().run(
        `UPDATE memories SET fact_value = ?, importance = ?, confidence = ?, source_message_ids = ?,
         updated_at = datetime('now','localtime') WHERE id = ?`,
        factValue, newImportance, newConfidence, sourceIds, existing.id
      );
      return this.findById(existing.id);
    } else {
      const sourceIds = sourceMessageId ? JSON.stringify([sourceMessageId]) : null;
      const result = db().run(
        'INSERT INTO memories (user_id, category, fact_key, fact_value, importance, confidence, source_message_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
        userId, category, factKey, factValue, importance, confidence, sourceIds
      );
      return this.findById(result.lastInsertRowid);
    }
  },

  /** 根据ID查找 */
  findById(id) {
    return db().get('SELECT * FROM memories WHERE id = ?', id);
  },

  /** 获取用户的所有记忆（分类排序） */
  findByUserId(userId) {
    return db().all(
      'SELECT * FROM memories WHERE user_id = ? ORDER BY category, importance DESC',
      userId
    );
  },

  /** 关键词搜索记忆 */
  searchByKeywords(userId, keywords, limit = 8) {
    if (!keywords || keywords.length === 0) {
      return db().all(
        'SELECT * FROM memories WHERE user_id = ? ORDER BY importance DESC LIMIT ?',
        userId, limit
      );
    }

    const likeClauses = keywords.map(() => '(fact_key LIKE ? OR fact_value LIKE ?)').join(' OR ');
    const params = [];
    keywords.forEach(k => {
      params.push(`%${k}%`, `%${k}%`);
    });

    return db().all(
      `SELECT * FROM memories WHERE user_id = ? AND (${likeClauses})
       ORDER BY importance DESC, access_count DESC LIMIT ?`,
      userId, ...params, limit
    );
  },

  /** 获取高重要性记忆 */
  getHighImportance(userId, minImportance = 7) {
    return db().all(
      'SELECT * FROM memories WHERE user_id = ? AND importance >= ? ORDER BY importance DESC',
      userId, minImportance
    );
  },

  /** 更新访问计数 */
  recordAccess(id) {
    db().run(
      "UPDATE memories SET access_count = access_count + 1, last_accessed_at = datetime('now','localtime') WHERE id = ?",
      id
    );
  },

  /** 删除记忆 */
  delete(id) {
    db().run('DELETE FROM important_dates WHERE memory_id = ?', id);
    db().run('DELETE FROM memories WHERE id = ?', id);
  },

  /** 删除用户所有记忆 */
  deleteAllByUserId(userId) {
    db().run('DELETE FROM important_dates WHERE user_id = ?', userId);
    db().run('DELETE FROM memories WHERE user_id = ?', userId);
  },

  /** 批量记录访问 */
  recordAccessBatch(ids) {
    if (!ids || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db().run(
      `UPDATE memories SET access_count = access_count + 1, last_accessed_at = datetime('now','localtime') WHERE id IN (${placeholders})`,
      ...ids
    );
  },

  /** 添加重要日期 */
  addImportantDate({ userId, memoryId, dateType, eventName, eventDate, isRecurring = 0 }) {
    return db().run(
      'INSERT INTO important_dates (user_id, memory_id, date_type, event_name, event_date, is_recurring) VALUES (?, ?, ?, ?, ?, ?)',
      userId, memoryId || null, dateType, eventName, eventDate, isRecurring
    );
  },

  /** 获取用户重要日期 */
  getImportantDates(userId) {
    return db().all(
      'SELECT * FROM important_dates WHERE user_id = ? ORDER BY event_date',
      userId
    );
  },

  /** 获取即将到来的重要日期（7天内） */
  getUpcomingDates(userId, daysAhead = 7) {
    return db().all(
      `SELECT * FROM important_dates WHERE user_id = ?
       AND (
         (is_recurring = 1 AND substr(event_date, 6) >= strftime('%m-%d', 'now', 'localtime')
          AND substr(event_date, 6) <= strftime('%m-%d', 'now', 'localtime', '+${daysAhead} days'))
         OR
         (is_recurring = 0 AND event_date >= date('now', 'localtime')
          AND event_date <= date('now', 'localtime', '+${daysAhead} days'))
       ) ORDER BY event_date`,
      userId
    );
  },
};

module.exports = Memory;
