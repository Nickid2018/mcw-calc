<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { hashCode } from '@/utils/seed'
import { CdxMessage, CdxTextInput } from '@wikimedia/codex'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const seed = ref('Minecraft Wiki')
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('seedHashcode.title') }}
    </template>
    <div class="flex flex-col gap-2">
      <CdxTextInput v-model="seed" />

      <div>
        {{ t('seedHashcode.actual') }}
        <template v-if="seed.trim() === ''">
          {{ t('seedHashcode.emptyString') }}
        </template>
        <code v-else>{{ hashCode(seed.trim()) }}</code>
      </div>

      <CdxMessage
        v-if="
          /^[+-]?\d+$/.test(seed.trim()) &&
          (BigInt(seed.trim()) > 2n ** 63n - 1n || BigInt(seed.trim()) < -(2n ** 63n))
        "
        type="warning"
      >
        {{ t('seedHashcode.outOfRange') }}
      </CdxMessage>
      <CdxMessage v-else-if="/^[+-]?\d+$/.test(seed.trim())" type="warning">
        {{ t('seedHashcode.number') }}
      </CdxMessage>
    </div>
  </CalcField>
</template>
