const { callCloudWithToken } = require('../../utils/cloud')
const { isValidEmail } = require('../../utils/format')
const { showSuccess, showError, showAlert } = require('../../utils/toast')
const auth = require('../../utils/auth')
const config = require('../../config/env')

Page({
  data: {
    staffId: '',
    name: '',
    phone: '',
    secondPhone: '',
    showSecondPhone: false,
    wechat: '',
    email: '',
    bio: '',
    avatar: '',
    avatarOriginal: '',
    companyTitles: [],
    bioLength: 0,
    saving: false,
    pageLoadedAt: 0,
    defaultAvatar: config.defaultAvatar,
    showAvatarCropper: false,
    cropImagePath: '',
    cropSourceWidth: 0,
    cropSourceHeight: 0,
    cropBoxSize: 280,
    cropImageX: 0,
    cropImageY: 0,
    cropImageDisplayWidth: 0,
    cropImageDisplayHeight: 0,
    cropBaseScale: 1,
    cropScale: 1,
    cropUploading: false
  },

  onLoad() {
    const staffInfo = auth.getStaffInfo()
    if (!staffInfo) {
      wx.redirectTo({ url: '/pages/bind-phone/index' })
      return
    }

    const companyTitles = (staffInfo.enabledCompanies || []).map((item) => ({
      companyId: item.companyId,
      companyName: config.companyMap[item.companyId] || item.companyId,
      title: item.title || ''
    }))

    this.setData({
      staffId: staffInfo.staffId,
      name: staffInfo.name || '',
      phone: staffInfo.phone || '',
      secondPhone: staffInfo.secondPhone || '',
      showSecondPhone: !!staffInfo.showSecondPhone,
      wechat: staffInfo.wechat || '',
      email: staffInfo.email || '',
      bio: staffInfo.bio || '',
      avatar: staffInfo.avatar || staffInfo.avatarOriginal || '',
      avatarOriginal: staffInfo.avatarOriginal || staffInfo.avatar || '',
      companyTitles,
      bioLength: (staffInfo.bio || '').length,
      pageLoadedAt: Date.now()
    })
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this._openAvatarCropper(tempFilePath)
      }
    })
  },

  _openAvatarCropper(tempFilePath) {
    wx.getImageInfo({
      src: tempFilePath,
      success: (info) => {
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const cropBoxSize = Math.min(Math.round(windowInfo.windowWidth * 0.74), 320)
        const baseScale = Math.max(cropBoxSize / info.width, cropBoxSize / info.height)
        const displayWidth = info.width * baseScale
        const displayHeight = info.height * baseScale

        this.setData({
          showAvatarCropper: true,
          cropImagePath: tempFilePath,
          cropSourceWidth: info.width,
          cropSourceHeight: info.height,
          cropBoxSize,
          cropImageX: (cropBoxSize - displayWidth) / 2,
          cropImageY: (cropBoxSize - displayHeight) / 2,
          cropImageDisplayWidth: displayWidth,
          cropImageDisplayHeight: displayHeight,
          cropBaseScale: baseScale,
          cropScale: 1,
          cropUploading: false
        })
      },
      fail: () => {
        showError('图片读取失败，请重试')
      }
    })
  },

  _resetAvatarCropper() {
    this._cropTouchState = null
    this.setData({
      showAvatarCropper: false,
      cropImagePath: '',
      cropSourceWidth: 0,
      cropSourceHeight: 0,
      cropImageX: 0,
      cropImageY: 0,
      cropImageDisplayWidth: 0,
      cropImageDisplayHeight: 0,
      cropBaseScale: 1,
      cropScale: 1,
      cropUploading: false
    })
  },

  onAvatarCropCancel() {
    if (this.data.cropUploading) return
    this._resetAvatarCropper()
  },

  onAvatarCropTouchStart(e) {
    const touches = e.touches || []
    if (touches.length === 1) {
      this._cropTouchState = {
        mode: 'move',
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        imageX: this.data.cropImageX,
        imageY: this.data.cropImageY
      }
      return
    }

    if (touches.length >= 2) {
      const distance = this._getTouchDistance(touches)
      this._cropTouchState = {
        mode: 'scale',
        distance,
        scale: this.data.cropScale,
        imageX: this.data.cropImageX,
        imageY: this.data.cropImageY,
        displayWidth: this.data.cropImageDisplayWidth,
        displayHeight: this.data.cropImageDisplayHeight
      }
    }
  },

  onAvatarCropTouchMove(e) {
    const state = this._cropTouchState
    const touches = e.touches || []
    if (!state || !touches.length) return

    if (state.mode === 'move' && touches.length === 1) {
      const nextX = state.imageX + touches[0].clientX - state.startX
      const nextY = state.imageY + touches[0].clientY - state.startY
      const nextPosition = this._clampCropPosition(
        nextX,
        nextY,
        this.data.cropImageDisplayWidth,
        this.data.cropImageDisplayHeight
      )
      this.setData({
        cropImageX: nextPosition.x,
        cropImageY: nextPosition.y
      })
      return
    }

    if (state.mode === 'scale' && touches.length >= 2) {
      const distance = this._getTouchDistance(touches)
      const nextScale = Math.min(4, Math.max(1, state.scale * distance / state.distance))
      const displayWidth = this.data.cropSourceWidth * this.data.cropBaseScale * nextScale
      const displayHeight = this.data.cropSourceHeight * this.data.cropBaseScale * nextScale
      const ratio = displayWidth / state.displayWidth
      const cropCenter = this.data.cropBoxSize / 2
      const nextX = cropCenter - (cropCenter - state.imageX) * ratio
      const nextY = cropCenter - (cropCenter - state.imageY) * ratio
      const nextPosition = this._clampCropPosition(nextX, nextY, displayWidth, displayHeight)

      this.setData({
        cropScale: nextScale,
        cropImageDisplayWidth: displayWidth,
        cropImageDisplayHeight: displayHeight,
        cropImageX: nextPosition.x,
        cropImageY: nextPosition.y
      })
    }
  },

  onAvatarCropTouchEnd() {
    this._cropTouchState = null
  },

  _getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy) || 1
  },

  _clampCropPosition(x, y, displayWidth, displayHeight) {
    const cropBoxSize = this.data.cropBoxSize
    const minX = cropBoxSize - displayWidth
    const minY = cropBoxSize - displayHeight
    return {
      x: displayWidth <= cropBoxSize ? (cropBoxSize - displayWidth) / 2 : Math.min(0, Math.max(minX, x)),
      y: displayHeight <= cropBoxSize ? (cropBoxSize - displayHeight) / 2 : Math.min(0, Math.max(minY, y))
    }
  },

  onAvatarCropConfirm() {
    if (this.data.cropUploading || !this.data.cropImagePath) return

    this.setData({ cropUploading: true })
    const {
      cropImagePath,
      cropSourceWidth,
      cropSourceHeight,
      cropBoxSize,
      cropImageX,
      cropImageY,
      cropImageDisplayWidth,
      cropImageDisplayHeight
    } = this.data

    const sourceX = Math.max(0, (0 - cropImageX) / cropImageDisplayWidth * cropSourceWidth)
    const sourceY = Math.max(0, (0 - cropImageY) / cropImageDisplayHeight * cropSourceHeight)
    const sourceWidth = Math.min(cropSourceWidth - sourceX, cropBoxSize / cropImageDisplayWidth * cropSourceWidth)
    const sourceHeight = Math.min(cropSourceHeight - sourceY, cropBoxSize / cropImageDisplayHeight * cropSourceHeight)

    wx.createSelectorQuery()
      .select('#avatarCropCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res && res[0] && res[0].node
        if (!canvas) {
          this.setData({ cropUploading: false })
          showError('裁剪器初始化失败，请重试')
          return
        }

        const outputSize = 600
        const ctx = canvas.getContext('2d')
        const image = canvas.createImage()
        canvas.width = outputSize
        canvas.height = outputSize

        image.onload = () => {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, outputSize, outputSize)
          ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            outputSize,
            outputSize
          )
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'jpg',
            quality: 0.92,
            success: (fileRes) => {
              this._resetAvatarCropper()
              this._uploadAvatar(fileRes.tempFilePath)
            },
            fail: () => {
              this.setData({ cropUploading: false })
              showError('头像裁剪失败，请重试')
            }
          })
        }
        image.onerror = () => {
          this.setData({ cropUploading: false })
          showError('图片加载失败，请重试')
        }
        image.src = cropImagePath
      })
  },

  noop() {},

  _uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    const cloudPath = `avatars/${this.data.staffId}_${Date.now()}.jpg`

    wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: (res) => {
        wx.hideLoading()
        this.setData({
          avatar: res.fileID,
          avatarOriginal: res.fileID
        })
      },
      fail: () => {
        wx.hideLoading()
        showError('头像上传失败，请重试')
      }
    })
  },

  onWechatInput(e) {
    this.setData({ wechat: e.detail.value })
  },

  onSecondPhoneInput(e) {
    this.setData({ secondPhone: (e.detail.value || '').replace(/\s+/g, '') })
  },

  onShowSecondPhoneChange(e) {
    this.setData({ showSecondPhone: !!e.detail.value })
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value })
  },

  onBioInput(e) {
    const value = e.detail.value
    this.setData({ bio: value, bioLength: value.length })
  },

  onCompanyTitleInput(e) {
    const companyId = e.currentTarget.dataset.companyId
    const value = e.detail.value
    const companyTitles = (this.data.companyTitles || []).map((item) => (
      item.companyId === companyId
        ? { ...item, title: value }
        : item
    ))
    this.setData({ companyTitles })
  },

  onSave() {
    if (this.data.saving) return

    const { email, bio, secondPhone } = this.data
    if (email && !isValidEmail(email)) {
      showError('请输入正确的邮箱格式')
      return
    }
    if (secondPhone && !/^1[3-9]\d{9}$/.test(secondPhone)) {
      showError('璇疯緭鍏ユ纭殑绗簩鎵嬫満鍙?')
      return
    }
    if (bio.length > 200) {
      showError('个人简介不能超过 200 字')
      return
    }

    this.setData({ saving: true })

    const fields = {}
    const staffInfo = auth.getStaffInfo()
    if (this.data.wechat !== (staffInfo.wechat || '')) fields.wechat = this.data.wechat
    if (this.data.email !== (staffInfo.email || '')) fields.email = this.data.email
    if (this.data.bio !== (staffInfo.bio || '')) fields.bio = this.data.bio
    if (this.data.secondPhone !== (staffInfo.secondPhone || '')) fields.secondPhone = this.data.secondPhone
    const nextShowSecondPhone = !!this.data.secondPhone && !!this.data.showSecondPhone
    if (nextShowSecondPhone !== !!staffInfo.showSecondPhone) fields.showSecondPhone = nextShowSecondPhone
    if (this.data.avatar !== (staffInfo.avatar || staffInfo.avatarOriginal || '')) {
      fields.avatar = this.data.avatar
      fields.avatarOriginal = this.data.avatarOriginal || this.data.avatar
    }

    const currentEnabledCompanies = staffInfo.enabledCompanies || []
    const nextEnabledCompanies = currentEnabledCompanies.map((item) => {
      const localItem = (this.data.companyTitles || []).find((company) => company.companyId === item.companyId)
      return {
        companyId: item.companyId,
        title: localItem ? localItem.title : (item.title || '')
      }
    })

    const titleChanged = nextEnabledCompanies.some((item) => {
      const currentItem = currentEnabledCompanies.find((company) => company.companyId === item.companyId)
      return (currentItem?.title || '') !== (item.title || '')
    })
    if (titleChanged) {
      fields.enabledCompanies = nextEnabledCompanies
    }

    if (Object.keys(fields).length === 0) {
      showSuccess('已保存')
      this.setData({ saving: false })
      return
    }

    callCloudWithToken('updateMyInfo', {
      staffId: this.data.staffId,
      pageLoadedAt: this.data.pageLoadedAt,
      fields
    }, { loadingText: '保存中...' }).then((data) => {
      auth.updateStaffInfo(fields)
      if (fields.enabledCompanies) {
        this.setData({
          companyTitles: fields.enabledCompanies.map((item) => ({
            companyId: item.companyId,
            companyName: config.companyMap[item.companyId] || item.companyId,
            title: item.title || ''
          }))
        })
      }
      this.setData({
        saving: false,
        pageLoadedAt: data.updatedAt || Date.now()
      })
      showSuccess('保存成功')
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    }).catch((err) => {
      this.setData({ saving: false })
      if (err.code === 'E0104') {
        showAlert('名片信息已被其他设备修改，请返回刷新后重试。', '编辑冲突')
      }
    })
  }
})
