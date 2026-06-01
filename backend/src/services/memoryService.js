const Memory = require('../models/memory');
const Message = require('../models/message');

/**
 * 记忆服务
 * 负责记忆的检索、注入、提取和合并
 */

// 触发记忆提取的关键词
const MEMORY_TRIGGER_KEYWORDS = [
  '我是', '我叫', '我今年', '我生日', '我喜欢', '我讨厌',
  '我的', '我家', '我养了', '我住在', '我在', '我做',
  '记得', '告诉过你', '上次说过', '之前说过',
  '生日', '考试', '毕业', '工作', '搬家', '旅行',
];

/**
 * 判断是否应该触发记忆提取
 */
function shouldExtract(userMessage, conversationId) {
  // 规则1：消息长度>50字
  if (userMessage.length > 50) return true;

  // 规则2：含触发关键词
  const lowerMsg = userMessage.toLowerCase();
  if (MEMORY_TRIGGER_KEYWORDS.some(kw => lowerMsg.includes(kw))) return true;

  // 规则3：该会话中用户消息数%5==0
  const msgCount = Message.countByConversationId(conversationId);
  if (msgCount > 0 && msgCount % 5 === 0) return true;

  return false;
}

/**
 * 检索相关记忆（用于注入AI上下文）
 * @returns {Promise<{memoryText: string, memoryIds: number[]}>}
 */
async function retrieveMemories(userId, userMessage) {
  // 1. 提取关键词（简单分词）
  const keywords = extractKeywords(userMessage);

  // 2. 关键词搜索记忆
  let relevantMemories = await Memory.searchByKeywords(userId, keywords, 8);

  // 3. 获取高重要性记忆（确保核心信息不丢失）
  const highImportance = await Memory.getHighImportance(userId, 7);

  // 4. 合并去重
  const seenIds = new Set();
  const allMemories = [];

  // 先加入高重要性记忆
  for (const m of highImportance) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      allMemories.push(m);
    }
  }

  // 再加入关键词匹配的记忆
  for (const m of relevantMemories) {
    if (!seenIds.has(m.id) && allMemories.length < 10) {
      seenIds.add(m.id);
      allMemories.push(m);
    }
  }

  // 5. 格式化记忆文本
  const categoryLabels = {
    basic_info: '基本信息',
    preference: '偏好',
    relationship: '人际关系',
    event: '重要事件',
    fact: '事实',
    emotional: '情绪特点',
  };

  const memoryText = allMemories.map(m =>
    `- [${categoryLabels[m.category] || m.category}] ${m.fact_key}: ${m.fact_value}`
  ).join('\n');

  // 6. 记录访问
  const memoryIds = allMemories.map(m => m.id);
  await Memory.recordAccessBatch(memoryIds);

  return { memoryText, memoryIds };
}

/**
 * 检索重要日期
 */
async function retrieveImportantDates(userId) {
  const dates = await Memory.getUpcomingDates(userId, 14);
  if (dates.length === 0) return '';

  return dates.map(d => {
    const typeLabel = { birthday: '🎂生日', anniversary: '💝纪念日', exam: '📝考试', travel: '✈️旅行', other: '📅事件' };
    return `- ${typeLabel[d.date_type] || '📅'}: ${d.event_name} (${d.event_date})`;
  }).join('\n');
}

/**
 * 简单的关键词提取（分词）
 */
function extractKeywords(text) {
  // 移除标点和emoji
  const cleaned = text.replace(/[，。！？、；：""''（）【】\s,.!?;:'"()\[\]{}]+/g, ' ')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();

  if (!cleaned) return [];

  // 简单2-gram分词
  const chars = cleaned.split('');
  const keywords = [];

  // 提取2字词和3字词
  for (let i = 0; i < chars.length - 1; i++) {
    keywords.push(chars[i] + chars[i + 1]);
    if (i < chars.length - 2) {
      keywords.push(chars[i] + chars[i + 1] + chars[i + 2]);
    }
  }

  // 去重并限制数量
  return [...new Set(keywords)].slice(0, 20);
}

module.exports = {
  shouldExtract,
  retrieveMemories,
  retrieveImportantDates,
  extractKeywords,
};
