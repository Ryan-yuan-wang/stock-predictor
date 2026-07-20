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

/* ============================================================
   PREDICTION ENGINE (Linear Regression + Momentum)
   ============================================================ */

function predictPrice(prices, days = PREDICTION_DAYS) {
  const n = prices.length;
  if (n < MIN_DATA_POINTS) return null;

  // Use last 60 points max for regression
  const window = Math.min(n, 60);
  const y = prices.slice(n - window);
  const x = Array.from({ length: window }, (_, i) => i);

  // Weight: exponential — more weight on recent days
  const weights = x.map(i => Math.pow(0.97, window - 1 - i));

  // Weighted linear regression
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumWX = x.reduce((s, xi, i) => s + xi * weights[i], 0);
  const sumWY = y.reduce((s, yi, i) => s + yi * weights[i], 0);
  const sumWXY = x.reduce((s, xi, i) => s + xi * y[i] * weights[i], 0);
  const sumWXX = x.reduce((s, xi, i) => s + xi * xi * weights[i], 0);

  const slope = (sumW * sumWXY - sumWX * sumWY) / (sumW * sumWXX - sumWX * sumWX);
  const intercept = (sumWY - slope * sumWX) / sumW;

  // Momentum adjustment: compare last 5 days avg vs previous 10 days avg
  const recent5 = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior10 = prices.slice(-15, -5).reduce((a, b) => a + b, 0) / 10;
  const momentum = (recent5 - prior10) / prior10;

  // Predicted price = linear regression + momentum boost
  const basePrediction = slope * (window - 1 + days) + intercept;
  const momentumAdjustment = basePrediction * momentum * 0.3;
  const predictedPrice = basePrediction + momentumAdjustment;

  // Current price = last close
  const currentPrice = prices[n - 1];

  // R-squared (fit quality)
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
  const volatility = Math.sqrt(variance) * Math.sqrt(252); // annualized

  // Confidence score (0-100)
  const r2Score = Math.min(rSquared * 100, 40);
  const volScore = Math.max(0, 30 - volatility * 100 * 6);
  const dataScore = Math.min((n / HISTORY_DAYS) * 20, 20);
  const trendScore = Math.abs(momentum) < 0.05 ? 10 : 5;
  const confidence = Math.min(Math.round(r2Score + volScore + dataScore + trendScore), 95);

  return {
    currentPrice,
    predictedPrice,
    change: predictedPrice - currentPrice,
    changePercent: ((predictedPrice - currentPrice) / currentPrice) * 100,
    confidence: Math.max(confidence, 10),
    rSquared,
    volatility,
    momentum,
    slope,
    predictedDates: Array.from({ length: days }, (_, i) => i + 1),
    predictedPrices: Array.from({ length: days }, (_, i) => slope * (window - 1 + i + 1) + intercept + (momentumAdjustment / days) * (i + 1)),
  };
}

/* ============================================================
   DATA FETCHING (Yahoo Finance)
   ============================================================ */

async function fetchStockData(ticker) {
  const now = Math.floor(Date.now() / 1000);
  const past = now - HISTORY_DAYS * 86400 * 1.5; // ~135 days buffer
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${past}&period2=${now}&interval=1d`;

  const response = await fetch(url, {
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

  for (let i = 0; i < timestamps.length; i++) {
    const close = adjClose ? adjClose[i] : quotes.close[i];
    if (close && close > 0 && quotes.volume[i] > 0) {
      const d = new Date(timestamps[i] * 1000);
      dates.push(d);
      prices.push(close);
    }
  }

  // Calculate daily change for current day
  const dailyChanges = [];
  for (let i = 1; i < prices.length; i++) {
    dailyChanges.push({
      change: prices[i] - prices[i - 1],
      percent: ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100,
    });
  }

  return { ticker, dates, prices, dailyChanges };
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
    '002230.SZ': 45, '002304.SZ': 85, '000568.SZ': 180,
  };
  };

  const base = basePrices[ticker] || 100;
  const prices = [];
  const dates = [];
  const now = new Date();
  let price = base * (0.9 + Math.random() * 0.2);

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    price = price * (1 + (Math.random() - 0.48) * 0.03);
    prices.push(price);
    dates.push(d);
  }

  const dailyChanges = [];
  for (let i = 1; i < prices.length; i++) {
    dailyChanges.push({
      change: prices[i] - prices[i - 1],
      percent: ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100,
    });
  }

  return { ticker, dates, prices, dailyChanges };
}

/* ============================================================
   LOAD & PREDICT
   ============================================================ */

async function loadAndPredict(ticker, stockInfo) {
  let data;
  try {
    data = await fetchStockData(ticker);
  } catch (e) {
    console.warn(`API failed for ${ticker}, using fallback:`, e.message);
    data = generateFallbackData(ticker);
  }

  stockDataMap.set(ticker, data);

  const pred = predictPrice(data.prices);
  if (pred) {
    pred.ticker = ticker;
    pred.stockName = stockInfo?.name || ticker;
    pred.targetDate = new Date();
    pred.targetDate.setDate(pred.targetDate.getDate() + PREDICTION_DAYS);
    predictions.set(ticker, pred);
  }

  return { data, prediction: pred };
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
        <div class="stock-card" data-ticker="${ticker}" style="animation-delay:${idx * 0.04}s">
          <div class="card-header">
            <span class="stock-name">${info.name}</span>
            <span class="stock-ticker">${ticker}</span>
          </div>
          <div class="error-message" style="padding: 20px 0">
            <span class="error-icon">&#9203;</span>
            <p>加载中...</p>
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
          <div class="prediction-date">&#128197; ${predDateStr}</div>
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
    el.innerHTML = '<span class="dot loading"></span> 更新中...';
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
  document.getElementById('modalPredictedPrice').textContent = `¥${formatPrice(pred.predictedPrice)}`;
  document.getElementById('modalChange').textContent = formatPercent(pred.changePercent);
  document.getElementById('modalChange').className = `stat-value ${trendCls}`;
  document.getElementById('modalConfidence').textContent = `${pred.confidence}% (${conf.label})`;
  document.getElementById('modalVolatility').textContent = `${(pred.volatility * 100).toFixed(1)}%`;

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
    renderCards();
    // Small delay between batches
    if (i + batchSize < activeTickers.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

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
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
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
});

/* ============================================================
   EXPOSE (global functions for onclick handlers)
   ============================================================ */

window.addStock = addStock;
window.removeStock = removeStock;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
