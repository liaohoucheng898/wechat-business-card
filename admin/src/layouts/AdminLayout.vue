<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '64px' : '232px'" class="admin-sidebar">
      <div class="sidebar-logo" @click="router.push('/dashboard')">
        <img src="https://static-s3.skyworkcdn.com/fe/skywork-site-assets/images/skybot/avatar1-new.png" alt="Logo" class="logo-img" />
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
          <el-button text @click="helpVisible = true">
            <el-icon><QuestionFilled /></el-icon>
            帮助
          </el-button>
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

    <el-dialog v-model="helpVisible" title="帮助与数据口径" width="520px">
      <div class="help-dialog">
        本后台以运营驾驶舱为首页，关键指标显示来源、口径、更新时间和权限范围。高风险操作会在确认前说明对象、范围、后果和是否可撤回。
      </div>
      <template #footer>
        <el-button type="primary" @click="helpVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  DataLine, User, OfficeBuilding, Suitcase, DataAnalysis,
  Fold, Expand, SwitchButton, QuestionFilled
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const helpVisible = ref(false)

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

.help-dialog {
  color: $text-secondary;
  font-size: 14px;
  line-height: 24px;
}
</style>
