/**
 * 统一错误码定义
 * 编号规则：E + 模块编号(2位) + 序号(2位)
 */

// 01 - 通用
const E0101 = { code: 'E0101', msg: '参数缺失或格式错误' }
const E0102 = { code: 'E0102', msg: '服务器内部错误' }
const E0103 = { code: 'E0103', msg: '请求频率过高' }
const E0104 = { code: 'E0104', msg: '数据已被其他人修改，请刷新后重试' }

// 02 - 认证
const E0201 = { code: 'E0201', msg: '验证码已过期，请重新获取' }
const E0202 = { code: 'E0202', msg: '验证码错误' }
const E0203 = { code: 'E0203', msg: '发送太频繁，请60秒后重试' }
const E0204 = { code: 'E0204', msg: '今日发送次数已达上限' }
const E0205 = { code: 'E0205', msg: '操作太频繁，请稍后再试' }
const E0206 = { code: 'E0206', msg: '错误次数过多，请15分钟后重试' }
const E0207 = { code: 'E0207', msg: '登录已过期，请重新登录' }
const E0208 = { code: 'E0208', msg: '无管理员权限' }
const E0209 = { code: 'E0209', msg: '该手机号未开通，请联系管理员' }
const E0210 = { code: 'E0210', msg: '该手机号已被其他微信绑定' }
const E0211 = { code: 'E0211', msg: '账号已停用，请联系管理员' }
const E0212 = { code: 'E0212', msg: '无管理权限，请联系管理员' }

// 03 - 员工
const E0301 = { code: 'E0301', msg: '该手机号已被使用' }
const E0302 = { code: 'E0302', msg: '员工不存在' }
const E0303 = { code: 'E0303', msg: '至少开通一家公司' }
const E0304 = { code: 'E0304', msg: '不能停用自己' }
const E0305 = { code: 'E0305', msg: '至少保留一个管理员' }

// 04 - 公司
const E0401 = { code: 'E0401', msg: '公司不存在' }

// 05 - 案例
const E0501 = { code: 'E0501', msg: '案例不存在' }
const E0502 = { code: 'E0502', msg: '案例已删除' }

// 06 - 栏目 / 统计
const E0601_CATEGORY = { code: 'E0601', msg: '栏目名称重复' }
const E0602 = { code: 'E0602', msg: '栏目不存在' }
const E0603 = { code: 'E0603', msg: '时间范围无效' }

// 07 - 文件
const E0701 = { code: 'E0701', msg: '文件格式不支持' }
const E0702 = { code: 'E0702', msg: '文件大小超限' }
const E0703 = { code: 'E0703', msg: '图片压缩失败' }

module.exports = {
  E0101, E0102, E0103, E0104,
  E0201, E0202, E0203, E0204, E0205, E0206,
  E0207, E0208, E0209, E0210, E0211, E0212,
  E0301, E0302, E0303, E0304, E0305,
  E0401,
  E0501, E0502,
  E0601_CATEGORY, E0602, E0603,
  E0701, E0702, E0703,
}
