/**
 * 统一响应格式
 * 成功：{ code: 0, data: {...}, msg: 'ok' }
 * 失败：{ code: 'E0201', data: null, msg: '...' }
 */

/**
 * 成功响应
 * @param {*} data 返回数据
 * @param {string} msg 提示信息
 */
function success(data = null, msg = 'ok') {
  return { code: 0, data, msg }
}

/**
 * 失败响应
 * @param {object} errorDef 错误码定义对象 { code, msg }
 * @param {string} [customMsg] 自定义消息（覆盖默认msg）
 */
function fail(errorDef, customMsg) {
  return {
    code: errorDef.code,
    data: null,
    msg: customMsg || errorDef.msg,
  }
}

module.exports = { success, fail }
