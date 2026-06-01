const Memory = require('../models/memory');
const User = require('../models/user');

const LOCAL_USER_OPENID = 'local-user';
let localUserId = null;

function getLocalUserId() {
  if (!localUserId) {
    const user = User.upsert(LOCAL_USER_OPENID);
    localUserId = user.id;
  }
  return localUserId;
}

function getMemories(req, res) {
  const memories = Memory.findByUserId(getLocalUserId());
  const categories = {
    basic_info: { label: '基本信息', icon: '🏷️', items: [] },
    preference: { label: '偏好', icon: '❤️', items: [] },
    relationship: { label: '人际关系', icon: '👥', items: [] },
    event: { label: '重要事件', icon: '📅', items: [] },
    fact: { label: '事实', icon: '📋', items: [] },
    emotional: { label: '情绪特点', icon: '💭', items: [] },
    other: { label: '其他', icon: '💬', items: [] },
  };
  for (const m of memories) {
    const cat = categories[m.category] || categories.other;
    cat.items.push(m);
  }
  const result = Object.values(categories).filter(c => c.items.length > 0);
  res.json({ memories: result });
}

function deleteMemory(req, res) {
  const { id } = req.params;
  const memory = Memory.findById(id);
  if (!memory || memory.user_id !== getLocalUserId()) {
    return res.status(404).json({ error: '记忆不存在' });
  }
  Memory.delete(id);
  res.json({ success: true });
}

function clearAllMemories(req, res) {
  Memory.deleteAllByUserId(getLocalUserId());
  res.json({ success: true, message: '所有记忆已清除' });
}

module.exports = { getMemories, deleteMemory, clearAllMemories };
