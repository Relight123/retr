# Paper Trading — PWA-симулятор криптотрейдинга

Приложение «бумажной» торговли криптой: реальный рынок (Binance → Bybit fallback), виртуальный счёт.
Играбельно с iPhone home screen как нативное приложение. Сборка — Vite, фреймворк — React 18 (TS strict).

> Всё исполнение ордеров, позиции, ликвидации, комиссия — внутри вашего браузера (IndexedDB + localStorage).
> Никаких бэкендов, регистраций и реальных денег.

> В регионах, где основной домен Binance отвечает HTTP 451 (без CORS-заголовков),
> приложение автоматически уходит на официальное публичное зеркало `data-api.binance.vision`
> (REST и WebSocket), затем — на Bybit; для Bybit дополнительно пробуется `api.bytick.com`.
> Фейлoвер кнопкой не нужен — сработавшая точка «приклеивается» до следующего сбоя.
>
> WebSocket не теряет подписки при переподключении: суммарно задержанные SUBSCRIBE
> аккумулируются и отправляются в `onopen`; плюс встроен сторожевой таймер
> (Binance: тишина > 45 с, Bybit > 90 с) — если сокет «полумёртвый» (TCP открыт,
> но данных нет), соединение принудительно рвётся и пересобирается.

---

## Возможности

- **Market** — топ-100 монет по данным Binance (фолбэк Bybit), поиск, избранное, спарклайны 24ч, pull-to-refresh, DEX-секция (DexScreener, выключена по умолчанию).
- **Trade** — живой график (свечи/линия, таймфреймы 1m…1d, лог-шкала, OHLC-легенда),
  про-терминальный верх (цена со вспышкой тика, объём/High/Low, отсчёт закрытия свечи),
  стакан топ-10 с кумулятивной глубиной Σ(USDT) и спред-строкой, лента сделок
  (aggTrade, подсветка «китов», баланс агрессии/тейкеров), нижний лист
  Позиции/Ордера/Сделки, чекбокс TP/SL, quick-fill 25/50/75/100%, Est. Liq Price, ордера:
  Market / Limit / Stop-Loss / Take-Profit / OCO (пара TP+SL на выход);
  спот и (опционально) фьючерсы long/short 1–50x с изолированной маржой и ценой ликвидации.
  Исполнение рыночных ордеров — по VWAP из стакана (проскальзывание как в реальности).
- **Portfolio** — общий капитал, PnL за день / всё время, донат распределения, позиции и активы.
- **History** — winrate, средний профит/лосс, Profit Factor, лучше/худшая сделка, макс. просадка, кривая капитала, журнал сделок с фильтрами.
- **Settings** — стартовый баланс и полный сброс, комиссия, вкл/выкл фьючерсов, тема (тёмная/светлая/системная), RU/EN, звуки, экспорт/импорт JSON.

Лимитные/стоп/TP ордера «догоняются» по 1m-свечам после закрытия приложения (backfill), OCO-пары отменяются каскадом.

## Стек

Vite 5 · React 18 (strict TS) · Zustand (persist) · Tailwind (CSS-var токены) · framer-motion · vaul sheets ·
lightweight-charts v4 · lucide-react · @tanstack/react-virtual · idb · decimal.js · Dexie-like idb kv ·
vite-plugin-pwa (Workbox, автообновление) · Vitest.

## Файловая структура

```
retr/
├─ index.html                # apple-мета, viewport-fit, splash
├─ package.json
├─ vite.config.ts            # PWA, vitest
├─ tailwind.config.js        # токены цветов на CSS-переменных
├─ postcss.config.js
├─ tsconfig.json
├─ scripts/
│  └─ generate-icons.mjs     # sharp: 192/512/maskable/apple-touch 180 + favicon
├─ public/
│  ├─ icons/*                # генерятся, в git не хранятся (кроме favicon.svg)
│  └─ manifest.webmanifest   # собирается vite-plugin-pwa
└─ src/
   ├─ main.tsx               # SW, persist storage, iOS guards, initStores
   ├─ App.tsx                # I18nProvider + вкладки + оверлей символа
   ├─ index.css              # дизайн-система: токены, glass, btn, od, skel
   ├─ api/                   # binance.ts, bybit.ts, provider.ts, coingecko.ts,
   │                         # dexscreener.ts, ws.ts (reconnect), types.ts
   ├─ lib/
   │  ├─ engine/             # торговый движок (десятичная математика decimal.js)
   │  │  ├─ money.ts checks.ts fills.ts execution.ts stats.ts types.ts index.ts
   │  │  └─ engine.test.ts   # vitest: инварианты филя, OCO, ликвидации, PnL
   │  ├─ i18n.tsx            # RU/EN словарь, t(), провайдер
   │  ├─ storage.ts          # idb KV
   │  ├─ boot.ts             # инициализация сторов
   │  └─ platform.ts haptics.ts sound.ts theme.ts format.ts util.ts
   ├─ store/                 # zustand: market, trading, settings, navigation, toasts, backup
   ├─ hooks/                 # useTickerPrice, useCoinMeta, usePullToRefresh, useLongPress…
   ├─ components/            # PriceChart, OrderBook, OrderSheet, BottomNav, Donut,
   │                         # EquityChart, Odometer, CoinIcon, Atomics (skeletons), ui.tsx
   └─ pages/                 # MarketPage, SymbolScreen, PortfolioPage, HistoryPage, SettingsPage
```

## Запуск для разработки

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: юнит-тесты движка
npm run build    # dist/ + precache манифест
npm run preview  # локальный просмотр продакшн-сборки (PWA работает только тут)
```

Иконки перегенерируются при `npm run dev` / `build` (пре-хук вызывает `scripts/generate-icons.mjs`).
Если sharp не установился — скрипт мягко пропустит шаг (текстовые фолбэки-иконки появятся из SVG favicon).

## Деплой (static hosting)

Сайт — чисто статический (`dist/`), нужен HTTPS и корректные MIME для webmanifest/SW.

### Cloudflare Pages

1. `npm run build`
2. Cloudflare Dashboard → Workers & Pages → Create application → Pages → **Direct Upload**, загрузите папку `dist`.
   (Либо подключите Git-репозиторий: Framework preset **Vite**, build command `npm run build`, output `dist`.)
3. PWA/SW работают «из коробки»: Cloudflare отдаёт `sw.js` и `manifest.webmanifest` с корректными заголовками.

### GitHub Pages

1. Соберите локально: `npm run build`
2. Проще всего деплоить ветку: скопируйте содержимое `dist` в корень ветки `gh-pages` (или используйте `npx gh-pages -d dist`).
3. В «Settings → Pages» выберите ветку `gh-pages`.
4. Если открываете по базовому пути (например `/paper-trading/`), соберите с базой:
   - временно: `npx vite build --base=/ИМЯ_РЕПОЗИТОРИЯ/`
   - или пропишите `base` в `vite.config.ts`.

### Netlify

1. Build command: `npm run build`, publish directory: `dist`.
2. (Опционально) `_redirects` не нужен — SPA-роутинга нет, всё работает на клиенте.

## Установка на iPhone / iPad (Add to Home Screen)

1. Откройте деплой по HTTPS в **Safari** (или localhost-версию через туннель).
2. Нажмите **Поделиться** (квадрат со стрелкой) → **Add to Home Screen** («На экран "Домой"»).
3. Имя → «Готово». Появится иконка (apple-touch 180px, генерится автоматически из accent-градиента).
4. Приложение откроется **без адресной строки** (standalone), с safe-area отступами под «чёлку» и home-индикатор.

Подсказка «Установите приложение» показывается автоматически, если заходите с iOS в обычной вкладке Safari,
и повторяется не чаще раза в 7 дней (настройка сохраняется).

- Отладка на iPhone: на десктопе Safari → Develop → [ваш iPhone] → страница.
- Данные счёта живут в IndexedDB устройства; для сохранения перед очисткой Safari используйте **Настройки → Экспорт JSON**.

## Дизайн-решения

- Тёмная «графитовая» тема по умолчанию (#0B0E14), один акцент — индиго #6C5CFF; зелёный #16C784 / красный #EA3943 только для PnL.
- Стеклянные (backdrop-blur) нижняя панель и хедеры, скелетоны при загрузке, spring-анимации (transform/opacity only),
  уважение к `prefers-reduced-motion`.
- Анимации «цифр-одометра» при изменении капитала/цен, конфетти при закрытии прибыльной сделки.

## Дисклеймер

Симулятор для обучения и бэктеста «на бумаге». Не является инвестиционной рекомендацией; реальные ордера не выставляются.
Рыночные данные — публичные API Binance/Bybit/DexScreener/CoinGecko и могут быть неточными или с задержкой.
