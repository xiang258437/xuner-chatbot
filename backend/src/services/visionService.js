/**
 * 视觉理解服务
 * 目前使用降级描述（DeepSeek不支持图片输入）
 * 将来可接入多模态模型（如GPT-4V, Qwen-VL等）
 */

async function describeImage(_imagePath) {
  // 降级：返回基本描述
  // 后续可接入视觉API
  return '[用户分享了一张图片]';
}

module.exports = { describeImage };
