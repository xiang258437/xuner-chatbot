const axios = require('axios');
const config = require('../config');
const { buildPersonalityPrompt } = require('../prompts/personality');

/**
 * DeepSeek API 服务
 * 核心AI交互：构建提示词、调用API、解析响应
 */

const client = axios.create({
  baseURL: config.deepseek.baseUrl,
  headers: {
    'Authorization': `Bearer ${config.deepseek.apiKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * 生成AI回复
 * @param {Object} options
 * @param {Array} options.messages - 消息历史 [{role, content}]
 * @param {string} options.memoryContext - 记忆上下文文本
 * @param {string} options.importantDates - 重要日期文本
 * @param {string} options.userMessage - 当前用户消息
 * @returns {Promise<{reply: string, tokenUsage: Object}>}
 */
async function generateReply({ messages, memoryContext = '', importantDates = '', userMessage }) {
  const personalityPrompt = buildPersonalityPrompt(memoryContext, importantDates);

  // 构建对话历史文本
  const historyText = messages
    .map(m => {
      const label = m.role === 'user' ? '对方' : '小柔';
      let content = m.content;
      if (m.imageDescription) {
        content += ` [对方分享了一张图片：${m.imageDescription}]`;
      }
      return `${label}: ${content}`;
    })
    .join('\n');

  const systemPrompt = personalityPrompt.replace('{conversation_history}', historyText);

  // 构建API消息
  const apiMessages = [
    { role: 'system', content: systemPrompt },
  ];

  // 添加对话历史（最近的消息）
  const recentMessages = messages.slice(-20);
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      let content = msg.content;
      if (msg.imageDescription) {
        content = `[对方发来一张图片，内容：${msg.imageDescription}] ${content}`;
      }
      apiMessages.push({ role: 'user', content });
    } else if (msg.role === 'assistant') {
      apiMessages.push({ role: 'assistant', content: msg.content });
    }
  }

  try {
    const response = await client.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: apiMessages,
      temperature: 0.8,
      max_tokens: 1024,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const reply = response.data.choices[0].message.content;
    const tokenUsage = response.data.usage;

    return { reply, tokenUsage };
  } catch (error) {
    console.error('[DeepSeek] API调用失败:', error.message);
    if (error.response) {
      console.error('[DeepSeek] 响应状态:', error.response.status);
      console.error('[DeepSeek] 响应数据:', JSON.stringify(error.response.data));
    }
    throw new Error('AI回复生成失败，请稍后再试');
  }
}

/**
 * 提取记忆（简化版：用DeepSeek做信息提取）
 * @param {string} userMessage - 用户消息
 * @returns {Promise<Array>} 提取的记忆数组
 */
async function extractMemories(userMessage) {
  const { buildExtractionPrompt } = require('../prompts/memoryExtraction');
  const prompt = buildExtractionPrompt(userMessage);

  try {
    const response = await client.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个信息提取助手。你的任务是从用户消息中提取个人信息。只返回JSON数组，不要加任何其他文字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = response.data.choices[0].message.content.trim();
    // 尝试解析JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('[DeepSeek] 记忆提取失败:', error.message);
    return [];
  }
}

/**
 * 估算中文文本的token数（粗略：1个中文字 ≈ 1.5 tokens）
 */
function estimateTokens(text) {
  if (!text) return 0;
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.3);
}

module.exports = { generateReply, extractMemories, estimateTokens };
