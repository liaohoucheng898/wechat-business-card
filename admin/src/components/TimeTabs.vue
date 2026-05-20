<template>
  <div class="time-tabs">
    <el-radio-group v-model="activeRange" size="default" @change="handleChange">
      <el-radio-button
        v-for="opt in options"
        :key="opt.value"
        :label="opt.value"
      >
        {{ opt.label }}
      </el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '7d' }
})

const emit = defineEmits(['update:modelValue', 'change'])

const options = [
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' },
  { label: '全部', value: 'all' }
]

const activeRange = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  activeRange.value = val
})

function handleChange(val) {
  emit('update:modelValue', val)
  emit('change', val)
}
</script>

<style lang="scss" scoped>
.time-tabs {
  margin-bottom: 16px;
}
</style>
