/**
 * Stock Predictor 15-Day Forecast
 * Uses historical price data + linear regression to predict 15-day price movement.
 */

/* ============================================================
   CONFIGURATION
   ============================================================ */

const PREDICTION_DAYS = 15;        // 半个月 = 15天
const HISTORY_DAYS = 90;           // 取90天历史数据用于回归
const MIN_DATA_POINTS = 20;        // 最少需要的数据点

/* ============================================================
   CACHE (localStorage)
   ============================================================ */

const CACHE_PREFIX = 'stock_pred_';

function getTodayDate() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function loadCachedData(ticker) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + ticker);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.date !== getTodayDate()) return null;
    return cached.data;
  } catch (_) { return null; }
}

function saveCachedData(ticker, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + ticker, JSON.stringify({ date: getTodayDate(), data }));
  } catch (_) { /* localStorage full, ignore */ }
}

function loadCachedTickers() {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + 'tickers');
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function saveCachedTickers(tickers) {
  try {
    localStorage.setItem(CACHE_PREFIX + 'tickers', JSON.stringify(tickers));
  } catch (_) { /* ignore */ }
}

const STOCKS = [
  { ticker: '600519.SS', name: '贵州茅台' },
  { ticker: '300750.SZ', name: '宁德时代' },
  { ticker: '601318.SS', name: '中国平安' },
  { ticker: '600036.SS', name: '招商银行' },
  { ticker: '000858.SZ', name: '五粮液' },
  { ticker: '002594.SZ', name: '比亚迪' },
  { ticker: '000333.SZ', name: '美的集团' },
  { ticker: '300059.SZ', name: '东方财富' },
  { ticker: '002415.SZ', name: '海康威视' },
  { ticker: '601012.SS', name: '隆基绿能' },
  { ticker: '603259.SS', name: '药明康德' },
  { ticker: '600887.SS', name: '伊利股份' },
];

const SEARCH_INDEX = [
  { ticker: '600519.SS', name: '贵州茅台 / Kweichow Moutai' },
  { ticker: '300750.SZ', name: '宁德时代 / CATL' },
  { ticker: '601318.SS', name: '中国平安 / Ping An Insurance' },
  { ticker: '600036.SS', name: '招商银行 / China Merchants Bank' },
  { ticker: '000858.SZ', name: '五粮液 / Wuliangye' },
  { ticker: '002594.SZ', name: '比亚迪 / BYD Co.' },
  { ticker: '000333.SZ', name: '美的集团 / Midea Group' },
  { ticker: '300059.SZ', name: '东方财富 / East Money Info' },
  { ticker: '002415.SZ', name: '海康威视 / Hikvision' },
  { ticker: '601012.SS', name: '隆基绿能 / LONGi Green Energy' },
  { ticker: '603259.SS', name: '药明康德 / WuXi AppTec' },
  { ticker: '600887.SS', name: '伊利股份 / Yili Group' },
  { ticker: '600030.SS', name: '中信证券 / CITIC Securities' },
  { ticker: '601166.SS', name: '兴业银行 / Industrial Bank' },
  { ticker: '600900.SS', name: '长江电力 / Yangtze Power' },
  { ticker: '600585.SS', name: '海螺水泥 / Conch Cement' },
  { ticker: '601398.SS', name: '工商银行 / ICBC' },
  { ticker: '601939.SS', name: '建设银行 / CCB' },
  { ticker: '600276.SS', name: '恒瑞医药 / Hengrui Medicine' },
  { ticker: '600309.SS', name: '万华化学 / Wanhua Chemical' },
  { ticker: '600809.SS', name: '山西汾酒 / Shanxi Fenjiu' },
  { ticker: '600031.SS', name: '三一重工 / SANY Heavy' },
  { ticker: '600438.SS', name: '通威股份 / Tongwei Co.' },
  { ticker: '601088.SS', name: '中国神华 / China Shenhua' },
  { ticker: '600028.SS', name: '中国石化 / Sinopec' },
  { ticker: '601857.SS', name: '中国石油 / PetroChina' },
  { ticker: '600941.SS', name: '中国移动 / China Mobile' },
  { ticker: '000651.SZ', name: '格力电器 / Gree Electric' },
  { ticker: '000002.SZ', name: '万科A / Vanke' },
  { ticker: '300760.SZ', name: '迈瑞医疗 / Mindray Medical' },
  { ticker: '002714.SZ', name: '牧原股份 / Muyuan Foods' },
  { ticker: '002475.SZ', name: '立讯精密 / Luxshare Precision' },
  { ticker: '000568.SZ', name: '泸州老窖 / Luzhou Laojiao' },
  { ticker: '300124.SZ', name: '汇川技术 / Inovance Tech' },
  { ticker: '002304.SZ', name: '洋河股份 / Yanghe Brewery' },
  { ticker: '000001.SZ', name: '平安银行 / Ping An Bank' },
  { ticker: '002230.SZ', name: '科大讯飞 / iFlytek' },
  { ticker: '300015.SZ', name: '爱尔眼科 / Aier Eye Hospital' },
  { ticker: '002352.SZ', name: '顺丰控股 / SF Holding' },
  { ticker: '300274.SZ', name: '阳光电源 / Sungrow Power' },
  { ticker: '000725.SZ', name: '京东方A / BOE Tech' },
  { ticker: '300498.SZ', name: '温氏股份 / Wens Foodstuff' },
  { ticker: '002459.SZ', name: '晶澳科技 / JA Solar Tech' },
  { ticker: '300124.SZ', name: '汇川技术 / Inovance Tech' },
  { ticker: '688981.SH', name: '中芯国际 / SMIC' },
  { ticker: '000063.SZ', name: '中兴通讯 / ZTE Corp.' },
  { ticker: '002129.SZ', name: '中环股份 / Zhonghuan Semi' },
  { ticker: '600690.SS', name: '海尔智家 / Haier Smart' },
  { ticker: '002555.SZ', name: '三七互娱 / 37 Interactive' },
];

/* ============================================================
   STATE
   ============================================================ */

let stockDataMap = new Map();       // ticker -> { prices, dates, ... }
let predictions = new Map();        // ticker -> { predictedPrice, change, confidence, ... }
let activeTickers = [...STOCKS.map(s => s.ticker)];
let chartInstance = null;
let isRefreshing = false;
let compareList = [];

/* ============================================================
   PREDICTION ENGINE (Linear Regression + Momentum)
   ============================================================ */

/* ============================================================
   TECHNICAL ANALYSIS HELPERS
   ============================================================ */

// Deterministic hash from ticker string
function hashTicker(ticker) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ((hash << 5) - hash) + ticker.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) || 1;
}

// Seeded PRNG (Linear Congruential Generator)
function seededRandom(seed) {
  let x = (seed * 16807) % 2147483647;
  return x / 2147483647;
}

// Update a running PRNG state and return a value
function nextRandom(state) {
  let x = (state * 16807) % 2147483647;
  return { value: x / 2147483647, state: x };
}

// Simple Moving Average
function calcSMA(prices, period) {
  const result = [];
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += prices[i - j];
    result.push(sum / period);
  }
  return result;
}

// Exponential Moving Average
function calcEMA(prices, period) {
  const mult = 2 / (period + 1);
  const result = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    result.push((prices[i] - result[i - 1]) * mult + result[i - 1]);
  }
  return result;
}

// RSI (Relative Strength Index)
function calcRSI(prices, period = 14) {
  const changes = [];
  for (let i = 1; i < prices.length; i++) changes.push(prices[i] - prices[i - 1]);
  const result = [];
  for (let i = period; i < changes.length; i++) {
    let gain = 0, loss = 0;
    for (let j = i - period; j < i; j++) {
      if (changes[j] > 0) gain += changes[j];
      else loss -= changes[j];
    }
    const avgGain = gain / period;
    const avgLoss = loss / period;
    if (avgLoss === 0) result.push(100);
    else result.push(100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

// MACD
function calcMACD(prices) {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const offset = ema12.length - ema26.length;
  const macdLine = [];
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[offset + i] - ema26[i]);
  }
  const signal = calcEMA(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - (signal[i] || 0));
  return { macdLine, signal, histogram };
}

/* ============================================================
   PREDICTION ENGINE
   ============================================================ */

// Bollinger Bands: returns position of last price within bands (-1 to +1)
function calcBollingerPosition(prices, period = 20) {
  if (prices.length < period) return 0;
  const y = prices.slice(-period);
  const mean = y.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(y.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
  if (stdDev === 0) return 0;
  const lastPrice = prices[prices.length - 1];
  const position = (lastPrice - mean) / (2 * stdDev);
  return Math.max(-1, Math.min(1, position));
}

// ATR: Average True Range for better risk estimation
function calcATR(highs, lows, closes, period = 14) {
  if (closes.length < 2) return 0;
  const tr = [];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i] || closes[i];
    const l = lows[i] || closes[i];
    const pc = closes[i - 1];
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (tr.length < period) return tr.reduce((a, b) => a + b, 0) / tr.length;
  const recent = tr.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / period;
}

// Volume Trend: volume confirmation signal (-1 to +1)
function calcVolumeTrend(prices, volumes) {
  if (!volumes || volumes.length < 10) return 0;
  const recent = Math.min(20, prices.length - 1);
  let upVol = 0, downVol = 0, upCount = 0, downCount = 0;
  for (let i = prices.length - recent; i < prices.length; i++) {
    if (volumes[i] <= 0) continue;
    if (prices[i] > prices[i - 1]) { upVol += volumes[i]; upCount++; }
    else { downVol += volumes[i]; downCount++; }
  }
  if (upCount === 0 || downCount === 0) return 0;
  const ratio = (upVol / upCount) / (downVol / downCount);
  return Math.max(-1, Math.min(1, (ratio - 1) * 2));
}

// Helper: calculate prediction for a given timeframe (in trading days)
function calcTimeframePrediction(currentPrice, slope, intercept, window, combinedReturn, days) {
  const regressionPrice = slope * (window - 1 + days) + intercept;
  const predictedPrice = regressionPrice * (1 + combinedReturn);
  const change = predictedPrice - currentPrice;
  const changePercent = (change / currentPrice) * 100;
  return { price: predictedPrice, change, changePercent };
}

// Helper: estimate probability of price increase using multiple indicators
function calcProbabilityUp(rsiVal, trendScore, macdHist, momentumVal, slopeVal) {
  const rsiScore = rsiVal < 30 ? 70 : rsiVal > 70 ? 30 : 55 - (rsiVal - 50) * 0.8;
  const trendScore2 = trendScore > 0.5 ? 65 : trendScore < -0.5 ? 35 : 50;
  const macdScore = macdHist > 0 ? 60 : 40;
  const momScore = momentumVal > 0 ? 60 : 40;
  const regScore = slopeVal > 0 ? 60 : 40;
  return Math.min(Math.max((rsiScore + trendScore2 + macdScore + momScore + regScore) / 5, 5), 95);
}

function predictPrice(data) {
  const prices = Array.isArray(data) ? data : data.prices;
  const opens = data.opens || prices;
  const highs = data.highs || prices;
  const lows = data.lows || prices;
  const volumes = data.volumes || [];
  const n = prices.length;
  if (n < MIN_DATA_POINTS) return null;

  const currentPrice = prices[n - 1];
  const window = Math.min(n, 60);
  const y = prices.slice(n - window);
  const x = Array.from({ length: window }, (_, i) => i);
  const y_highs = highs.slice(n - window);
  const y_lows = lows.slice(n - window);

  // --- Weighted Linear Regression ---
  const weights = x.map(i => Math.pow(0.97, window - 1 - i));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumWX = x.reduce((s, xi, i) => s + xi * weights[i], 0);
  const sumWY = y.reduce((s, yi, i) => s + yi * weights[i], 0);
  const sumWXY = x.reduce((s, xi, i) => s + xi * y[i] * weights[i], 0);
  const sumWXX = x.reduce((s, xi, i) => s + xi * xi * weights[i], 0);
  const slope = (sumW * sumWXY - sumWX * sumWY) / (sumW * sumWXX - sumWX * sumWX);
  const intercept = (sumWY - slope * sumWX) / sumW;
  const regressionPrediction = slope * (window - 1 + PREDICTION_DAYS) + intercept;

  // --- Technical Indicators ---
  const ma5 = calcSMA(y, Math.min(5, y.length));
  const ma10 = calcSMA(y, Math.min(10, y.length));
  const ma20 = calcSMA(y, Math.min(20, y.length));
  const rsiVals = calcRSI(y);
  const macdObj = calcMACD(y);
  const bollingerPos = calcBollingerPosition(y);
  const atr = calcATR(y_highs, y_lows, y, 14);
  const volTrend = volumes.length > 0 ? calcVolumeTrend(prices, volumes) : 0;

  // Current values of indicators
  const curMA5 = ma5[ma5.length - 1] || currentPrice;
  const curMA10 = ma10[ma10.length - 1] || currentPrice;
  const curMA20 = ma20[ma20.length - 1] || currentPrice;
  const curRSI = rsiVals[rsiVals.length - 1] || 50;
  const curMACD = macdObj.macdLine[macdObj.macdLine.length - 1] || 0;
  const curSignal = macdObj.signal[macdObj.signal.length - 1] || 0;
  const curHist = macdObj.histogram[macdObj.histogram.length - 1] || 0;

  // --- Trend analysis ---
  // MA alignment score: bullish if MA5 > MA10 > MA20
  const trendScore = (curMA5 > curMA10 ? 1 : 0) + (curMA10 > curMA20 ? 1 : 0)
    + (currentPrice > curMA5 ? 1 : 0) - 1.5;
  // trendScore: positive = bullish, negative = bearish, ~0 = neutral

  // --- Momentum from recent price ---
  const recent5 = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior10 = prices.slice(-15, -5).reduce((a, b) => a + b, 0) / 10;
  const momentum = (recent5 - prior10) / prior10;

  // --- RSI analysis ---
  const rsiBias = curRSI > 70 ? -0.08 : curRSI < 30 ? 0.08 : (curRSI - 50) / 625;

  // --- MACD analysis ---
  const macdBias = curHist > 0 ? 0.015 : -0.015;

  // --- Bollinger Bands analysis ---
  const bollingerBias = -bollingerPos * 0.02;

  // --- Volume trend analysis ---
  const volBias = volTrend * 0.015;

  // --- Combine signals ---
  // Base prediction from regression
  const trendFactor = trendScore * 0.02;
  const momentumFactor = momentum * 0.25;
  const combinedReturn = trendFactor + momentumFactor + rsiBias + macdBias + bollingerBias + volBias;
  const predictedPrice = regressionPrediction * (1 + combinedReturn);

  // --- Confidence score (0-95) ---
  // R-squared of regression
  const meanY = y.reduce((a, b) => a + b, 0) / window;
  const ssRes = y.reduce((s, yi, i) => {
    const fit = slope * x[i] + intercept;
    return s + (yi - fit) ** 2;
  }, 0);
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Volatility
  const dailyReturns = [];
  for (let i = 1; i < n; i++) {
    dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const meanRet = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  // Indicator agreement score
  const regDir = slope > 0 ? 1 : -1;
  const maDir = trendScore > 0.5 ? 1 : trendScore < -0.5 ? -1 : 0;
  const macdDir = curHist > 0 ? 1 : -1;
  const rsiDir = curRSI > 50 ? 1 : -1;
  const volDir = volTrend > 0.001 ? 1 : volTrend < -0.001 ? -1 : 0;
  const bollingerConfirm = (bollingerPos < -0.5 && regDir > 0) || (bollingerPos > 0.5 && regDir < 0) ? 1 : 0;
  const agreeScore =
    (regDir === maDir ? 4 : 0) +
    (regDir === macdDir ? 4 : 0) +
    (regDir === rsiDir ? 4 : 0) +
    (volDir === regDir && volDir !== 0 ? 4 : 0) +
    (bollingerConfirm ? 4 : 0);

  // MA trend strength: all aligned = stronger trend
  const maAligned = (curMA5 > curMA10 && curMA10 > curMA20) || (curMA5 < curMA10 && curMA10 < curMA20);
  const maStrength = maAligned ? 5 : 0;

  // Ensemble: three models agreement (regression, momentum, mean-reversion)
  const momentumModel = currentPrice * (1 + momentum * PREDICTION_DAYS);
  const momentumPredUp = momentumModel > currentPrice;
  const reversionStrength = (currentPrice - curMA20) / curMA20;
  const reversionModel = currentPrice * (1 - reversionStrength * 0.3);
  const reversionPredUp = reversionModel > currentPrice;
  const modelsUp = [regDir > 0, momentumPredUp, reversionPredUp];
  const upCount = modelsUp.filter(Boolean).length;
  const ensembleAgreement = upCount >= 2 ? (upCount === 3 ? 8 : 4) : 0;

  // Prediction interval tightness (80% CI width vs current price)
  const ssX = window * (window - 1) / 2;
  const ssX2 = (window - 1) * window * (2 * window - 1) / 6;
  const ssxx = ssX2 - ssX * ssX / window;
  const stdError = Math.sqrt(ssRes / Math.max(window - 2, 1));
  const predStdErr = stdError * Math.sqrt(1 + 1 / window + Math.pow(PREDICTION_DAYS, 2) / ssxx);
  const intervalWidth = (predStdErr * 1.282) / currentPrice;
  const intervalScore = intervalWidth < 0.05 ? 7 : intervalWidth < 0.10 ? 4 : intervalWidth < 0.15 ? 2 : 0;

  // Use ATR-based volatility if available for better risk measure
  const effVol = atr > 0 ? atr / currentPrice * Math.sqrt(252) : volatility;
  const r2Score = Math.min(rSquared * 20, 20);
  const volScore = Math.max(0, 15 - effVol * 100.0 * 5.0);
  const dataScore = Math.min((n / HISTORY_DAYS) * 10, 10);
  const confidence = Math.min(Math.round(r2Score + volScore + dataScore + agreeScore + maStrength + ensembleAgreement + intervalScore), 95);

  // Pre-compute daily volatility and multi-timeframe predictions
  const dailyVol = Math.sqrt(variance);
  const pred1d = calcTimeframePrediction(currentPrice, slope, intercept, window, combinedReturn, 1);
  const pred5d = calcTimeframePrediction(currentPrice, slope, intercept, window, combinedReturn, 5);
  const pred15d = calcTimeframePrediction(currentPrice, slope, intercept, window, combinedReturn, 15);
  const preds = { '1d': pred1d, '5d': pred5d, '15d': pred15d };

  return {
    currentPrice,
    predictedPrice,
    change: predictedPrice - currentPrice,
    changePercent: ((predictedPrice - currentPrice) / currentPrice) * 100,
    predictions: preds,
    risk: {
      probabilityUp: Math.round(calcProbabilityUp(curRSI, trendScore, curHist, momentum, slope)),
      annualVolatility: Math.round(volatility * 1000) / 10,
      maxDrawdown: Math.round(-dailyVol * Math.sqrt(PREDICTION_DAYS) * 1.65 * 1000) / 10,
      valueAtRisk95: Math.round(-dailyVol * Math.sqrt(PREDICTION_DAYS) * 1.65 * 1000) / 10,
      sharpeRatio: Math.round((preds['15d'].changePercent * (252 / PREDICTION_DAYS) / 100 - 0.03) / (volatility || 0.1) * 100) / 100,
    },
    confidence: Math.max(confidence, 10),
    rSquared,
    volatility,
    momentum,
    slope,
     rsi: curRSI,
     predictedDates: Array.from({ length: PREDICTION_DAYS }, (_, i) => i + 1),
     predictedPrices: Array.from({ length: PREDICTION_DAYS }, (_, i) => {
       const dayRatio = (i + 1) / PREDICTION_DAYS;
       const regPrice = slope * (window - 1 + i + 1) + intercept;
       return regPrice * (1 + combinedReturn * dayRatio);
     }),
  };
}

/* ============================================================
   DATA FETCHING (Yahoo Finance)
   ============================================================ */

// Fetch with timeout to prevent hanging on CORS-blocked requests
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStockData(ticker) {
  const now = Math.floor(Date.now() / 1000);
  const past = now - HISTORY_DAYS * 86400 * 1.5;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${past}&period2=${now}&interval=1d`;

  const response = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance returned ${response.status} for ${ticker}`);
  }

  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error(`No data returned for ${ticker}`);
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  const adjClose = result.indicators.adjclose?.[0]?.adjclose;

  const dates = [];
  const prices = [];
  const opens = [];
  const highs = [];
  const lows = [];
  const volumes = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = adjClose ? adjClose[i] : quotes.close[i];
    if (close && close > 0 && quotes.volume[i] > 0) {
      const d = new Date(timestamps[i] * 1000);
      dates.push(d);
      prices.push(close);
      opens.push(quotes.open[i]);
      highs.push(quotes.high[i]);
      lows.push(quotes.low[i]);
      volumes.push(quotes.volume[i]);
    }
  }

  const dailyChanges = [];
  for (let i = 1; i < prices.length; i++) {
    dailyChanges.push({
      change: prices[i] - prices[i - 1],
      percent: ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100,
    });
  }

  return { ticker, dates, prices, opens, highs, lows, volumes, dailyChanges };
}

/* ============================================================
   FALLBACK DATA (when API is unavailable)
   ============================================================ */

function generateFallbackData(ticker) {
  const basePrices = {
    '600519.SS': 1500, '300750.SZ': 180, '601318.SS': 50,
    '600036.SS': 35, '000858.SZ': 130, '002594.SZ': 260,
    '000333.SZ': 65, '300059.SZ': 12, '002415.SZ': 32,
    '601012.SS': 18, '603259.SS': 48, '600887.SS': 28,
    '600030.SS': 20, '601166.SS': 18, '600900.SS': 25,
    '600585.SS': 25, '601398.SS': 6, '601939.SS': 7,
    '600276.SS': 42, '600309.SS': 85, '600809.SS': 220,
    '600031.SS': 16, '600438.SS': 18, '601088.SS': 40,
    '600028.SS': 6, '601857.SS': 10, '600941.SS': 100,
    '000651.SZ': 40, '000002.SZ': 8, '300760.SZ': 280,
    '002714.SZ': 45, '002475.SZ': 30, '000568.SZ': 180,
    '300124.SZ': 60, '002304.SZ': 85, '000001.SZ': 11,
    '002230.SZ': 45, '300015.SZ': 12, '002352.SZ': 38,
    '300274.SZ': 70, '000725.SZ': 4, '300498.SZ': 18,
    '002459.SZ': 15, '688981.SH': 55, '000063.SZ': 28,
    '600690.SS': 28, '002555.SZ': 22, '002129.SZ': 20,
  };

  const base = basePrices[ticker] || 100;

  // Deterministic generation: use ticker hash as seed
  let seed = hashTicker(ticker);
  const prices = [];
  const dates = [];
  const opens = [];
  const highs = [];
  const lows = [];
  const volumes = [];
  const now = new Date();

  // Start from base price with a consistent offset
  const norm = seed / 2147483647;
  let price = base * (0.88 + norm * 0.24);

  // Generate a consistent trend direction from ticker hash
  const trendDrift = (norm - 0.5) * 0.002; // slight daily drift
  const volScale = 0.008 + norm * 0.025; // consistent volatility

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    // Deterministic "random" step using the LCG
    const rn = nextRandom(seed);
    seed = rn.state;
    const step = (rn.value - 0.5) * volScale * 2;

    price = price * (1 + trendDrift + step);
    const open = prices.length > 0 ? prices[prices.length - 1] : price;
    const high = price * (1 + Math.abs(step) * 0.5);
    const low = price * (1 - Math.abs(step) * 0.5);
    const volume = Math.round((5 + norm * 15) * 100000);
    prices.push(price);
    opens.push(open);
    highs.push(high);
    lows.push(low);
    volumes.push(volume);
    dates.push(d);
  }

  const dailyChanges = [];
  for (let i = 1; i < prices.length; i++) {
    dailyChanges.push({
      change: prices[i] - prices[i - 1],
      percent: ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100,
    });
  }

  return { ticker, dates, prices, opens, highs, lows, volumes, dailyChanges };
}

/* ============================================================
   LOAD & PREDICT
   ============================================================ */

  async function loadAndPredict(ticker, stockInfo) {
  // Check localStorage cache first (instant on same-day reload)
  const cached = loadCachedData(ticker);
  if (cached) {
    stockDataMap.set(ticker, cached);
    const pred = predictPrice(cached);
    if (pred) {
      pred.ticker = ticker;
      pred.stockName = stockInfo?.name || ticker;
      pred.targetDate = new Date();
      pred.targetDate.setDate(pred.targetDate.getDate() + PREDICTION_DAYS);
      predictions.set(ticker, pred);
    }
    return { data: cached, prediction: pred };
  }
  // Skip API call if running locally (file:// protocol)
  if (window.location.protocol === 'file:') {
    console.log('Local mode detected, using simulated data');
    const fallbackData = generateFallbackData(ticker);
    stockDataMap.set(ticker, fallbackData);
    const localPred = predictPrice(fallbackData);
    if (localPred) {
      localPred.ticker = ticker;
      localPred.stockName = stockInfo?.name || ticker;
      localPred.targetDate = new Date();
      localPred.targetDate.setDate(localPred.targetDate.getDate() + PREDICTION_DAYS);
      predictions.set(ticker, localPred);
    }
    return { data: fallbackData, prediction: localPred };
  }
  let data;
  try {
    data = await fetchStockData(ticker);
  } catch (e) {
    console.warn(`API failed for ${ticker}, using fallback:`, e.message);
    data = generateFallbackData(ticker);
  }

  stockDataMap.set(ticker, data);

  const pred = predictPrice(data);
  if (pred) {
    pred.ticker = ticker;
    pred.stockName = stockInfo?.name || ticker;
    pred.targetDate = new Date();
    pred.targetDate.setDate(pred.targetDate.getDate() + PREDICTION_DAYS);
    predictions.set(ticker, pred);
    saveCachedData(ticker, data);
  }

   return { data, prediction: pred };
}

/* ============================================================
   COMPARE VIEW
   ============================================================ */

const COMPARE_METRICS = [
  { key: '15d预测', fn: (p) => '¥' + formatPrice(p.predictedPrice), better: 'higher' },
  { key: '涨跌幅', fn: (p) => formatPercent(p.changePercent), better: 'higher' },
  { key: '上涨概率', fn: (p) => p.risk ? p.risk.probabilityUp + '%' : '--', better: 'higher' },
  { key: '最大回撤', fn: (p) => p.risk ? p.risk.maxDrawdown + '%' : '--', better: 'higher' },
  { key: '夏普比率', fn: (p) => p.risk ? p.risk.sharpeRatio : '--', better: 'higher' },
  { key: '波动率', fn: (p) => p.risk ? p.risk.annualVolatility + '%' : '--', better: 'lower' },
  { key: '可信度', fn: (p) => p.confidence + '%', better: 'higher' },
];

function toggleCompare(ticker) {
  const idx = compareList.indexOf(ticker);
  if (idx > -1) {
    compareList.splice(idx, 1);
  } else {
    if (compareList.length >= 2) compareList.shift();
    compareList.push(ticker);
  }
  renderCards();
  updateCompareBadge();
}

function updateCompareBadge() {
  const badge = document.getElementById('compareBadge');
  if (!badge) return;
  const tickersEl = document.getElementById('compareTickers');
  if (compareList.length === 2) {
    const names = compareList.map(t => {
      const info = STOCKS.find(s => s.ticker === t);
      return info ? info.name : t;
    });
    tickersEl.textContent = names.join(' vs ');
    badge.classList.add('active');
  } else {
    badge.classList.remove('active');
  }
}

function openCompare() {
  if (compareList.length !== 2) return;
  const p1 = predictions.get(compareList[0]);
  const p2 = predictions.get(compareList[1]);
  if (!p1 || !p2) return;
  const info1 = STOCKS.find(s => s.ticker === compareList[0]) || { name: compareList[0], ticker: compareList[0] };
  const info2 = STOCKS.find(s => s.ticker === compareList[1]) || { name: compareList[1], ticker: compareList[1] };
  document.getElementById('c1Name').textContent = info1.name;
  document.getElementById('c1Ticker').textContent = compareList[0];
  document.getElementById('c1Price').textContent = '¥' + formatPrice(p1.currentPrice);
  document.getElementById('c2Name').textContent = info2.name;
  document.getElementById('c2Ticker').textContent = compareList[1];
  document.getElementById('c2Price').textContent = '¥' + formatPrice(p2.currentPrice);
  const c1m = document.getElementById('c1Metrics');
  const c2m = document.getElementById('c2Metrics');
  let h1 = '', h2 = '', win1 = 0, win2 = 0;
  COMPARE_METRICS.forEach(m => {
    const v1 = m.fn(p1), v2 = m.fn(p2);
    let c1 = '', c2 = '';
    if (m.better && v1 !== '--' && v2 !== '--') {
      const n1 = parseFloat(v1), n2 = parseFloat(v2);
      if (!isNaN(n1) && !isNaN(n2)) {
        if (m.better === 'higher') {
          if (n1 > n2) win1++; else if (n2 > n1) win2++;
          c1 = n1 > n2 ? 'better' : n1 < n2 ? 'worse' : '';
          c2 = n2 > n1 ? 'better' : n2 < n1 ? 'worse' : '';
        } else {
          if (n1 < n2) win1++; else if (n2 < n1) win2++;
          c1 = n1 < n2 ? 'better' : n1 > n2 ? 'worse' : '';
          c2 = n2 < n1 ? 'better' : n2 > n1 ? 'worse' : '';
        }
      }
    }
    h1 += '<div class="compare-row"><span class="c-label">' + m.key + '</span><span class="c-value ' + c1 + '">' + v1 + '</span></div>';
    h2 += '<div class="compare-row"><span class="c-label">' + m.key + '</span><span class="c-value ' + c2 + '">' + v2 + '</span></div>';
  });
  c1m.innerHTML = h1;
  c2m.innerHTML = h2;
  // Highlight best pick with green border + badge
  const col1 = document.getElementById('compareCol1');
  const col2 = document.getElementById('compareCol2');
  col1.classList.remove('recommended');
  col2.classList.remove('recommended');
  let b1 = document.getElementById('c1Recommend');
  let b2 = document.getElementById('c2Recommend');
  if (!b1) { b1 = document.createElement('div'); b1.id = 'c1Recommend'; b1.className = 'c-recommend'; document.querySelector('#compareCol1 .compare-col-header').appendChild(b1); }
  if (!b2) { b2 = document.createElement('div'); b2.id = 'c2Recommend'; b2.className = 'c-recommend'; document.querySelector('#compareCol2 .compare-col-header').appendChild(b2); }
  b1.textContent = ''; b2.textContent = '';
  if (win1 > win2) { col1.classList.add('recommended'); b1.textContent = '推荐'; }
  else if (win2 > win1) { col2.classList.add('recommended'); b2.textContent = '推荐'; }
  document.getElementById('compareOverlay').classList.add('active');
}

function closeCompare() {
  document.getElementById('compareOverlay').classList.remove('active');
}

/* ============================================================
   UI RENDERING
   ============================================================ */

function formatPrice(price) {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 10) return price.toFixed(2);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function formatPercent(pct) {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function getConfidenceLabel(score) {
  if (score >= 70) return { label: '较高', cls: 'high' };
  if (score >= 40) return { label: '中等', cls: 'medium' };
  return { label: '较低', cls: 'low' };
}

function getTrendClass(changePercent) {
  if (changePercent > 1) return 'up';
  if (changePercent < -1) return 'down';
  return 'neutral';
}

function renderCards() {
  const grid = document.getElementById('stockGrid');
  const stockInfos = new Map(STOCKS.map(s => [s.ticker, s]));

  grid.innerHTML = activeTickers.map((ticker, idx) => {
    const info = stockInfos.get(ticker) || { ticker, name: ticker };
    const pred = predictions.get(ticker);

    if (!pred) {
      return `
        <div class="stock-card sk-card" data-ticker="${ticker}">
          <div class="card-header">
            <div class="sk sk-line sk-name"></div>
            <div class="sk sk-tick"></div>
          </div>
          <div class="card-body">
            <div class="sk-block price-sk">
              <div class="sk sk-lg"></div>
              <div class="sk sk-sm" style="width:40%"></div>
            </div>
            <div class="sk-block pred-sk">
              <div class="sk sk-xs"></div>
              <div class="sk sk-md"></div>
              <div class="sk sk-sm" style="width:50%"></div>
            </div>
          </div>
          <div class="card-footer">
            <div class="sk sk-bar"></div>
            <div class="sk sk-xs" style="width:30%"></div>
          </div>
        </div>
      `;
    }

    const trendCls = getTrendClass(pred.changePercent);
    const conf = getConfidenceLabel(pred.confidence);
    const predDateStr = `${pred.targetDate.getMonth() + 1}/${pred.targetDate.getDate()}`;
    const todayChange = pred.currentPrice;
    const todayChangePct = '(实时)';

    return `
      <div class="stock-card" data-ticker="${ticker}" style="animation-delay:${idx * 0.04}s">
        <div class="trend-indicator ${trendCls}"></div>
        <button class="compare-btn-card" onclick="event.stopPropagation(); toggleCompare('${ticker}')" title="加入对比">+</button>
        <button class="remove-btn" onclick="removeStock('${ticker}')" title="移除">&#10005;</button>
        <div class="card-header">
          <span class="stock-name">${info.name}</span>
          <span class="stock-ticker">${ticker}</span>
        </div>
        <div class="card-body">
          <div class="price-section">
            <div class="current-price">¥${formatPrice(pred.currentPrice)}</div>
            <div class="current-change ${trendCls === 'neutral' ? '' : trendCls}">
              ${trendCls === 'up' ? '▲' : trendCls === 'down' ? '▼' : '―'} ${todayChangePct}
            </div>
          </div>
          <div class="prediction-section">
            <div class="prediction-label">15天后预测</div>
            <div class="predicted-price">¥${formatPrice(pred.predictedPrice)}</div>
            <div class="predicted-change ${trendCls}">
              ${formatPercent(pred.changePercent)}
            </div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:6px;display:flex;gap:8px;justify-content:flex-end;">
              <span>明日 ${pred.predictions ? formatPercent(pred.predictions['1d'].changePercent) : '--'}</span>
              <span>5日 ${pred.predictions ? formatPercent(pred.predictions['5d'].changePercent) : '--'}</span>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="confidence-bar">
            <span>可信度</span>
            <div class="bar-track">
              <div class="bar-fill ${conf.cls}" style="width:${pred.confidence}%"></div>
            </div>
            <span>${conf.label}</span>
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);">&#128197; ${predDateStr}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-secondary);margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color);">
          <span>上涨概率 <span style="font-weight:600;color:${pred.risk && pred.risk.probabilityUp > 50 ? 'var(--accent-green)' : 'var(--accent-red)'}">${pred.risk ? pred.risk.probabilityUp + '%' : '--'}</span></span>
          <span>波动率 ${pred.risk ? pred.risk.annualVolatility + '%' : '--'}</span>
          <span>最大回撤 <span style="color:var(--accent-red)">${pred.risk ? pred.risk.maxDrawdown + '%' : '--'}</span></span>
        </div>
        <div class="loading-overlay"><div class="spinner"></div></div>
      </div>
    `;
  }).join('');

  // Click to open chart
  grid.querySelectorAll('.stock-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.remove-btn')) return;
      const ticker = card.dataset.ticker;
      openDetail(ticker);
    });
  });

  updateStatus();
}

function renderEmptyState() {
  const grid = document.getElementById('stockGrid');
  grid.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">&#128200;</span>
      <h3>还没有添加任何股票</h3>
      <p>在上方搜索框中搜索股票代码添加</p>
    </div>
  `;
}

function updateStatus() {
  const el = document.getElementById('updateInfo');
  if (!el) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });

  if (isRefreshing) {
    const loaded = predictions.size;
    const total = activeTickers.length;
    el.innerHTML = '<span class="dot loading"></span> 加载中 ' + loaded + '/' + total;
    return;
  }

  // Count how many have predictions
  const loaded = predictions.size;
  const total = activeTickers.length;
  const hasError = loaded < total;

  if (loaded === 0) {
    el.innerHTML = '<span class="dot"></span> 准备就绪';
    return;
  }

  const dotCls = hasError ? 'error' : '';
  el.innerHTML = `<span class="dot ${dotCls}"></span> ${loaded}/${total} 已更新 &#8226; ${timeStr}`;
}

/* ============================================================
   DETAIL MODAL (Chart)
   ============================================================ */

function openDetail(ticker) {
  const data = stockDataMap.get(ticker);
  const pred = predictions.get(ticker);
  if (!data || !pred) return;

  const info = STOCKS.find(s => s.ticker === ticker) || { ticker, name: ticker };
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modalContent');

  // Stats
  const conf = getConfidenceLabel(pred.confidence);
  const trendCls = getTrendClass(pred.changePercent);

  document.getElementById('modalTitle').innerHTML = `${info.name} <span class="ticker">(${ticker})</span>`;
  document.getElementById('modalCurrentPrice').textContent = `¥${formatPrice(pred.currentPrice)}`;
  document.getElementById('modalPred1d').textContent = (pred.predictions ? '¥' + formatPrice(pred.predictions['1d'].price) + ' (' + formatPercent(pred.predictions['1d'].changePercent) + ')' : '--');
  document.getElementById('modalPred5d').textContent = (pred.predictions ? '¥' + formatPrice(pred.predictions['5d'].price) + ' (' + formatPercent(pred.predictions['5d'].changePercent) + ')' : '--');
  document.getElementById('modalPredictedPrice').textContent = `¥${formatPrice(pred.predictedPrice)}`;
  document.getElementById('modalChange').textContent = formatPercent(pred.changePercent);
  document.getElementById('modalChange').className = `stat-value ${trendCls}`;
  document.getElementById('modalConfidence').textContent = `${pred.confidence}% (${conf.label})`;
  document.getElementById('modalVolatility').textContent = `${(pred.volatility * 100).toFixed(1)}%`;
  document.getElementById('modalProbUp').textContent = (pred.risk ? pred.risk.probabilityUp + '%' : '--');
  document.getElementById('modalProbUp').className = 'stat-value ' + (pred.risk && pred.risk.probabilityUp > 50 ? 'up' : 'down');
  document.getElementById('modalMaxDrawdown').textContent = (pred.risk ? pred.risk.maxDrawdown + '%' : '--');
  document.getElementById('modalMaxDrawdown').className = 'stat-value down';
  document.getElementById('modalSharpe').textContent = (pred.risk ? pred.risk.sharpeRatio : '--');
  document.getElementById('modalSharpe').className = 'stat-value ' + (pred.risk && pred.risk.sharpeRatio > 0.5 ? 'up' : (pred.risk && pred.risk.sharpeRatio > 0 ? '' : 'down'));
  document.getElementById('modalVaR').textContent = (pred.risk ? pred.risk.valueAtRisk95 + '%' : '--');
  document.getElementById('modalVaR').className = 'stat-value down';

  overlay.classList.add('active');

  // Chart
  renderChart(data, pred, ticker, info.name);
}

function closeDetail() {
  document.getElementById('modalOverlay').classList.remove('active');
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function renderChart(data, pred, ticker, name) {
  const canvas = document.getElementById('stockChart');
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const n = data.prices.length;

  // Use last 60 days for the chart window, plus prediction
  const window = Math.min(n, 60);
  const chartPrices = data.prices.slice(n - window);
  const chartDates = data.dates.slice(n - window).map(d =>
    `${d.getMonth() + 1}/${d.getDate()}`
  );

  // Prediction line extends from end of historical
  const lastDate = new Date(data.dates[n - 1]);
  const predDates = pred.predictedDates.map((_, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // Build a single labels array with the split point
  const labels = [...chartDates, ...predDates];

  const historicalDataset = {
    label: `${ticker} 历史价格`,
    data: chartPrices.map((p, i) => ({ x: i, y: p })),
    borderColor: '#4a8cff',
    backgroundColor: 'rgba(74, 140, 255, 0.08)',
    fill: true,
    tension: 0.2,
    pointRadius: 0,
    borderWidth: 2,
  };

  // For prediction: build data with null for historical portion and values for future
  const fullPredData = new Array(chartPrices.length).fill(null)
    .concat(pred.predictedPrices.map((p, i) => ({ x: chartPrices.length + i, y: p })));

  const predictionDataset = {
    label: `${ticker} 15日预测`,
    data: fullPredData.map((v, i) => v ? { x: i, y: v.y } : { x: i, y: null }),
    borderColor: 'rgba(248, 113, 113, 0.9)',
    backgroundColor: 'rgba(248, 113, 113, 0.06)',
    borderDash: [6, 3],
    fill: true,
    tension: 0.2,
    pointRadius: 0,
    borderWidth: 2,
    spanGaps: false,
  };

  // Current price horizontal line
  const currentPriceLine = {
    label: '当前价格',
    data: chartPrices.map((p, i) => ({ x: i, y: pred.currentPrice })),
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderDash: [4, 4],
    pointRadius: 0,
    borderWidth: 1,
    fill: false,
  };

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [historicalDataset, predictionDataset, currentPriceLine],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#8895a7',
            boxWidth: 20,
            padding: 16,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: '#1a212b',
          borderColor: '#2a3340',
          borderWidth: 1,
          titleColor: '#e8edf5',
          bodyColor: '#8895a7',
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#5a6778',
            maxTicksLimit: 15,
            font: { size: 11 },
          },
          grid: {
            color: 'rgba(42, 51, 64, 0.3)',
          },
        },
        y: {
          ticks: {
            color: '#5a6778',
            font: { size: 11 },
            callback: v => '¥' + v.toFixed(0),
          },
          grid: {
            color: 'rgba(42, 51, 64, 0.3)',
          },
        },
      },
    },
  });

  // Draw vertical separator line between history and prediction
  // We can annotate with a plugin if needed, or just rely on the color change
}

/* ============================================================
   REFRESH / LOAD ALL
   ============================================================ */

async function refreshAll() {
  if (isRefreshing) return;
  isRefreshing = true;

  const btn = document.getElementById('refreshBtn');
  if (btn) btn.disabled = true;

  updateStatus();

  const stockInfos = new Map(STOCKS.map(s => [s.ticker, s]));

  // Load in batches to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < activeTickers.length; i += batchSize) {
    const batch = activeTickers.slice(i, i + batchSize);
    const promises = batch.map(ticker =>
      loadAndPredict(ticker, stockInfos.get(ticker))
        .catch(err => {
          console.error(`Failed to load ${ticker}:`, err);
          return null;
        })
    );
    await Promise.all(promises);
    // Small delay between batches
    if (i + batchSize < activeTickers.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  renderCards();

  isRefreshing = false;
  if (btn) btn.disabled = false;
  updateStatus();
}

/* ============================================================
   SEARCH
   ============================================================ */

function initSearch() {
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('searchSuggestions');

  input.addEventListener('input', () => {
    const q = input.value.trim().toUpperCase();
    if (!q) {
      suggestions.classList.remove('active');
      return;
    }

    const matches = SEARCH_INDEX.filter(s =>
      s.ticker.includes(q) || s.name.toUpperCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      suggestions.classList.remove('active');
      return;
    }

    suggestions.innerHTML = matches.map(s => {
      const alreadyAdded = activeTickers.includes(s.ticker);
      return `
        <div class="suggestion-item ${alreadyAdded ? 'disabled' : ''}"
             data-ticker="${s.ticker}"
             onclick="addStock('${s.ticker}')">
          <span class="ticker">${s.ticker}</span>
          <span class="name">${s.name} ${alreadyAdded ? '(已添加)' : ''}</span>
        </div>
      `;
    }).join('');
    suggestions.classList.add('active');
  });

  input.addEventListener('blur', () => {
    setTimeout(() => suggestions.classList.remove('active'), 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = suggestions.querySelector('.suggestion-item:not(.disabled)');
      if (first) {
        first.click();
      }
    }
  });
}

function addStock(ticker) {
  if (activeTickers.includes(ticker)) return;
  const exists = SEARCH_INDEX.find(s => s.ticker === ticker);
  if (!exists) return;

  activeTickers.push(ticker);
  saveCachedTickers(activeTickers);
  document.getElementById('searchInput').value = '';
  document.getElementById('searchSuggestions').classList.remove('active');

  // Add to STOCKS list if not there
  if (!STOCKS.find(s => s.ticker === ticker)) {
    STOCKS.push({ ticker, name: exists.name.split(' / ')[0] || ticker });
  }

  // Load data immediately
  const info = STOCKS.find(s => s.ticker === ticker);
  renderCards();
  loadAndPredict(ticker, info).then(() => renderCards());
}

function removeStock(ticker) {
  const idx = activeTickers.indexOf(ticker);
  if (idx > -1) {
    activeTickers.splice(idx, 1);
    predictions.delete(ticker);
    stockDataMap.delete(ticker);
  }

  if (activeTickers.length === 0) {
    renderEmptyState();
  } else {
    renderCards();
  }
  saveCachedTickers(activeTickers);
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const savedTickers = loadCachedTickers();
  if (savedTickers && savedTickers.length > 0) {
    activeTickers = savedTickers;
  }
  initSearch();
  renderCards();
  refreshAll();

  // Modal close
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetail();
  });
  document.getElementById('modalCloseBtn').addEventListener('click', closeDetail);

  // Keyboard ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', refreshAll);
  document.getElementById('compareBtn').addEventListener('click', openCompare);
  document.getElementById('compareClearBtn').addEventListener('click', () => { compareList = []; renderCards(); updateCompareBadge(); });
  document.getElementById('compareCloseBtn').addEventListener('click', closeCompare);
  document.getElementById('compareOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCompare(); });
});

/* ============================================================
   EXPOSE (global functions for onclick handlers)
   ============================================================ */

window.addStock = addStock;
window.removeStock = removeStock;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.toggleCompare = toggleCompare;
window.openCompare = openCompare;
window.closeCompare = closeCompare;
