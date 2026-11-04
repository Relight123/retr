/** Тесты торгового движка: исполнение, комиссии, PnL, ликвидация, backfill. */
import { describe, it, expect } from 'vitest'
import {
  D,
  applyFill,
  catchUp,
  closeFuturesFull,
  computeEquity,
  computeStats,
  evalOrderCandle,
  evalLiquidation,
  initialAccount,
  liqPrice,
  makeOrder,
  vwapFromDepth,
} from './test-helpers'

const FEE = 0.1 // %

describe('vwap по стакану', () => {
  it('средняя цена buy по уровням asks', () => {
    const depth = {
      bids: [['99', '10']] as [string, string][],
      asks: [
        ['100', '1'],
        ['101', '1'],
      ] as [string, string][],
    }
    const r = vwapFromDepth(depth, 'buy', '2', '100')
    expect(r.avgPrice).toBe('100.50000000')
    expect(r.depleted).toBe(false)
  })

  it('нехватка объёма — помечает depleted и штрафует хвост', () => {
    const depth = {
      bids: [['99', '1']] as [string, string][],
      asks: [['100', '1']] as [string, string][],
    }
    const r = vwapFromDepth(depth, 'buy', '10', '100')
    expect(r.depleted).toBe(true)
    // 1 по 100 + 9 по 105 → 104.5
    expect(r.avgPrice).toBe('104.50000000')
  })

  it('без стакана — квартус спред 0.05%', () => {
    const r = vwapFromDepth(null, 'sell', '1', '200')
    expect(r.avgPrice).toBe('199.90000000')
  })
})

describe('спот: покупки/продажи и комиссии', () => {
  it('buy списывает notional+fee и строит среднюю', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'spot',
      side: 'buy',
      kind: 'market',
      qty: '0.1',
      price: '20000',
      ts: 1000,
      feePct: FEE,
    }).snap
    // notional 2000, fee 2 → cash 7998
    expect(D(snap.cash).toNumber()).toBeCloseTo(7998, 4)
    expect(D(snap.holdings['BTCUSDT'].qty).toString()).toBe('0.1')
    expect(D(snap.holdings['BTCUSDT'].avgPrice).toNumber()).toBeCloseTo(20000, 6)
    // одна сделка, комиссия 2
    expect(snap.trades[0].fee).toBe('2.00000000')
  })

  it('sell считает реализованный PnL', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'spot',
      side: 'buy',
      kind: 'market',
      qty: '0.1',
      price: '20000',
      ts: 1000,
      feePct: FEE,
    }).snap
    const { snap: snap2, trade } = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'spot',
      side: 'sell',
      kind: 'market',
      qty: '0.1',
      price: '22000',
      ts: 2000,
      feePct: FEE,
    })
    // net = 2200 - 2.2 = 2197.8; cost = 2000 → +197.8
    expect(D(trade.pnl as string).toNumber()).toBeCloseTo(197.8, 6)
    expect(snap2.holdings['BTCUSDT']).toBeUndefined()
  })

  it('взвешенная средняя при доливке', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'spot',
      side: 'buy',
      kind: 'market',
      qty: '1',
      price: '100',
      ts: 1,
      feePct: FEE,
    }).snap
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'spot',
      side: 'buy',
      kind: 'market',
      qty: '1',
      price: '150',
      ts: 2,
      feePct: FEE,
    }).snap
    expect(D(snap.holdings['BTCUSDT'].avgPrice).toNumber()).toBeCloseTo(125, 8)
  })

  it('INSUFFICIENT_BALANCE и INSUFFICIENT_ASSET', () => {
    let snap = initialAccount('100')
    expect(() =>
      applyFill(snap, {
        symbol: 'BTCUSDT',
        market: 'spot',
        side: 'buy',
        kind: 'market',
        qty: '1',
        price: '20000',
        ts: 1,
        feePct: FEE,
      })
    ).toThrowError('INSUFFICIENT_BALANCE')
    expect(() =>
      applyFill(snap, {
        symbol: 'BTCUSDT',
        market: 'spot',
        side: 'sell',
        kind: 'market',
        qty: '1',
        price: '100',
        ts: 1,
        feePct: FEE,
      })
    ).toThrowError('INSUFFICIENT_ASSET')
  })

  it('MIN_NOTIONAL для слишком мелкого ордера', () => {
    const snap = initialAccount('10000')
    expect(() =>
      applyFill(snap, {
        symbol: 'BTCUSDT',
        market: 'spot',
        side: 'buy',
        kind: 'market',
        qty: '0.00001',
        price: '20000',
        ts: 1,
        feePct: FEE,
      })
    ).toThrowError('MIN_NOTIONAL')
  })
})

describe('фьючерсы: маржа, PnL, ликвидация', () => {
  it('лип id цены ликвидации 5x лонг: entry*(1−1/5+0.005)', () => {
    expect(D(liqPrice('100', 5, 'long')).toNumber()).toBeCloseTo(80.5, 6)
    expect(D(liqPrice('100', 5, 'short')).toNumber()).toBeCloseTo(119.5, 6)
  })

  it('открытие лонга 5x замораживает маржу', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'futures',
      side: 'buy',
      kind: 'market',
      qty: '0.5', // notional 5000
      price: '10000',
      ts: 1,
      feePct: FEE,
      leverage: 5,
    }).snap
    // margin = 1000, fee = 5 → cash 8995
    expect(D(snap.cash).toNumber()).toBeCloseTo(8995, 4)
    expect(snap.positions).toHaveLength(1)
    expect(snap.positions[0].side).toBe('long')
    expect(D(snap.positions[0].liqPrice).toNumber()).toBeCloseTo(8050, 3)
  })

  it('закрытие лонга в плюс возвращает маржу+PnL−fee', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'futures',
      side: 'buy',
      kind: 'market',
      qty: '0.5',
      price: '10000',
      ts: 1,
      feePct: FEE,
      leverage: 5,
    }).snap
    const res = closeFuturesFull(snap, snap.positions[0].id, '11000', 100, FEE)!
    expect(res).not.toBeNull()
    const { snap: snap2, trade } = res
    // pnlRaw = 0.5*1000 = 500; fee = 5.5; net = 494.5 → cash 8995+1000+494.5
    expect(D(trade.pnl as string).toNumber()).toBeCloseTo(494.5, 4)
    expect(D(snap2.cash).toNumber()).toBeCloseTo(10489.5, 4)
  })

  it('шорт: PnL инвертируется', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'futures',
      side: 'sell',
      kind: 'market',
      qty: '1',
      price: '100',
      ts: 1,
      feePct: FEE,
      leverage: 10,
    }).snap
    const res = closeFuturesFull(snap, snap.positions[0].id, '90', 100, 0)!
    // pnl = 1*(100-90) = 10
    expect(D(res!.trade.pnl as string).toNumber()).toBeCloseTo(10, 6)
  })

  it('убыток не превышает маржу (изолированная)', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'futures',
      side: 'buy',
      kind: 'market',
      qty: '1',
      price: '100',
      ts: 1,
      feePct: 0,
      leverage: 5,
    }).snap
    const res = closeFuturesFull(snap, snap.positions[0].id, '10', 100, 0)!
    // raw pnl = (10-100) = -90 → capped в −20 (маржа)
    expect(D(res!.trade.pnl as string).toNumber()).toBeCloseTo(-20, 6)
  })

  it('ликвидация ловится по свече под liq-ценой', () => {
    const pos = {
      side: 'long' as const,
      liqPrice: '80',
    }
    expect(evalLiquidation(pos, { time: 0, open: '100', high: '101', low: '79', close: '80' })).toBe(true)
    expect(evalLiquidation(pos, { time: 0, open: '100', high: '101', low: '81', close: '99' })).toBe(false)
  })
})

describe('backfill: лимиты/стопы/TP/OCO', () => {
  it('limit buy срабатывает на low<=price, исполнение по max(limit, open)', () => {
    const o = makeOrder({ kind: 'limit', side: 'buy', price: '90' })
    expect(
      evalOrderCandle(o, { time: 10, open: '95', high: '96', low: '89', close: '93' })
    ).toEqual({ hit: true, fillPrice: '90.00000000' })
    // гэп вниз: open ниже лимита → исполнение по open (лучше)
    expect(
      evalOrderCandle(o, { time: 10, open: '85', high: '96', low: '84', close: '93' })
    ).toEqual({ hit: true, fillPrice: '85.00000000' })
    // не коснулась
    expect(
      evalOrderCandle(o, { time: 10, open: '95', high: '96', low: '90.5', close: '93' })
    ).toEqual({ hit: false, fillPrice: '0' })
  })

  it('sell limit и TP со слиппеджем', () => {
    const o = makeOrder({ kind: 'limit', side: 'sell', price: '110' })
    expect(
      evalOrderCandle(o, { time: 10, open: '105', high: '115', low: '104', close: '112' })
    ).toEqual({ hit: true, fillPrice: '110.00000000' })
    const tp = makeOrder({ kind: 'take-profit', side: 'sell', price: '110' })
    const hit = evalOrderCandle(tp, { time: 10, open: '105', high: '115', low: '104', close: '112' })
    expect(hit.hit).toBe(true)
    expect(D(hit.fillPrice).toNumber()).toBeCloseTo(110 * (1 - 0.0005), 6)
  })

  it('catchUp исполняет limit buy задним числом и создаёт сделку', () => {
    let snap = initialAccount('10000')
    const order = makeOrder({
      kind: 'limit',
      side: 'buy',
      price: '90',
      qty: '1',
      createdAt: 5000,
    })
    snap = { ...snap, orders: [order] }
    const candles = {
      BTCUSDT: [
        { time: 1000, open: '95', high: '96', low: '94', close: '95' },
        { time: 61000, open: '95', high: '96', low: '89.5', close: '93' }, // касание после создания
        { time: 121000, open: '93', high: '95', low: '92', close: '94' },
      ],
    }
    const out = catchUp(snap, candles, 200000, FEE)
    const o = out.orders[0]
    expect(o.status).toBe('filled')
    expect(o.fillPrice).toBe('90.00000000')
    expect(o.filledAt).toBe(61000)
    expect(out.trades).toHaveLength(1)
    expect(out.trades[0].price).toBe('90.00000000')
    expect(D(out.holdings['BTCUSDT'].qty).toString()).toBe('1')
  })

  it('OCO: исполнение одного отменяет второй', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'spot',
      side: 'buy',
      kind: 'market',
      qty: '2',
      price: '100',
      ts: 1,
      feePct: 0,
    }).snap
    const ocoId = 'oco1'
    const tp = makeOrder({ kind: 'take-profit', side: 'sell', price: '120', qty: '2', createdAt: 5000, market: 'spot' })
    const sl = makeOrder({ kind: 'stop-loss', side: 'sell', price: '95', qty: '2', createdAt: 5000, market: 'spot' })
    tp.ocoId = ocoId
    sl.ocoId = ocoId
    snap = { ...snap, orders: [tp, sl] }
    const candles = {
      BTCUSDT: [
        { time: 61000, open: '100', high: '121', low: '99', close: '120' }, // TP касание
        { time: 121000, open: '118', high: '119', low: '90', close: '91' }, // SL касание позже
      ],
    }
    const out = catchUp(snap, candles, 200000, 0)
    expect(out.trades).toHaveLength(2) // покупка + исполнение TP
    expect(out.trades[1].kind).toBe('take-profit')
    expect(out.orders.map((o) => o.status)).toEqual(['filled', 'canceled'])
    expect(out.orders[1].note).toBe('oco-canceled')
  })

  it('ликвидация задним числом', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'futures',
      side: 'buy',
      kind: 'market',
      qty: '1',
      price: '100',
      ts: 1,
      feePct: 0,
      leverage: 5,
    }).snap // liq ≈ 80.5
    const candles = {
      BTCUSDT: [{ time: 61000, open: '95', high: '96', low: '78', close: '79' }],
    }
    const out = catchUp(snap, candles, 200000, 0)
    expect(out.positions).toHaveLength(0)
    expect(out.trades).toHaveLength(2)
    expect(out.trades[1].kind).toBe('liquidation')
    expect(D(out.trades[1].pnl as string).toNumber()).toBeCloseTo(-20, 4)
  })
})

describe('статистика', () => {
  it('winrate/PF/просадка', () => {
    let snap = initialAccount('1000')
    const mk = (pnl: string, ts: number) => ({
      id: `t${ts}`,
      ts,
      symbol: 'X',
      iSymbol: 'X',
      market: 'spot' as const,
      side: 'sell' as const,
      kind: 'market' as const,
      qty: '1',
      price: '1',
      quoteTotal: '1',
      fee: '0',
      pnl,
    })
    snap.trades = [mk('+100', 1), mk('-40', 2), mk('+60', 3)]
    const st = computeStats(snap.trades, snap.startBalance)
    expect(st.count).toBe(3)
    expect(st.winratePct).toBeCloseTo(66.67, 1)
    expect(st.profitFactor ?? 0).toBeCloseTo(4, 4)
    expect(st.best!.pnl).toBeCloseTo(100, 6)
    expect(st.worst!.pnl).toBeCloseTo(-40, 6)
    expect(st.maxDrawdownPct).toBeGreaterThan(0)
  })

  it('equity: включаёт кэш+спот+маржжу+upnl', () => {
    let snap = initialAccount('10000')
    snap = applyFill(snap, {
      symbol: 'BTCUSDT',
      market: 'futures',
      side: 'buy',
      kind: 'market',
      qty: '1',
      price: '100',
      ts: 1,
      feePct: 0,
      leverage: 5,
    }).snap
    const eq = computeEquity(snap, () => '110') // upnl +10
    expect(D(eq.equity).toNumber()).toBeCloseTo(10010, 6)
    expect(D(eq.free).toNumber()).toBeCloseTo(9980, 6)
  })
})
