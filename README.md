# 🌸 小柔 — AI 聊天机器人

温柔知性的AI女闺蜜，在浏览器里陪你聊天。基于 DeepSeek 模型驱动。

## ✨ 功能

- 💬 **智能聊天** — 基于 DeepSeek API，小柔有完整的人设和性格
- 🎤 **语音输入** — 浏览器原生语音识别（Chrome 最佳）
- 🖼️ **图片分享** — 发照片给小柔看
- 🧠 **长期记忆** — 自动记住你的喜好、重要信息
- 📱 **响应式设计** — 手机和电脑都能用

## 🚀 快速开始

### 1. 配置 API Key

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key:
# DEEPSEEK_API_KEY=sk-你的密钥
```

获取 DeepSeek API Key → https://platform.deepseek.com/api_keys

### 2. 安装 & 启动

```bash
cd backend
npm install
npm start
```

### 3. 打开浏览器

```
http://localhost:3000
```

就可以和小柔聊天了！

## 📁 项目结构

```
├── backend/
│   ├── public/
│   │   └── index.html          # Web 聊天界面
│   ├── src/
│   │   ├── index.js            # Express 入口
│   │   ├── config.js           # 配置
│   │   ├── routes/             # API 路由
│   │   ├── controllers/        # 控制器
│   │   ├── services/
│   │   │   ├── deepseekService.js  # AI 核心
│   │   │   ├── memoryService.js    # 记忆系统
│   │   │   └── visionService.js    # 图片理解
│   │   ├── models/             # SQLite 数据模型
│   │   └── prompts/
│   │       └── personality.js  # 小柔人设提示词
│   ├── .env                    # 环境变量
│   └── package.json
│
└── miniprogram/                # (已废弃) 微信小程序版本
```

## 🎭 小柔的设定

- **年龄**：20岁
- **性格**：温柔知性、活泼自然、真诚体贴
- **背景**：大二学生，主修文学和心理学，养了一只叫"奶糖"的布偶猫
- **爱好**：读书（村上春树）、弹吉他、泡咖啡馆

## 💰 成本

DeepSeek API：约 ¥50-200/月（取决于聊天量）

## 🔧 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 原生 HTML/CSS/JS（零框架） |
| 后端 | Node.js + Express |
| 数据库 | SQLite（via sql.js，纯 JS/WASM） |
| AI | DeepSeek API (deepseek-chat) |
| 语音 | Web Speech API（浏览器原生） |
