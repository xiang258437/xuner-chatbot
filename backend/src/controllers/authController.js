const jwt = require('jsonwebtoken');
const config = require('../config');
const { code2Session } = require('../services/wechatService');
const User = require('../models/user');

/**
 * POST /api/auth/login
 * wx.login 登录
 */
async function login(req, res) {
  try {
    const { code, nickname, avatarUrl } = req.body;

    if (!code) {
      return res.status(400).json({ error: '缺少登录凭证' });
    }

    // 用code换取openid
    const { openid, unionid } = await code2Session(code);

    // 创建或更新用户
    const user = User.upsert(openid, { nickname, avatarUrl, unionid });

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('[Auth] 登录失败:', error.message);
    res.status(500).json({ error: error.message || '登录失败' });
  }
}

/**
 * GET /api/auth/profile
 * 获取用户资料
 */
function getProfile(req, res) {
  const user = User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ user });
}

/**
 * PUT /api/auth/profile
 * 更新用户资料
 */
function updateProfile(req, res) {
  const { nickname, avatar_url } = req.body;
  const user = User.updateProfile(req.userId, { nickname, avatar_url });
  res.json({ user });
}

module.exports = { login, getProfile, updateProfile };
