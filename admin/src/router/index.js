import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import cloudApp from '@/cloud/init'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: () => import('@/views/change-password/index.vue'),
    meta: { title: '修改密码' }
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '运营驾驶舱' }
      },
      {
        path: 'staff',
        name: 'Staff',
        component: () => import('@/views/staff/index.vue'),
        meta: { title: '人员管理' }
      },
      {
        path: 'company',
        name: 'CompanyList',
        component: () => import('@/views/company/list.vue'),
        meta: { title: '公司管理' }
      },
      {
        path: 'company/edit/:companyId',
        name: 'CompanyEdit',
        component: () => import('@/views/company/edit.vue'),
        meta: { title: '编辑公司' }
      },
      {
        path: 'cases',
        name: 'CaseList',
        component: () => import('@/views/cases/list.vue'),
        meta: { title: '内容中心' }
      },
      {
        path: 'cases/edit/:caseId?',
        name: 'CaseEdit',
        component: () => import('@/views/cases/edit.vue'),
        meta: { title: '编辑案例' }
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/views/stats/index.vue'),
        meta: { title: '数据分析' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：无 token 且非登录页 → 跳转登录页
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 电子名片管理后台` : '电子名片管理后台'

  const userStore = useUserStore()

  if (to.path !== '/login') {
    // 检查 SDK 实际登录状态，防止刷新后凭证丢失
    if (userStore.isLoggedIn) {
      try {
        const auth = cloudApp.auth()
        const loginState = await auth.getLoginState()
        if (!loginState || loginState.loginType === 'ANONYMOUS') {
          // SDK 凭证已丢失，清除本地状态，强制重新登录
          await userStore.logout()
          next('/login')
          return
        }
      } catch (e) {
        await userStore.logout()
        next('/login')
        return
      }
    }
    if (!userStore.isLoggedIn) {
      next('/login')
      return
    }

    if (userStore.mustChangePassword && to.path !== '/change-password') {
      next('/change-password')
      return
    }
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next(userStore.mustChangePassword ? '/change-password' : '/')
    return
  }
  next()
})

export default router
