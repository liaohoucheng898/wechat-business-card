/**
 * 环境配置
 * 集中管理云环境、地图 key、TinyMCE key 等前端常量。
 */
export const CLOUD_ENV_ID = import.meta.env.VITE_CLOUD_ENV_ID || 'your-cloud-env-id'
export const CLOUD_HTTP_BASE_URL = import.meta.env.VITE_CLOUD_HTTP_BASE_URL || 'https://cloud1-d1gvh2zc3c5919349-1422926641.ap-shanghai.app.tcloudbase.com'
export const TENCENT_MAP_KEY = import.meta.env.VITE_TENCENT_MAP_KEY || 'your-tencent-map-key'
export const TINYMCE_API_KEY = import.meta.env.VITE_TINYMCE_API_KEY || 'jlufydrbphk7pkbamchv3uo178yclvnih4fhs00ri66cilk3'
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || '电子名片管理后台'

// 公司 ID 常量，需与数据库保持一致。
export const COMPANY_IDS = {
  HUAYUE: 'company_001',
  HUABAO: 'company_002',
  ZHUOCHEN: 'company_003'
}

export const COMPANY_MAP = {
  company_001: '华悦',
  company_002: '华宝',
  company_003: '卓辰'
}
