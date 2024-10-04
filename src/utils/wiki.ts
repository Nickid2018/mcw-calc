import { parentOrigin } from '@/utils/iframe.ts'
import { digestMessage } from '@/utils/digest.ts'
import { fetchJigsawAPI } from '@/utils/jigsaw.ts'
import { getLocale } from '@/utils/i18n.ts'

export async function parseWikitext(wikitext: string) {
  const wikitextDigest = await digestMessage(wikitext)
  const response = await fetchJigsawAPI(
    `wikitext/${getLocale()}-${encodeURIComponent(wikitextDigest)}`,
  )
  const json = await response.json()
  if (json.processed) return json.text
  return (
    await fetchJigsawAPI(`wikitext/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wikitext,
        key: `${getLocale()}-${encodeURIComponent(wikitextDigest)}`,
      }),
    }).then((res) => res.json())
  ).text
}

export function sanitizeLinks(dom: HTMLDivElement) {
  const parent = parentOrigin()
  dom.querySelectorAll("[href^='/']").forEach((element) => {
    const href = element.attributes.getNamedItem('href')!
    href.value = parent + href.value
  })
  dom.querySelectorAll("[src^='/']").forEach((element) => {
    const src = element.attributes.getNamedItem('src')!
    src.value = parent + src.value
  })
}
