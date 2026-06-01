const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./models/database');

// 路由
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const memoryRoutes = require('./routes/memory');

const app = express();

// ── 初始化数据库 ──
initDatabase();

// ── 中间件 ──
app.use(helmet({
  contentSecurityPolicy: false, // 允许内联脚本
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── 静态文件 ──
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── API 路由 ──
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoryRoutes);

// ── 健康检查 ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SPA fallback ──
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── 全局错误处理 ──
app.use((err, _req, res, _next) => {
  console.error('[Server] 未捕获错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// ── 启动服务器 ──
app.listen(config.port, () => {
  console.log('');
  console.log('  🌸━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🌸');
  console.log('        小柔 AI 聊天机器人已启动');
  console.log(`        打开浏览器访问: http://localhost:${config.port}`);
  console.log('  🌸━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🌸');
  console.log('');
  if (!config.deepseek.apiKey || config.deepseek.apiKey.startsWith('sk-xxx')) {
    console.warn('  ⚠️  未配置 DeepSeek API Key，请在 .env 中设置 DEEPSEEK_API_KEY');
    console.log('');
  }
});

module.exports = app;
