require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // DeepSeek API
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  },

  // JWT (简化的本地认证)
  jwt: {
    secret: process.env.JWT_SECRET || 'xiaorou-local-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  },

  // 文件上传
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  },
};
