/** Дефолтные биржевые фильтры (если exchangeInfo недоступен,
 *  напр. при fallback-провайдере). */
export const DEFAULT_FILTERS = {
  tickSize: '0.000001',
  stepSize: '0.00001',
  minNotional: '5',
}
