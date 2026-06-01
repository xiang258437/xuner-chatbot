const rateLimit = require('express-rate-limit');

/**
 * 聊天API限流：每分钟最多10次请求
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.userId || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: '消息发送太快了，请稍等一下再发哦~',
      code: 'RATE_LIMITED',
    });
  },
});

/**
 * 通用API限流：每分钟30次
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
});

module.exports = { chatLimiter, generalLimiter };
