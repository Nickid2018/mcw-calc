<script setup lang="ts">
import { computed, ref } from 'vue'
import CalcField from '@/components/CalcField.vue'

const edition = ref<'java' | 'bedrock'>('java')
const targetUseCount = ref(0)
const sacrificeUseCount = ref(0)
const rename = ref(false)
const repair = ref(false)
// eslint-disable-next-line unused-imports/no-unused-vars
const cost = computed<number>(() => {
  const priorUsePenalty = 2 ** targetUseCount.value + 1 + 2 ** sacrificeUseCount.value + 1
  const renameCost = rename.value ? 1 : 0
  const repairCost = repair.value ? 2 : 0
  if (edition.value === 'java') {
    // TODO
  } else if (edition.value === 'bedrock') {
    // TODO
  }
  return priorUsePenalty + renameCost + repairCost
})
</script>

<template>
  <CalcField />
</template>
