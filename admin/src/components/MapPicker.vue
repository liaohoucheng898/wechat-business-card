<template>
  <el-dialog
    :model-value="visible"
    title="选择位置"
    width="800px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="onOpen"
  >
    <div class="map-picker">
      <!-- 搜索框 -->
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索地点"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
        <!-- 搜索建议列表 -->
        <div v-if="suggestions.length > 0" class="suggestions-list">
          <div
            v-for="(item, idx) in suggestions"
            :key="idx"
            class="suggestion-item"
            @click="selectSuggestion(item)"
          >
            <div class="suggestion-title">{{ item.title }}</div>
            <div class="suggestion-address">{{ item.address }}</div>
          </div>
        </div>
      </div>

      <!-- 地图容器 -->
      <div ref="mapContainer" class="map-container" />

      <!-- 选中位置信息 -->
      <div class="location-info">
        <div class="info-row">
          <span class="info-label">位置：</span>
          <span class="info-value">{{ selected.name || '点击地图或搜索选择位置' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">地址：</span>
          <span class="info-value">{{ selected.address || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">经纬度：</span>
          <span class="info-value">
            {{ selected.lat ? `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}` : '-' }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :disabled="!selected.lat" @click="handleConfirm">
        确认选点
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onBeforeUnmount, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { TENCENT_MAP_KEY } from '@/config/env'

const props = defineProps({
  visible: { type: Boolean, default: false },
  value: {
    type: Object,
    default: () => ({ lat: null, lng: null, name: '', address: '' })
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const mapContainer = ref(null)
const keyword = ref('')
const suggestions = ref([])

const selected = reactive({
  lat: null,
  lng: null,
  name: '',
  address: ''
})

let mapInstance = null
let markerInstance = null
let geocoderInstance = null
let searchService = null
let mapScriptLoaded = false

/**
 * 加载腾讯地图 JS SDK
 */
function loadMapScript() {
  return new Promise((resolve) => {
    if (window.TMap) {
      resolve()
      return
    }
    if (mapScriptLoaded) {
      // 正在加载中，等待
      const timer = setInterval(() => {
        if (window.TMap) {
          clearInterval(timer)
          resolve()
        }
      }, 100)
      return
    }
    mapScriptLoaded = true
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}&libraries=service`
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

async function onOpen() {
  // 初始化选中数据
  if (props.value?.lat) {
    selected.lat = props.value.lat
    selected.lng = props.value.lng
    selected.name = props.value.name || ''
    selected.address = props.value.address || ''
  } else {
    selected.lat = null
    selected.lng = null
    selected.name = ''
    selected.address = ''
  }
  keyword.value = ''
  suggestions.value = []

  await loadMapScript()
  await nextTick()
  initMap()
}

function initMap() {
  const TMap = window.TMap

  // 默认中心：海口 / 已有选点
  const center = selected.lat
    ? new TMap.LatLng(selected.lat, selected.lng)
    : new TMap.LatLng(20.0174, 110.3492)

  mapInstance = new TMap.Map(mapContainer.value, {
    center,
    zoom: 14,
    mapStyleId: 'style1'
  })

  // 初始化 Geocoder
  geocoderInstance = new TMap.service.Geocoder()

  // 初始化搜索服务
  searchService = new TMap.service.Search({ pageSize: 10 })

  // 放置初始标记
  if (selected.lat) {
    setMarker(new TMap.LatLng(selected.lat, selected.lng))
  }

  // 点击地图选点
  mapInstance.on('click', (e) => {
    const latLng = e.latLng
    setMarker(latLng)
    reverseGeocode(latLng)
    suggestions.value = []
  })
}

function setMarker(latLng) {
  const TMap = window.TMap

  if (markerInstance) {
    markerInstance.setGeometries([])
  }

  markerInstance = new TMap.MultiMarker({
    map: mapInstance,
    geometries: [{
      id: 'selected',
      position: latLng
    }]
  })

  selected.lat = latLng.lat
  selected.lng = latLng.lng
  mapInstance.setCenter(latLng)
}

async function reverseGeocode(latLng) {
  try {
    const result = await geocoderInstance.getAddress({
      location: latLng
    })
    const detail = result.result
    selected.name = detail.formatted_addresses?.recommend || detail.address || ''
    selected.address = detail.address || ''
  } catch {
    selected.name = ''
    selected.address = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`
  }
}

async function handleSearch() {
  if (!keyword.value.trim()) {
    suggestions.value = []
    return
  }
  try {
    const result = await searchService.searchRectangle({
      keyword: keyword.value,
      bounds: mapInstance.getBounds()
    })
    suggestions.value = (result.data || []).map(item => ({
      title: item.title,
      address: item.address,
      lat: item.location.lat,
      lng: item.location.lng
    }))
  } catch {
    // 范围搜索失败时尝试关键词搜索
    try {
      const result = await searchService.search({
        keyword: keyword.value,
        location: mapInstance.getCenter()
      })
      suggestions.value = (result.data || []).map(item => ({
        title: item.title,
        address: item.address,
        lat: item.location.lat,
        lng: item.location.lng
      }))
    } catch {
      suggestions.value = []
    }
  }
}

function selectSuggestion(item) {
  const TMap = window.TMap
  const latLng = new TMap.LatLng(item.lat, item.lng)
  setMarker(latLng)
  selected.name = item.title
  selected.address = item.address
  suggestions.value = []
  keyword.value = item.title
}

function handleConfirm() {
  emit('confirm', {
    lat: selected.lat,
    lng: selected.lng,
    name: selected.name,
    address: selected.address
  })
  emit('update:visible', false)
}

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.map-picker {
  .search-bar {
    position: relative;
    margin-bottom: 12px;

    .suggestions-list {
      position: absolute;
      top: 42px;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid $border-color;
      border-radius: $radius-input;
      box-shadow: $shadow-dropdown;
      max-height: 240px;
      overflow-y: auto;
      z-index: 10;

      .suggestion-item {
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid #DBDEE3;

        &:last-child { border-bottom: none; }
        &:hover { background: $page-bg; }

        .suggestion-title {
          font-size: 15px;
          color: $text-primary;
        }

        .suggestion-address {
          font-size: 12px;
          color: $text-auxiliary;
          margin-top: 2px;
        }
      }
    }
  }

  .map-container {
    width: 100%;
    height: 400px;
    border-radius: $radius-card;
    overflow: hidden;
    border: 1px solid $border-color;
  }

  .location-info {
    margin-top: 12px;
    padding: 12px 16px;
    background: $page-bg;
    border-radius: $radius-input;

    .info-row {
      display: flex;
      font-size: 13px;
      line-height: 24px;

      .info-label {
        color: $text-auxiliary;
        flex-shrink: 0;
        width: 56px;
      }

      .info-value {
        color: $text-primary;
      }
    }
  }
}
</style>
