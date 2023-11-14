import vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('.mcw-calc[data-type="exampleCounter"]')
// @ts-expect-error
const createApp = vue.createMwApp || vue.createApp
createApp(App).mount(targetEl)
