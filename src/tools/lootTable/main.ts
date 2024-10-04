import '@/init'
import * as vue from 'vue'
import { z } from 'zod'
import App from './App.vue'
import { createMcwI18n } from '@/utils/i18n'
import { getParams, handleParseError, sz } from '@/utils/params.ts'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const parsed = z
    .object({
      edition: sz.string().default('je'),
      data: sz.array(sz.string(), ';')
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(i18n).mount(targetEl)
})()

