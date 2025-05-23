<script setup lang="ts">
import { flip, offset, shift, useFloating } from '@floating-ui/vue'
import { onClickOutside } from '@vueuse/core'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  icon: string
  type: 'warning' | 'error'
}>()

const { t } = useI18n()

const button = ref()
const popup = ref()
const popupOpen = ref(false)

const { floatingStyles: popupStyles } = useFloating(button, popup, {
  open: popupOpen,
  placement: 'top',
  middleware: [offset(5), flip(), shift()],
})
onClickOutside(popup, () => {
  popupOpen.value = false
})
</script>

<template>
  <CdxButton
    ref="button"
    weight="quiet"
    :aria-label="t(`banner.${props.type}`)"
    @click="popupOpen = !popupOpen"
  >
    <CdxIcon size="small" :icon="props.icon" :class="`${props.type}-icon`" />
  </CdxButton>
  <div
    v-if="popupOpen"
    ref="popup"
    style="
      background-color: var(--background-color-base, #fff);
      border: 1px solid var(--border-color-base, #a2a9b1);
      border-radius: 4px;
      padding: 12px;
      max-width: 300px;
      text-align: left;
    "
    class="popup"
    :style="{ ...popupStyles, display: popupOpen ? 'block' : 'none' }"
  >
    <slot />
  </div>
</template>

<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-icon.warning-icon {
  color: @color-warning;
}

.cdx-icon.error-icon {
  color: @color-error;
}

.popup {
  z-index: @z-index-tooltip;
}
</style>
