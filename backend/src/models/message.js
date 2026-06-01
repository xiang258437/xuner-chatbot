const { db } = require('./database');

const Message = {
  /** 创建消息 */
  create({ conversationId, role, content, imageUrl, imageDescription, audioUrl, audioText, tokenCount = 0 }) {
    const result = db().run(
      'INSERT INTO messages (conversation_id, role, content, image_url, image_description, audio_url, audio_text, token_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      conversationId, role, content, imageUrl || null, imageDescription || null, audioUrl || null, audioText || null, tokenCount
    );
    return this.findById(result.lastInsertRowid);
  },

  /** 根据ID查找 */
  findById(id) {
    return db().get('SELECT * FROM messages WHERE id = ?', id);
  },

  /** 获取会话的消息历史（分页，从旧到新排列） */
  findByConversationId(conversationId, limit = 50, beforeId = null) {
    if (beforeId) {
      const results = db().all(
        'SELECT * FROM messages WHERE conversation_id = ? AND id < ? ORDER BY id DESC LIMIT ?',
        conversationId, beforeId, limit
      );
      return results.reverse();
    }
    const results = db().all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?',
      conversationId, limit
    );
    return results.reverse();
  },

  /** 获取会话的最近N条消息（用于构建AI上下文） */
  getRecentMessages(conversationId, count = 30) {
    const results = db().all(
      'SELECT role, content, image_description FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?',
      conversationId, count
    );
    return results.reverse();
  },

  /** 统计会话的消息数 */
  countByConversationId(conversationId) {
    const result = db().get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', conversationId);
    return result ? result.count : 0;
  },
};

module.exports = Message;
