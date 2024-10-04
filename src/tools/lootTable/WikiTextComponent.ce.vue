<script setup lang="ts">
import { onUpdated, ref } from 'vue'
import { parentOrigin } from '@/utils/iframe.ts'
import { sanitizeLinks } from '@/utils/wiki.ts'
import { getLocale } from '@/utils/i18n.ts'

const props = defineProps<{
  wikitext: string
}>()

const wikitext = ref()

onUpdated(() => {
  wikitext.value.innerHTML = props.wikitext
  sanitizeLinks(wikitext.value)
})
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
  <div id="mw-content-text" ref="wikitext" />
</template>
