function success(data = null, msg = 'ok') {
  return { code: 0, data, msg }
}

function fail(errorDef, customMsg) {
  return {
    code: errorDef.code,
    data: null,
    msg: customMsg || errorDef.msg,
  }
}

module.exports = { success, fail }
