const { Router } = require('express');
const { generateReply, extractMemories } = require('../services/deepseekService');
const { retrieveMemories, retrieveImportantDates } = require('../services/memoryService');
const Memory = require('../models/memory');
const User = require('../models/user');

const router = Router();

const LOCAL_UID = 'local-user';
let _uid = null;
function getUid() {
  if (!_uid) { const u = User.upsert(LOCAL_UID); _uid = u.id; }
  return _uid;
}

/**
 * POST /v1/chat/completions — OpenAI 兼容接口
 * 供 cc-connect codex agent 调用
 */
router.post('/chat/completions', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const uid = getUid();

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) {
      return res.status(400).json({ error: '没有找到用户消息' });
    }

    const userMsg = lastUser.content;

    const { memoryText } = await retrieveMemories(uid, userMsg);
    const importantDates = await retrieveImportantDates(uid);

    const { reply } = await generateReply({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      memoryContext: memoryText,
      importantDates,
      userMessage: userMsg,
    });

    // 异步提取记忆（shouldExtract 需要 conversation_id，传 0 走关键词判断）
    const { shouldExtract } = require('../services/memoryService');
    if (shouldExtract(userMsg, 0)) {
      setImmediate(async () => {
        try {
          const facts = await extractMemories(userMsg);
          if (facts && facts.length > 0) {
            for (const f of facts) {
              if (f.confidence >= 0.7) {
                await Memory.upsert({
                  userId: uid, category: f.category,
                  factKey: f.key, factValue: f.value,
                  importance: f.importance, confidence: f.confidence,
                  sourceMessageId: null,
                });
              }
            }
          }
        } catch (_) {}
      });
    }

    res.json({
      id: 'chatcmpl-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'xuner',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: reply },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  } catch (err) {
    console.error('[OpenAI] 请求失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
