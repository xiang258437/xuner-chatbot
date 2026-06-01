/**
 * 记忆提取提示词
 * 从用户消息中抽取值得长期记住的个人信息
 */

function buildExtractionPrompt(userMessage) {
  return `分析以下用户消息，提取关于用户的个人信息。如果没有值得长期记住的信息，返回空数组。

用户消息："${userMessage}"

请提取以下类别中可能存在的个人信息：
- basic_info: 姓名、年龄、生日、职业、学校、所在地
- preference: 喜欢/讨厌的食物、颜色、音乐、电影、书籍、活动、爱好
- relationship: 家人、朋友、宠物（名字、关系、特点）
- event: 近期计划、已经发生的重要事件、考试日期、旅行
- fact: 用户提到的任何可验证的事实
- emotional: 重要的情绪状态、心理特征、性格特点

对每一项信息，给出：
- category: 类别（上述之一）
- key: 简短标识（如"喜欢的食物"、"宠物的名字"）
- value: 完整信息（如"火锅，尤其是四川麻辣锅底"）
- importance: 1-10的重要程度（10=用户的名字、生日等核心信息；5=有趣的偏好；1=随口提到的不重要信息）
- confidence: 0-1的置信度（1=用户明确说出；<0.7=需要推断的信息）

返回JSON数组格式，严格按以下结构：
[{"category": "...", "key": "...", "value": "...", "importance": N, "confidence": N}]

如果没有任何值得记录的信息，返回空数组 []。
只返回JSON数组，不要加任何其他文字。`;
}

module.exports = { buildExtractionPrompt };
