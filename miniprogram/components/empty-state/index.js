Component({
  properties: {
    text: { type: String, value: '暂无数据' },
    subText: { type: String, value: '' },
    buttonText: { type: String, value: '' }
  },
  methods: {
    onButtonTap() {
      this.triggerEvent('buttontap')
    }
  }
})
