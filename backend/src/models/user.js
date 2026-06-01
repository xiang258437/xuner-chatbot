const { db } = require('./database');

const User = {
  /** 根据openid查找用户 */
  findByOpenId(openid) {
    return db().get('SELECT * FROM users WHERE openid = ?', openid);
  },

  /** 根据ID查找 */
  findById(id) {
    return db().get('SELECT id, openid, nickname, avatar_url, persona_context, created_at, updated_at FROM users WHERE id = ?', id);
  },

  /** 创建或更新用户 */
  upsert(openid, data = {}) {
    const existing = this.findByOpenId(openid);
    if (existing) {
      const updates = [];
      const params = [];
      if (data.nickname) { updates.push('nickname = ?'); params.push(data.nickname); }
      if (data.avatarUrl) { updates.push('avatar_url = ?'); params.push(data.avatarUrl); }
      if (data.unionid) { updates.push('unionid = ?'); params.push(data.unionid); }
      updates.push("updated_at = datetime('now','localtime')");
      params.push(openid);

      db().run(`UPDATE users SET ${updates.join(', ')} WHERE openid = ?`, ...params);
      return this.findByOpenId(openid);
    } else {
      db().run(
        'INSERT INTO users (openid, unionid, nickname, avatar_url) VALUES (?, ?, ?, ?)',
        openid, data.unionid || null, data.nickname || '微信用户', data.avatarUrl || ''
      );
      return this.findByOpenId(openid);
    }
  },

  /** 更新用户资料 */
  updateProfile(id, data) {
    const updates = [];
    const params = [];
    if (data.nickname !== undefined) { updates.push('nickname = ?'); params.push(data.nickname); }
    if (data.avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(data.avatar_url); }
    if (updates.length === 0) return this.findById(id);

    updates.push("updated_at = datetime('now','localtime')");
    params.push(id);
    db().run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...params);
    return this.findById(id);
  },

  /** 更新AI对用户的了解总结 */
  updatePersonaContext(id, context) {
    db().run("UPDATE users SET persona_context = ?, updated_at = datetime('now','localtime') WHERE id = ?", context, id);
  },
};

module.exports = User;
