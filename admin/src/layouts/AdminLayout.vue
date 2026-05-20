<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '64px' : '200px'" class="admin-sidebar">
      <div class="sidebar-logo" @click="router.push('/')">
        <img src="https://static-s3.skyworkcdn.com/fe/skywork-site-assets/images/skybot/avatar1-new.png" alt="Logo" class="logo-img" />
        <span v-show="!sidebarCollapsed" class="logo-text">电子名片</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        router
        class="sidebar-menu"
        background-color="#fff"
        text-color="#646A73"
        active-text-color="#1677ff"
      >
        <el-menu-item index="/staff">
          <el-icon><User /></el-icon>
          <template #title>员工管理</template>
        </el-menu-item>
        <el-menu-item index="/company">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>公司管理</template>
        </el-menu-item>
        <el-menu-item index="/cases">
          <el-icon><Suitcase /></el-icon>
          <template #title>案例管理</template>
        </el-menu-item>
        <el-menu-item index="/stats">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据统计</template>
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
          <span class="header-title">电子名片管理后台</span>
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
  User, OfficeBuilding, Suitcase, DataAnalysis,
  Fold, Expand, SwitchButton
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

// 当前激活菜单：取路由的第一层路径
const activeMenu = computed(() => {
  const path = route.path
  // 匹配 /company/edit/xxx → /company
  const match = path.match(/^\/[^/]+/)
  return match ? match[0] : '/staff'
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确认退出登录？', '提示', {
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
  background: $card-bg;
  border-right: 1px solid $border-color;
  transition: width 0.3s ease;
  overflow: hidden;

  .sidebar-logo {
    height: $header-height;
    display: flex;
    align-items: center;
    padding: 0 16px;
    cursor: pointer;
    border-bottom: 1px solid $border-color;

    .logo-img {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .logo-text {
      margin-left: 10px;
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      white-space: nowrap;
    }
  }

  .sidebar-menu {
    height: calc(100vh - #{$header-height});
    overflow-y: auto;

    .el-menu-item {
      height: 48px;
      line-height: 48px;
      font-size: 15px;

      &.is-active {
        background-color: rgba($color-primary, 0.06);
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
