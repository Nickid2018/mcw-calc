<script setup lang="ts">
import { defineCustomElement, ref } from 'vue'
import { parseWikitext } from '@/utils/wiki.ts'
import WikiTextComponent from '@/tools/lootTable/WikiTextComponent.ce.vue'

const props = defineProps<{
  edition: string
  data: string[]
}>()

const wikiTextComponent = defineCustomElement(WikiTextComponent)
customElements.define('wikitext-component', wikiTextComponent)

const text = ref()
parseWikitext('{{crafting usage|Stone}}').then((html) => {
  text.value = html
})
</script>

<template>
  <wikitext-component :wikitext="text" />
</template>