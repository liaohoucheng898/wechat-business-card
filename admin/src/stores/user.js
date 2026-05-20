import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signOut } from '@/cloud/init'

export const useUserStore = defineStore('user', () => {
  // state — 不再存 pcSessionToken，登录态由 CloudBase SDK 持有
  const adminInfo = ref(JSON.parse(localStorage.getItem('adminInfo') || 'null'))

  // getters
  const isLoggedIn = computed(() => !!adminInfo.value)
  const adminName = computed(() => adminInfo.value?.name || '管理员')
  const mustChangePassword = computed(() => !!adminInfo.value?.mustChangePassword)

  /**
   * 登录成功后保存管理员信息
   * CloudBase Custom Login 后 SDK 已持有登录态，无需本地存 token
   */
  function setLoginData(staffInfo) {
    adminInfo.value = staffInfo
    localStorage.setItem('adminInfo', JSON.stringify(staffInfo))
  }

  function updateAdminInfo(fields = {}) {
    if (!adminInfo.value) return
    adminInfo.value = { ...adminInfo.value, ...fields }
    localStorage.setItem('adminInfo', JSON.stringify(adminInfo.value))
  }

  /**
   * 退出登录
   */
  async function logout() {
    await signOut()
    adminInfo.value = null
    localStorage.removeItem('adminInfo')
  }

  return {
    adminInfo,
    isLoggedIn,
    adminName,
    mustChangePassword,
    setLoginData,
    updateAdminInfo,
    logout
  }
})
