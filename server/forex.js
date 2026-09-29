/**
 * EARNWAVE - Forex Trading Simulation Engine
 * Completely isolated virtual simulator with $10,000 USD virtual paper trading capital.
 * STRICT ENFORCEMENT: Virtual Forex funds are strictly educational and cannot be withdrawn or mixed with the KES earning wallet.
 */
import { JsonStore } from './storage.js';
import crypto from 'crypto';

const INITIAL_FOREX_ACCOUNT = {
  accountNumber: 'FX-DEMO-88294',
  currency: 'USD',
  initialBalance: 10000.00,
  balance: 10000.00,
  equity: 10000.00,
  freeMargin: 10000.00,
  marginUsed: 0.00,
  leverage: 100,
  positions: [],
  history: []
};

// Seed live quotes
const MARKET_RATES = {
  'EUR/USD': { bid: 1.0845, ask: 1.0847, spread: 0.0002, pipSize: 0.0001 },
  'GBP/USD': { bid: 1.2680, ask: 1.2683, spread: 0.0003, pipSize: 0.0001 },
  'USD/JPY': { bid: 154.20, ask: 154.23, spread: 0.03, pipSize: 0.01 },
  'BTC/USD': { bid: 64250.00, ask: 64280.00, spread: 30.00, pipSize: 1.00 }
};

class ForexEngine {
  constructor() {
    this.store = new JsonStore('forex.json', { accounts: { usr_default: INITIAL_FOREX_ACCOUNT } });
    this.rates = MARKET_RATES;
    this.startMarketFluctuation();
  }

  startMarketFluctuation() {
    // Generate realistic micro-tick fluctuations every 3 seconds
    setInterval(() => {
      for (const pair of Object.keys(this.rates)) {
        const item = this.rates[pair];
        const delta = (Math.random() - 0.49) * item.pipSize * 2;
        item.bid = Math.max(0.0001, Math.round((item.bid + delta) * 10000) / 10000);
        item.ask = Math.round((item.bid + item.spread) * 10000) / 10000;
      }
      this.recalculateAllAccounts();
    }, 3000);
  }

  getRates() {
    return this.rates;
  }

  getAccount(userId = 'usr_default') {
    const data = this.store.read();
    data.accounts = data.accounts || {};
    if (!data.accounts[userId]) {
      data.accounts[userId] = JSON.parse(JSON.stringify(INITIAL_FOREX_ACCOUNT));
      this.store.write(data);
    }
    this.recalculateAccount(data.accounts[userId]);
    return data.accounts[userId];
  }

  recalculateAccount(acc) {
    let unrealizedPnl = 0;
    let marginUsed = 0;

    for (const pos of acc.positions) {
      const currentRate = this.rates[pos.pair] || { bid: pos.openPrice, ask: pos.openPrice, pipSize: 0.0001 };
      const currentPrice = pos.type === 'BUY' ? currentRate.bid : currentRate.ask;
      
      let pips = 0;
      if (pos.type === 'BUY') {
        pips = (currentPrice - pos.openPrice) / currentRate.pipSize;
      } else {
        pips = (pos.openPrice - currentPrice) / currentRate.pipSize;
      }

      // Standard lot is 100,000 units. 1 pip per lot = ~$10
      const pipValue = pos.lotSize * 10;
      pos.pnl = Math.round(pips * pipValue * 100) / 100;
      pos.currentPrice = currentPrice;
      unrealizedPnl += pos.pnl;

      // Margin requirement (e.g. 1% with 1:100 leverage)
      marginUsed += (pos.lotSize * 100000) / acc.leverage;
    }

    acc.equity = Math.round((acc.balance + unrealizedPnl) * 100) / 100;
    acc.marginUsed = Math.round(marginUsed * 100) / 100;
    acc.freeMargin = Math.round((acc.equity - acc.marginUsed) * 100) / 100;
  }

  recalculateAllAccounts() {
    const data = this.store.read();
    if (!data.accounts) return;
    let modified = false;
    for (const userId of Object.keys(data.accounts)) {
      if (data.accounts[userId].positions.length > 0) {
        this.recalculateAccount(data.accounts[userId]);
        modified = true;
      }
    }
    if (modified) {
      this.store.write(data);
    }
  }

  openTrade({ userId = 'usr_default', pair, type, lotSize, stopLoss = null, takeProfit = null }) {
    if (!['BUY', 'SELL'].includes(type)) {
      throw new Error('Trade type must be BUY or SELL');
    }
    if (!this.rates[pair]) {
      throw new Error(`Unsupported instrument: ${pair}`);
    }
    const lot = Number(lotSize);
    if (isNaN(lot) || lot < 0.01 || lot > 10.0) {
      throw new Error('Lot size must be between 0.01 and 10.00');
    }

    const data = this.store.read();
    const acc = data.accounts[userId] || JSON.parse(JSON.stringify(INITIAL_FOREX_ACCOUNT));

    const marginRequired = (lot * 100000) / acc.leverage;
    if (acc.freeMargin < marginRequired) {
      throw new Error(`Insufficient virtual margin. Required: $${marginRequired.toFixed(2)}, Free: $${acc.freeMargin.toFixed(2)}`);
    }

    const rate = this.rates[pair];
    const openPrice = type === 'BUY' ? rate.ask : rate.bid;

    const positionId = 'pos_' + Date.now().toString(36) + '_' + crypto.randomBytes(2).toString('hex');
    const newPosition = {
      id: positionId,
      pair,
      type,
      lotSize: lot,
      openPrice,
      currentPrice: openPrice,
      stopLoss: stopLoss ? Number(stopLoss) : null,
      takeProfit: takeProfit ? Number(takeProfit) : null,
      pnl: 0,
      openedAt: new Date().toISOString()
    };

    acc.positions.push(newPosition);
    this.recalculateAccount(acc);

    data.accounts[userId] = acc;
    this.store.write(data);

    return {
      success: true,
      position: newPosition,
      account: acc
    };
  }

  closeTrade({ userId = 'usr_default', positionId }) {
    const data = this.store.read();
    const acc = data.accounts[userId];
    if (!acc) throw new Error('Forex account not found');

    const index = acc.positions.findIndex(p => p.id === positionId);
    if (index === -1) throw new Error('Position not found or already closed');

    const [pos] = acc.positions.splice(index, 1);
    const rate = this.rates[pos.pair] || { bid: pos.openPrice, ask: pos.openPrice, pipSize: 0.0001 };
    const closePrice = pos.type === 'BUY' ? rate.bid : rate.ask;

    let pips = 0;
    if (pos.type === 'BUY') {
      pips = (closePrice - pos.openPrice) / rate.pipSize;
    } else {
      pips = (pos.openPrice - closePrice) / rate.pipSize;
    }

    const pipValue = pos.lotSize * 10;
    const finalPnl = Math.round(pips * pipValue * 100) / 100;

    acc.balance = Math.round((acc.balance + finalPnl) * 100) / 100;
    
    acc.history.unshift({
      ...pos,
      closePrice,
      finalPnl,
      closedAt: new Date().toISOString()
    });

    // Keep history max 50 items
    if (acc.history.length > 50) acc.history.pop();

    this.recalculateAccount(acc);

    data.accounts[userId] = acc;
    this.store.write(data);

    return {
      success: true,
      closedPosition: { ...pos, closePrice, finalPnl },
      account: acc
    };
  }
}

export const forexEngine = new ForexEngine();
