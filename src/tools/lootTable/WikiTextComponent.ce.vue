<script setup lang="ts">
import { getLocale } from '@/utils/i18n'
import { parentOrigin } from '@/utils/iframe.ts'
import { parseWikitext, sanitizeLinks } from '@/utils/wiki.ts'
import { onMounted, onUpdated, ref } from 'vue'

const props = defineProps<{
  wikitext?: string
  text?: string
}>()

const content = ref()

function setContent(str: string) {
  content.value.innerHTML = str
  sanitizeLinks(content.value)
}

if (props.text) {
  onMounted(() => setContent(props.text!))
  onUpdated(() => setContent(props.text!))
} else if (props.wikitext) {
  onMounted(() => parseWikitext(props.wikitext!).then((html) => setContent(html)))
  onUpdated(() => parseWikitext(props.wikitext!).then((html) => setContent(html)))
}
</script>

<template>
  <link
    :href="`${parentOrigin()}/load.php?lang=${getLocale()}&modules=site.styles&only=styles&skin=vector`"
    rel="stylesheet"
  />
  <link
    :href="`${parentOrigin()}/load.php?lang=${getLocale()}&modules=skins.vector.styles.legacy&only=styles&skin=vector`"
    rel="stylesheet"
  />
  <link
    :href="`${parentOrigin()}/load.php?lang=${getLocale()}&modules=ext.gadget.site-styles&only=styles&skin=vector`"
    rel="stylesheet"
  />
  <div id="mw-content-text" ref="content" />
</template>
