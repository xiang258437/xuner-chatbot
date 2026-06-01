const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Memory = require('../models/memory');
const { generateReply, extractMemories, estimateTokens } = require('../services/deepseekService');
const { shouldExtract, retrieveMemories, retrieveImportantDates } = require('../services/memoryService');
const User = require('../models/user');

// 本地模式：使用固定用户
const LOCAL_USER_OPENID = 'local-user';
let localUserId = null;

function getLocalUserId() {
  if (!localUserId) {
    const user = User.upsert(LOCAL_USER_OPENID, { nickname: '我' });
    localUserId = user.id;
  }
  return localUserId;
}

/**
 * POST /api/chat/send
 * 发送消息，返回AI回复
 */
async function sendMessage(req, res) {
  try {
    const { conversation_id, message, image_url, image_description } = req.body;
    const userId = getLocalUserId();

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 1. 获取或创建会话
    let conversation;
    if (conversation_id) {
      conversation = Conversation.findById(conversation_id);
      if (!conversation || conversation.user_id !== userId) {
        return res.status(404).json({ error: '会话不存在' });
      }
    } else {
      const title = message.trim().slice(0, 20) + (message.trim().length > 20 ? '...' : '');
      conversation = Conversation.create(userId, title);
    }

    // 2. 检索相关记忆
    const { memoryText, memoryIds } = await retrieveMemories(userId, message);
    const importantDatesContext = await retrieveImportantDates(userId);

    // 3. 保存用户消息
    const userMessage = Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: message.trim(),
      imageUrl: image_url || null,
      imageDescription: image_description || null,
      tokenCount: estimateTokens(message),
    });

    // 4. 获取对话历史
    const recentMessages = Message.getRecentMessages(conversation.id, 30);

    // 5. 调用AI生成回复
    const { reply, tokenUsage } = await generateReply({
      messages: recentMessages,
      memoryContext: memoryText,
      importantDates: importantDatesContext,
      userMessage: message.trim(),
    });

    // 6. 保存AI回复
    const assistantMessage = Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: reply,
      tokenCount: tokenUsage?.completion_tokens || estimateTokens(reply),
    });

    // 7. 更新会话
    Conversation.touch(conversation.id);

    // 8. 自动标题
    const msgCount = Message.countByConversationId(conversation.id);
    if (msgCount <= 2) {
      const title = message.trim().slice(0, 15) + (message.trim().length > 15 ? '...' : '');
      Conversation.updateTitle(conversation.id, title);
    }

    // 9. 异步提取记忆
    if (shouldExtract(message, conversation.id)) {
      setImmediate(async () => {
        try {
          const facts = await extractMemories(message);
          if (facts && facts.length > 0) {
            for (const fact of facts) {
              if (fact.confidence >= 0.7) {
                await Memory.upsert({
                  userId,
                  category: fact.category,
                  factKey: fact.key,
                  factValue: fact.value,
                  importance: fact.importance,
                  confidence: fact.confidence,
                  sourceMessageId: userMessage.id,
                });
              }
            }
            console.log(`[Memory] 提取了${facts.length}条记忆`);
          }
        } catch (err) {
          console.error('[Memory] 异步提取失败:', err.message);
        }
      });
    }

    // 10. 返回
    res.json({
      conversation_id: conversation.id,
      message_id: assistantMessage.id,
      reply,
      token_usage: tokenUsage ? {
        prompt: tokenUsage.prompt_tokens,
        completion: tokenUsage.completion_tokens,
        total: tokenUsage.total_tokens,
      } : null,
    });
  } catch (error) {
    console.error('[Chat] 发送失败:', error.message);
    res.status(500).json({ error: error.message || '消息发送失败，请稍后再试' });
  }
}

function getConversations(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  const conversations = Conversation.findByUserId(getLocalUserId(), parseInt(limit), parseInt(offset));
  res.json({ conversations });
}

function getConversationMessages(req, res) {
  const { id } = req.params;
  const { limit = 50, before } = req.query;
  const conversation = Conversation.findById(id);
  if (!conversation || conversation.user_id !== getLocalUserId()) {
    return res.status(404).json({ error: '会话不存在' });
  }
  const messages = Message.findByConversationId(id, parseInt(limit), before ? parseInt(before) : null);
  const hasMore = messages.length >= parseInt(limit);
  res.json({ messages, hasMore, conversation });
}

function updateConversation(req, res) {
  const { id } = req.params;
  const { title } = req.body;
  const conversation = Conversation.findById(id);
  if (!conversation || conversation.user_id !== getLocalUserId()) {
    return res.status(404).json({ error: '会话不存在' });
  }
  Conversation.updateTitle(id, title);
  res.json({ success: true });
}

function deleteConversation(req, res) {
  const { id } = req.params;
  const conversation = Conversation.findById(id);
  if (!conversation || conversation.user_id !== getLocalUserId()) {
    return res.status(404).json({ error: '会话不存在' });
  }
  Conversation.delete(id);
  res.json({ success: true });
}

module.exports = {
  sendMessage,
  getConversations,
  getConversationMessages,
  updateConversation,
  deleteConversation,
};
