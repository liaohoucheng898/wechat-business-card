<template>
  <div class="image-upload">
    <!-- 已上传：预览 -->
    <div v-if="imageUrl" class="preview-wrapper" :style="previewStyle">
      <img :src="imageUrl" class="preview-img" />
      <div class="preview-mask">
        <el-icon :size="20" class="mask-icon" @click="handleReplace"><Refresh /></el-icon>
        <el-icon :size="20" class="mask-icon" @click="handleRemove"><Delete /></el-icon>
      </div>
    </div>

    <!-- 未上传：上传按钮 -->
    <div v-else class="upload-trigger" :style="triggerStyle" @click="triggerSelect">
      <el-icon :size="28" color="#BBBFC4"><Plus /></el-icon>
      <span class="upload-text">{{ placeholder }}</span>
    </div>

    <!-- 隐藏的文件选择 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      style="display: none"
      @change="onFileSelected"
    />

    <!-- 裁剪弹窗 -->
    <el-dialog
      v-model="cropDialogVisible"
      title="裁剪图片"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
      @opened="onDialogOpened"
      @closed="onDialogClosed"
    >
      <div class="crop-container">
        <img ref="cropImgEl" />
      </div>
      <template #footer>
        <el-button @click="cropDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleCropConfirm">
          确认裁剪
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Delete } from '@element-plus/icons-vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import cloudApp from '@/cloud/init'

const props = defineProps({
  modelValue: { type: String, default: '' },
  // 裁剪比例：'1:1' | '5:4' | '16:9'
  ratio: { type: String, default: '1:1' },
  placeholder: { type: String, default: '上传图片' },
  width: { type: Number, default: 120 },
  maxSize: { type: Number, default: 2 },
  fitCropBoxToImage: { type: Boolean, default: false },
  cropOutputWidth: { type: Number, default: 0 },
  cropOutputHeight: { type: Number, default: 0 },
  thumbWidth: { type: Number, default: 0 },
  thumbHeight: { type: Number, default: 0 },
  thumbQuality: { type: Number, default: 0.75 }
})

const emit = defineEmits(['update:modelValue', 'uploaded'])

const fileInput = ref(null)
const cropImgEl = ref(null)
const cropDialogVisible = ref(false)
const cropImgSrc = ref('')
const uploading = ref(false)
const previewUrl = ref('')
let cropperInstance = null

const imageUrl = computed(() => previewUrl.value)

const fixedNumber = computed(() => {
  const parts = props.ratio.split(':').map(Number)
  return parts.length === 2 ? parts : [1, 1]
})
const aspectRatio = computed(() => fixedNumber.value[0] / fixedNumber.value[1])

const previewStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${Math.round(props.width / aspectRatio.value)}px`
}))
const triggerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${Math.round(props.width / aspectRatio.value)}px`
}))

function triggerSelect() {
  fileInput.value.value = ''
  fileInput.value.click()
}
function handleReplace() { triggerSelect() }
function handleRemove() {
  previewUrl.value = ''
  emit('update:modelValue', '')
  emit('uploaded', { fileID: '', tempUrl: '' })
}

async function resolvePreviewUrl(fileID) {
  if (!fileID) {
    previewUrl.value = ''
    return
  }

  if (!fileID.startsWith('cloud://')) {
    previewUrl.value = fileID
    return
  }

  try {
    const urlRes = await cloudApp.getTempFileURL({ fileList: [fileID] })
    previewUrl.value = urlRes.fileList?.[0]?.tempFileURL || ''
  } catch {
    previewUrl.value = ''
  }
}

function onFileSelected(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    ElMessage.warning('仅支持 JPG、PNG、WebP 格式')
    return
  }
  if (file.size / 1024 / 1024 > props.maxSize) {
    ElMessage.warning(`图片大小不能超过 ${props.maxSize}MB`)
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    cropImgSrc.value = ev.target.result
    cropDialogVisible.value = true
  }
  reader.readAsDataURL(file)
}

function fitCropBoxToCanvas() {
  if (!cropperInstance) return

  const canvasData = cropperInstance.getCanvasData()
  if (!canvasData?.width || !canvasData?.height) return

  let cropBoxWidth = canvasData.width
  let cropBoxHeight = cropBoxWidth / aspectRatio.value
  if (cropBoxHeight > canvasData.height) {
    cropBoxHeight = canvasData.height
    cropBoxWidth = cropBoxHeight * aspectRatio.value
  }

  cropperInstance.setCropBoxData({
    left: canvasData.left + (canvasData.width - cropBoxWidth) / 2,
    top: canvasData.top + (canvasData.height - cropBoxHeight) / 2,
    width: cropBoxWidth,
    height: cropBoxHeight
  })
}

function onDialogOpened() {
  nextTick(() => {
    const imgEl = cropImgEl.value
    if (!imgEl) return
    // 先设置 src
    imgEl.src = cropImgSrc.value
    // 初始化 Cropper
    cropperInstance = new Cropper(imgEl, {
      aspectRatio: aspectRatio.value,
      // dragMode: 'move' — 拖动图片，裁剪框固定
      dragMode: 'move',
      // viewMode: 2 — 图片不能移出容器
      viewMode: 2,
      // 裁剪框占容器 80%
      autoCropArea: 0.8,
      // 裁剪框可移动可缩放
      cropBoxMovable: true,
      cropBoxResizable: true,
      // 不显示网格线
      guides: false,
      // 高亮裁剪区
      highlight: true,
      // 双击切换拖动模式
      toggleDragModeOnDblclick: false,
      background: true,
      ready: () => {
        if (props.fitCropBoxToImage) {
          fitCropBoxToCanvas()
        }
      }
    })
  })
}

function onDialogClosed() {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  cropImgSrc.value = ''
}

function canvasToBlob(canvas, quality = 0.9) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

async function createThumbBlob(sourceCanvas) {
  if (props.thumbWidth <= 0 || props.thumbHeight <= 0) return null

  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = props.thumbWidth
  thumbCanvas.height = props.thumbHeight
  const ctx = thumbCanvas.getContext('2d')
  if (!ctx) return null

  const sourceWidth = sourceCanvas.width
  const sourceHeight = sourceCanvas.height
  const targetRatio = props.thumbWidth / props.thumbHeight
  const sourceRatio = sourceWidth / sourceHeight
  let sx = 0
  let sy = 0
  let sw = sourceWidth
  let sh = sourceHeight

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio
    sx = (sourceWidth - sw) / 2
  } else if (sourceRatio < targetRatio) {
    sh = sourceWidth / targetRatio
    sy = (sourceHeight - sh) / 2
  }

  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, props.thumbWidth, props.thumbHeight)
  return canvasToBlob(thumbCanvas, props.thumbQuality)
}

function handleCropConfirm() {
  if (!cropperInstance) {
    ElMessage.error('裁剪器未就绪，请重试')
    return
  }
  uploading.value = true
  const fixedOutputEnabled = props.cropOutputWidth > 0 && props.cropOutputHeight > 0
  const canvas = cropperInstance.getCroppedCanvas({
    ...(fixedOutputEnabled
      ? {
          width: props.cropOutputWidth,
          height: props.cropOutputHeight
        }
      : {
          maxWidth: 1200,
          maxHeight: 1200
        }),
    fillColor: '#fff',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })
  if (!canvas) {
    ElMessage.error('裁剪失败，请重试')
    uploading.value = false
    return
  }
  canvas.toBlob(async (blob) => {
    try {
      const fileName = `admin-upload/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const result = await cloudApp.uploadFile({ cloudPath: fileName, filePath: blob })
      const fileID = result.fileID
      let thumbFileID = ''
      const thumbBlob = await createThumbBlob(canvas)
      if (thumbBlob) {
        const thumbFileName = fileName.replace(/(\.[^.]+)$/, '-thumb.jpg')
        const thumbResult = await cloudApp.uploadFile({ cloudPath: thumbFileName, filePath: thumbBlob })
        thumbFileID = thumbResult.fileID
      }
      const urlRes = await cloudApp.getTempFileURL({ fileList: [fileID] })
      const tempUrl = urlRes.fileList?.[0]?.tempFileURL || fileID
      previewUrl.value = tempUrl
      emit('update:modelValue', fileID)
      emit('uploaded', { fileID, tempUrl, thumbFileID })
      cropDialogVisible.value = false
      ElMessage.success('上传成功')
    } catch {
      ElMessage.error('上传失败，请重试')
    } finally {
      uploading.value = false
    }
  }, 'image/jpeg', 0.9)
}

watch(
  () => props.modelValue,
  (val) => {
    resolvePreviewUrl(val || '')
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.preview-wrapper {
  position: relative;
  border-radius: $radius-button;
  overflow: hidden;
  border: 1px solid $border-color;

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .preview-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    opacity: 0;
    transition: opacity 0.2s;

    .mask-icon {
      color: #fff;
      cursor: pointer;
      &:hover { transform: scale(1.15); }
    }
  }

  &:hover .preview-mask { opacity: 1; }
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed $border-color;
  border-radius: $radius-button;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover { border-color: $color-primary; }

  .upload-text {
    font-size: 12px;
    color: $text-disabled;
  }
}

.crop-container {
  width: 100%;
  height: 400px;

  /* cropperjs 生成的容器撑满 */
  :deep(.cropper-container) {
    width: 100% !important;
    height: 400px !important;
  }
}
</style>
