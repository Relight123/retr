/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Navigator {
  /** legacy Safari: true, если страница открыта с домашнего экрана */
  standalone?: boolean
}
