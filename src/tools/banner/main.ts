import '@/init'
import * as vue from 'vue'
import { z } from 'zod'
import { CdxTooltip } from '@wikimedia/codex'
import App from './App.vue'
import { getParams, handleParseError } from '@/utils/params'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!
const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const parsed = z
    .object({
      icon: z.enum(['banner', 'shield']).default('banner'),
    })
    .safeParse(await getParams())
  const params = handleParseError(parsed, targetEl)

  vue
    .createApp(App, { icon: params.icon })
    .use(i18n)
    .directive('tooltip', CdxTooltip)
    .mount(targetEl)
})()
