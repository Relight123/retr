import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import { requestPersistentStorage, installIosGesturesGuards } from './lib/platform'
import { initStores } from './lib/boot'

// Service Worker: офлайн-оболочка статики; рыночные данные не кэшируются
registerSW({
  immediate: true,
  onNeedRefresh() {
    // автообновление включено (registerType: autoUpdate) — здесь тихо применяем
    window.dispatchEvent(new Event('pwa-update-ready'))
  },
})

// Данные не вычищаются iOS/WebKit при нехватке места
void requestPersistentStorage()
installIosGesturesGuards()

void initStores()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
