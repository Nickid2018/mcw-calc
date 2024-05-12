/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!

const params = getParams(['icon'], {
  icon: 'normal',
})

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }), 'en')
vue
  .createApp(App, {
    type: params.get('icon'),
  })
  .use(i18n)
  .mount(targetEl)
