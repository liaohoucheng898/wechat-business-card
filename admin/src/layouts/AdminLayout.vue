<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '64px' : '232px'" class="admin-sidebar">
      <div class="sidebar-logo" @click="router.push('/dashboard')">
        <span class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false">
            <defs>
              <linearGradient id="logoGradient" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#4C9AFF" />
                <stop offset="1" stop-color="#1677FF" />
              </linearGradient>
            </defs>
            <rect x="2.5" y="3.5" width="27" height="25" rx="7" fill="url(#logoGradient)" />
            <rect x="7" y="9" width="18" height="14" rx="3" fill="#FFFFFF" opacity="0.96" />
            <circle cx="12" cy="16" r="3" fill="#1677FF" opacity="0.9" />
            <path d="M17 13.5H23M17 17H23M10 21C10.8 19.8 13.2 19.8 14 21" stroke="#1677FF" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <span v-show="!sidebarCollapsed" class="logo-text">电子名片</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        router
        class="sidebar-menu"
        background-color="#0F172A"
        text-color="#D1D5DB"
        active-text-color="#FFFFFF"
      >
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧 -->
    <el-container class="admin-right">
      <!-- 顶栏 -->
      <el-header class="admin-header" height="56px">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="appStore.toggleSidebar">
            <Fold v-if="!sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
          <span class="header-title">{{ route.meta.title || '运营驾驶舱' }}</span>
        </div>
        <div class="header-right">
          <span class="admin-name">{{ userStore.adminName }}</span>
          <el-divider direction="vertical" />
          <el-button text type="primary" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出
          </el-button>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  DataLine, User, OfficeBuilding, Suitcase, DataAnalysis,
  Fold, Expand, SwitchButton
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const menuItems = [
  { index: '/dashboard', label: '运营驾驶舱', icon: DataLine },
  { index: '/cases', label: '内容中心', icon: Suitcase },
  { index: '/staff', label: '人员管理', icon: User },
  { index: '/company', label: '公司管理', icon: OfficeBuilding },
  { index: '/stats', label: '数据分析', icon: DataAnalysis }
]

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

// 当前激活菜单：取路由的第一层路径
const activeMenu = computed(() => {
  const path = route.path
  // 匹配 /company/edit/xxx → /company
  const match = path.match(/^\/[^/]+/)
  return match ? match[0] : '/dashboard'
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('退出后需要重新输入管理员账号和密码。未保存的编辑内容不会自动提交。', '确认退出登录', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    router.push('/login')
    ElMessage.success('已退出登录')
  } catch {
    // 取消
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.admin-sidebar {
  background: $sidebar-bg;
  border-right: 1px solid $sidebar-border;
  transition: width 0.3s ease;
  overflow: hidden;

  .sidebar-logo {
    height: $header-height;
    display: flex;
    align-items: center;
    padding: 0 16px;
    cursor: pointer;
    border-bottom: 1px solid $sidebar-border;

    .logo-mark {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
      flex-shrink: 0;

      svg {
        width: 32px;
        height: 32px;
        display: block;
      }
    }

    .logo-text {
      margin-left: 10px;
      font-size: 16px;
      font-weight: 600;
      color: $sidebar-text-active;
      white-space: nowrap;
    }
  }

  .sidebar-menu {
    height: calc(100vh - #{$header-height});
    overflow-y: auto;
    border-right: 0;
    background: $sidebar-bg;

    .el-menu-item {
      height: 48px;
      line-height: 48px;
      font-size: 15px;
      color: $sidebar-text;

      &:hover {
        background-color: $sidebar-hover-bg;
      }

      &.is-active {
        background-color: $sidebar-active-bg;
        font-weight: 500;
      }
    }
  }
}

.admin-right {
  flex-direction: column;
  overflow: hidden;
}

.admin-header {
  background: $card-bg;
  border-bottom: 1px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .collapse-btn {
      font-size: 20px;
      color: $text-secondary;
      cursor: pointer;

      &:hover {
        color: $color-primary;
      }
    }

    .header-title {
      font-size: 15px;
      font-weight: 500;
      color: $text-primary;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;

    .admin-name {
      font-size: 15px;
      color: $text-secondary;
    }
  }
}

.admin-main {
  background: $page-bg;
  overflow-y: auto;
  padding: $spacing-lg;
}

</style>
