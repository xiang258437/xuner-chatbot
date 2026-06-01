const axios = require('axios');
const config = require('../config');

/**
 * 微信API服务
 */

/**
 * wx.login code换session
 */
async function code2Session(code) {
  try {
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: config.wechat.appId,
        secret: config.wechat.secret,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });

    const { openid, session_key, unionid, errcode, errmsg } = response.data;

    if (errcode) {
      console.error('[Wechat] code2Session失败:', errmsg);
      throw new Error(`微信登录失败: ${errmsg}`);
    }

    return { openid, sessionKey: session_key, unionid: unionid || null };
  } catch (error) {
    console.error('[Wechat] code2Session异常:', error.message);
    throw new Error('微信登录服务异常');
  }
}

module.exports = { code2Session };
