<template>
  <div class="company-tabs">
    <el-radio-group v-model="activeId" size="default" @change="handleChange">
      <el-radio-button label="">全部</el-radio-button>
      <el-radio-button
        v-for="(name, id) in companyMap"
        :key="id"
        :label="id"
      >
        {{ name }}
      </el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { COMPANY_MAP } from '@/config/env'

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'change'])

const companyMap = COMPANY_MAP
const activeId = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  activeId.value = val
})

function handleChange(val) {
  emit('update:modelValue', val)
  emit('change', val)
}
</script>

<style lang="scss" scoped>
.company-tabs {
  margin-bottom: 16px;
}
</style>
