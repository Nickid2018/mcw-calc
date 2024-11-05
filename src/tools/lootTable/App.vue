<script setup lang="ts">
import WikiTextComponent from '@/tools/lootTable/WikiTextComponent.ce.vue'
import { defineCustomElement } from 'vue'

const props = defineProps<{
  edition: string
  data: string[]
}>()

customElements.define('wikitext-component', defineCustomElement(WikiTextComponent))

const text = "{{crafting usage|Stone}}\n\n{{BlockLink|air}}"
</script>

<template>
  <wikitext-component :wikitext="text" />
</template>