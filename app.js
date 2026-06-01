'use strict';

/* ── 상태 ── */
let currentMarket = 'us';
let currentSymbol = null;
let screenerMarket = 'us';
let perMarket = 'us';
let watchMarket = 'us';
let priceChart = null;
let volumeChart = null;
let searchTimer = null;
const watchlist = { us: [], kr: [] };

/* ── 한국 종목 내장 테이블 (한글 검색용) ── */
const KR_STOCKS = [
  { code:'005930', name:'삼성전자' }, { code:'000660', name:'SK하이닉스' },
  { code:'373220', name:'LG에너지솔루션' }, { code:'207940', name:'삼성바이오로직스' },
  { code:'005380', name:'현대차' }, { code:'051910', name:'LG화학' },
  { code:'006400', name:'삼성SDI' }, { code:'035420', name:'NAVER' },
  { code:'003550', name:'LG' }, { code:'105560', name:'KB금융' },
  { code:'055550', name:'신한지주' }, { code:'032830', name:'삼성생명' },
  { code:'028260', name:'삼성물산' }, { code:'012330', name:'현대모비스' },
  { code:'000270', name:'기아' }, { code:'096770', name:'SK이노베이션' },
  { code:'034020', name:'두산에너빌리티' }, { code:'010130', name:'고려아연' },
  { code:'011200', name:'HMM' }, { code:'000810', name:'삼성화재' },
  { code:'003490', name:'대한항공' }, { code:'051900', name:'LG생활건강' },
  { code:'066570', name:'LG전자' }, { code:'011170', name:'롯데케미칼' },
  { code:'005490', name:'POSCO홀딩스' }, { code:'004020', name:'현대제철' },
  { code:'017670', name:'SK텔레콤' }, { code:'030200', name:'KT' },
  { code:'033780', name:'KT&G' }, { code:'009540', name:'HD한국조선해양' },
  { code:'011070', name:'LG이노텍' }, { code:'139480', name:'이마트' },
  { code:'086790', name:'하나금융지주' }, { code:'271560', name:'오리온' },
  { code:'097950', name:'CJ제일제당' }, { code:'010950', name:'S-Oil' },
  { code:'035720', name:'카카오' }, { code:'003670', name:'포스코퓨처엠' },
  { code:'006800', name:'미래에셋증권' }, { code:'001680', name:'대상' },
  { code:'004990', name:'롯데지주' }, { code:'024110', name:'기업은행' },
  { code:'000100', name:'유한양행' }, { code:'002790', name:'아모레퍼시픽그룹' },
  { code:'068270', name:'셀트리온' }, { code:'036570', name:'NC소프트' },
  { code:'259960', name:'크래프톤' }, { code:'352820', name:'하이브' },
  { code:'041510', name:'SM엔터테인먼트' }, { code:'035900', name:'JYP엔터테인먼트' },
  { code:'122870', name:'와이지엔터테인먼트' }, { code:'015760', name:'한국전력' },
  { code:'042700', name:'한미반도체' }, { code:'000720', name:'현대건설' },
  { code:'009150', name:'삼성전기' }, { code:'005830', name:'DB손해보험' },
  { code:'078930', name:'GS' }, { code:'009830', name:'한화솔루션' },
  { code:'012450', name:'한화에어로스페이스' }, { code:'000880', name:'한화' },
  { code:'023530', name:'롯데쇼핑' }, { code:'004170', name:'신세계' },
  { code:'000080', name:'하이트진로' }, { code:'008770', name:'호텔신라' },
  { code:'030000', name:'제일기획' }, { code:'047810', name:'한국항공우주' },
  { code:'011780', name:'금호석유' }, { code:'001040', name:'CJ' },
  { code:'000120', name:'CJ대한통운' }, { code:'035250', name:'강원랜드' },
  { code:'047050', name:'포스코인터내셔널' }, { code:'028050', name:'삼성엔지니어링' },
  { code:'267250', name:'HD현대' }, { code:'010140', name:'삼성중공업' },
  { code:'329180', name:'현대중공업' }, { code:'000990', name:'DB하이텍' },
  { code:'251270', name:'넷마블' }, { code:'263750', name:'펄어비스' },
  { code:'293490', name:'카카오게임즈' }, { code:'035760', name:'CJ ENM' },
  { code:'006360', name:'GS건설' }, { code:'000210', name:'DL' },
  { code:'007070', name:'GS리테일' }, { code:'016360', name:'삼성증권' },
  { code:'005940', name:'NH투자증권' }, { code:'071050', name:'한국금융지주' },
  { code:'326030', name:'SK바이오팜' }, { code:'302440', name:'SK바이오사이언스' },
  { code:'145020', name:'휴젤' }, { code:'196170', name:'알테오젠' },
  { code:'005870', name:'휴니드테크놀러지스' }, { code:'000990', name:'DB하이텍' },
];

/* ── 미국 스크리너 종목 영문명 ── */
const US_NAMES = {
  'AAPL':'Apple','MSFT':'Microsoft','NVDA':'NVIDIA','AMZN':'Amazon','META':'Meta Platforms',
  'GOOGL':'Alphabet','LLY':'Eli Lilly','AVGO':'Broadcom','TSLA':'Tesla','WMT':'Walmart',
  'JPM':'JPMorgan Chase','V':'Visa','UNH':'UnitedHealth','XOM':'ExxonMobil','ORCL':'Oracle',
  'MA':'Mastercard','COST':'Costco','HD':'Home Depot','PG':'Procter & Gamble','JNJ':'Johnson & Johnson',
  'ABBV':'AbbVie','BAC':'Bank of America','KO':'Coca-Cola','MRK':'Merck','CVX':'Chevron',
  'NFLX':'Netflix','AMD':'AMD','PEP':'PepsiCo','TMO':'Thermo Fisher','ADBE':'Adobe',
  'CRM':'Salesforce','ACN':'Accenture','MCD':"McDonald's",'ABT':'Abbott','WFC':'Wells Fargo',
  'PM':'Philip Morris','TXN':'Texas Instruments','NEE':'NextEra Energy','ISRG':'Intuitive Surgical','IBM':'IBM',
  'CAT':'Caterpillar','AMGN':'Amgen','INTU':'Intuit','GS':'Goldman Sachs','SPGI':'S&P Global',
  'MS':'Morgan Stanley','BLK':'BlackRock','AXP':'American Express','NOW':'ServiceNow','BSX':'Boston Scientific',
  'SCHW':'Charles Schwab','ZTS':'Zoetis','PANW':'Palo Alto Networks','ETN':'Eaton','SO':'Southern Company',
  'HCA':'HCA Healthcare','LRCX':'Lam Research','KLAC':'KLA Corp','MU':'Micron','QCOM':'Qualcomm',
};

/* ── 스크리너 종목 목록 ── */
const US_SCREEN_LIST = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','LLY','AVGO','TSLA','WMT',
  'JPM','V','UNH','XOM','ORCL','MA','COST','HD','PG','JNJ',
  'ABBV','BAC','KO','MRK','CVX','NFLX','AMD','PEP','TMO','ADBE',
  'CRM','ACN','MCD','ABT','WFC','PM','TXN','NEE','ISRG','IBM',
  'CAT','AMGN','INTU','GS','SPGI','MS','BLK','AXP','NOW','BSX',
  'SCHW','ZTS','PANW','ETN','SO','HCA','LRCX','KLAC','MU','QCOM'
];

const KR_SCREEN_LIST = [
  '005930.KS','000660.KS','373220.KS','207940.KS','005380.KS',
  '051910.KS','006400.KS','035420.KS','003550.KS','105560.KS',
  '055550.KS','032830.KS','028260.KS','012330.KS','000270.KS',
  '096770.KS','034020.KS','010130.KS','011200.KS','000810.KS',
  '003490.KS','051900.KS','066570.KS','011170.KS','005490.KS',
  '004020.KS','017670.KS','030200.KS','033780.KS','009540.KS',
  '011070.KS','139480.KS','086790.KS','271560.KS','097950.KS',
  '010950.KS','035720.KS','003670.KS','006800.KS','010060.KS',
  '001680.KS','004990.KS','024110.KS','000100.KS','002790.KS'
];

/* ── Flask 서버 (ngrok) ── */
const _V = 14; // version
const SERVER = 'https://bucked-swaddling-revenge.ngrok-free.dev';
const HDR = { 'ngrok-skip-browser-warning': '1' };

async function apiFetch(path) {
  const res = await fetch(SERVER + path, { headers: HDR });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d;
}

async function fetchQuote(symbol) {
  return apiFetch(`/quote?symbol=${encodeURIComponent(symbol)}`);
}

async function fetchChart(symbol) {
  return apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=6mo&interval=1d`);
}

async function fetchSearch(query) {
  const q = query.trim();
  const data = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
  const quotes = data.quotes || [];
  return quotes.map(item => ({
    symbol:  item.symbol,
    name:    item.name,
    display: item.symbol.replace(/\.(KS|KQ)$/, ''),
  }));
}

/* ── 기술적 지표 계산 ── */
function clean(arr) { return (arr || []).map(v => v ?? null).filter(v => v !== null); }

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i-1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period+1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    avgGain = (avgGain*(period-1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss*(period-1) + Math.max(-d, 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
}

function emaSeries(data, period) {
  const k = 2 / (period + 1);
  const out = [data[0]];
  for (let i = 1; i < data.length; i++) out.push(data[i] * k + out[i-1] * (1-k));
  return out;
}

function calcMACD(closes) {
  if (closes.length < 35) return { bullish: false, golden: false };
  const e12 = emaSeries(closes, 12);
  const e26 = emaSeries(closes, 26);
  const macd = e12.map((v, i) => v - e26[i]);
  const sig  = emaSeries(macd.slice(25), 9);
  const n    = sig.length - 1;
  const mn   = macd[macd.length-1];
  const mp   = macd[macd.length-2] ?? mn;
  const sn   = sig[n];
  const sp   = sig[n-1] ?? sn;
  return { bullish: mn > sn, golden: mn > sn && mp <= sp };
}

function calcMA(closes, period) {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a,b) => a+b, 0) / period;
}

function calcBBSeries(closes, period = 20) {
  const upper = [], mid = [], lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1).filter(v => v != null);
    if (slice.length < period) { upper.push(null); mid.push(null); lower.push(null); continue; }
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std  = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    mid.push(parseFloat(mean.toFixed(2)));
    upper.push(parseFloat((mean + 2 * std).toFixed(2)));
    lower.push(parseFloat((mean - 2 * std).toFixed(2)));
  }
  return { upper, mid, lower };
}

function calcBB(closes, period = 20) {
  if (closes.length < period) return { above: false, squeeze: false };
  const slice = closes.slice(-period);
  const mean  = slice.reduce((a, b) => a + b, 0) / period;
  const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  const upper = mean + 2 * std;
  const lower = mean - 2 * std;
  const last  = closes[closes.length - 1];
  const bw    = mean > 0 ? (upper - lower) / mean : 1;

  // 과거 20일 밴드폭과 비교해 수축 여부 판단
  let histBw = 0;
  if (closes.length >= period * 2) {
    const prev = closes.slice(-period * 2, -period);
    const pm = prev.reduce((a, b) => a + b, 0) / period;
    const ps = Math.sqrt(prev.reduce((a, b) => a + (b - pm) ** 2, 0) / period);
    histBw = pm > 0 ? (pm + 2*ps - (pm - 2*ps)) / pm : 1;
  }

  return {
    above:   last > upper,
    below:   last < lower,
    squeeze: bw < histBw * 0.7 && bw < 0.12,
  };
}

function volRatio(volumes) {
  if (volumes.length < 21) return 1;
  const avg = volumes.slice(-21, -1).reduce((a,b) => a + (b||0), 0) / 20;
  return avg > 0 ? (volumes[volumes.length-1] || 0) / avg : 1;
}

function is52WkHigh(highs) {
  if (highs.length < 20) return false;
  const max = Math.max(...highs);
  return highs[highs.length-1] >= max * 0.98;
}

/* ── 성과 추적 ── */
const PERF_KEY = 'perf_history_v1';

function loadHistory() {
  try { const r = localStorage.getItem(PERF_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(PERF_KEY, JSON.stringify(h)); } catch {}
}

function saveScreenerHistory(results, market) {
  if (!results || !results.length) return;
  const history = loadHistory();
  history.unshift({
    id:     Date.now(),
    date:   new Date().toLocaleDateString('ko-KR'),
    ts:     Date.now(),
    market,
    stocks: results.slice(0, 20).map(r => ({
      ticker:              r.ticker,
      name:                r.name,
      entry_price:         r.price,
      score:               r.score,
      signals:             r.signals,
      rsi:                 r.rsi,
      vol_ratio:           r.vol_ratio,
      change_pct_at_entry: r.change_pct,
      golden:              r.golden,
      prices: {},
    })),
  });
  if (history.length > 30) history.splice(30);
  saveHistory(history);
}

async function updatePerfPrices() {
  const history = loadHistory();
  let updated = false;
  const btn = document.getElementById('perfUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 조회 중...'; }

  for (const session of history) {
    const daysPassed = (Date.now() - session.ts) / 864e5;
    for (const stock of session.stocks) {
      const sym = session.market === 'kr' ? stock.ticker + '.KS' : stock.ticker;
      if (!stock.prices.t1 && daysPassed >= 1.5) {
        try {
          const q = await apiFetch(`/quote?symbol=${encodeURIComponent(sym)}`);
          if (q && q.price) {
            stock.prices.t1 = {
              price:    q.price,
              gain_pct: parseFloat(((q.price - stock.entry_price) / stock.entry_price * 100).toFixed(2)),
              date:     new Date().toLocaleDateString('ko-KR'),
            };
            updated = true;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 250));
      }
      if (!stock.prices.t5 && daysPassed >= 7) {
        try {
          const q = await apiFetch(`/quote?symbol=${encodeURIComponent(sym)}`);
          if (q && q.price) {
            stock.prices.t5 = {
              price:    q.price,
              gain_pct: parseFloat(((q.price - stock.entry_price) / stock.entry_price * 100).toFixed(2)),
              date:     new Date().toLocaleDateString('ko-KR'),
            };
            updated = true;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 250));
      }
    }
  }

  if (updated) saveHistory(history);
  if (btn) { btn.disabled = false; btn.textContent = '↺ 업데이트'; }
  return history;
}

function resolveName(ticker, market) {
  if (market === 'kr') {
    const e = KR_STOCKS.find(s => s.code === ticker);
    return e ? e.name : ticker;
  }
  return US_NAMES[ticker] || ticker;
}

function analyzeFailure(stock) {
  const r = [];
  if (stock.rsi > 75) r.push('RSI 과매수 진입');
  if (stock.change_pct_at_entry > 5) r.push('당일 급등 후 진입');
  if (stock.signals.includes('BB 상단돌파') && stock.vol_ratio < 2) r.push('BB 돌파 거래량 미확인');
  if (stock.score <= 5) r.push('신호 강도 부족');
  if (!stock.golden && !stock.macd_bull) r.push('MACD 미확인');
  return r;
}

function getSignalStats(history) {
  const stats = {};
  for (const session of history) {
    for (const stock of session.stocks) {
      const t1 = stock.prices.t1;
      if (!t1) continue;
      const win = t1.gain_pct >= 2;
      for (const sig of (stock.signals || [])) {
        if (!stats[sig]) stats[sig] = { wins: 0, total: 0 };
        stats[sig].total++;
        if (win) stats[sig].wins++;
      }
    }
  }
  return Object.entries(stats)
    .filter(([, s]) => s.total >= 2)
    .map(([sig, s]) => ({ sig, wins: s.wins, total: s.total, rate: Math.round(s.wins / s.total * 100) }))
    .sort((a, b) => b.rate - a.rate);
}

function renderPerfTab(history) {
  const statsEl    = document.getElementById('perfStats');
  const sessionsEl = document.getElementById('perfSessions');
  const emptyEl    = document.getElementById('perfEmpty');
  const valid      = (history || []).filter(s => s.stocks && s.stocks.length);

  if (!valid.length) {
    emptyEl.classList.remove('hidden');
    statsEl.classList.add('hidden');
    sessionsEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');

  const sigStats = getSignalStats(history);
  if (sigStats.length) {
    statsEl.innerHTML = `<div class="perf-stats-title">시그널 승률 (T+1 기준, ≥2% 상승)</div>` +
      sigStats.map(s => {
        const col = s.rate >= 60 ? 'var(--green)' : s.rate >= 40 ? 'var(--gold)' : 'var(--red)';
        return `<div class="sig-stat-row">
          <span class="sig-stat-name">${escHtml(s.sig)}</span>
          <div class="sig-bar-wrap"><div class="sig-bar" style="width:${s.rate}%;background:${col}"></div></div>
          <span class="sig-stat-rate ${s.rate >= 60 ? 'up' : s.rate < 40 ? 'down' : ''}">${s.rate}%</span>
          <span class="sig-stat-cnt">${s.wins}/${s.total}</span>
        </div>`;
      }).join('');
    statsEl.classList.remove('hidden');
  } else {
    statsEl.classList.add('hidden');
  }

  sessionsEl.innerHTML = valid.map(session => {
    const measured = session.stocks.filter(s => s.prices.t1);
    const wins     = measured.filter(s => s.prices.t1.gain_pct >= 2);
    const pending  = session.stocks.filter(s => !s.prices.t1);
    const winRate  = measured.length ? Math.round(wins.length / measured.length * 100) : null;
    const avgGain  = measured.length
      ? (measured.reduce((a, s) => a + s.prices.t1.gain_pct, 0) / measured.length).toFixed(1)
      : null;
    const days = Math.floor((Date.now() - session.ts) / 864e5);
    const mkt  = session.market === 'us' ? '🇺🇸' : '🇰🇷';

    const stocksHtml = session.stocks.map(stock => {
      const t1 = stock.prices.t1;
      const t5 = stock.prices.t5;
      const isWin  = t1 && t1.gain_pct >= 2;
      const isLoss = t1 && t1.gain_pct < 0;
      const fails  = (t1 && t1.gain_pct < 2) ? analyzeFailure(stock) : [];
      const scoreCls = stock.score >= 10 ? 'score-s' : stock.score >= 7 ? 'score-a' : 'score-b';
      const displayName = resolveName(stock.ticker, session.market);
      return `<div class="perf-stock ${isWin ? 'win' : isLoss ? 'loss' : ''}">
        <div class="perf-stock-top">
          <div class="perf-stock-left">
            <div class="score-badge ${scoreCls}" style="width:26px;height:26px;font-size:11px">${stock.score}</div>
            <div>
              <div class="perf-sname">${escHtml(displayName)}</div>
              <div class="perf-scode">${stock.ticker} · 진입 ${formatPrice(stock.entry_price, session.market)}</div>
            </div>
          </div>
          <div class="perf-results">
            ${t1 ? `<div class="perf-result ${t1.gain_pct >= 0 ? 'up' : 'down'}">T+1 ${t1.gain_pct >= 0 ? '+' : ''}${t1.gain_pct}%</div>`
                 : '<div class="perf-result muted">T+1 ⏳</div>'}
            ${t5 ? `<div class="perf-result ${t5.gain_pct >= 0 ? 'up' : 'down'}">T+5 ${t5.gain_pct >= 0 ? '+' : ''}${t5.gain_pct}%</div>`
                 : (t1 ? '<div class="perf-result muted">T+5 ⏳</div>' : '')}
          </div>
        </div>
        ${fails.length ? `<div class="perf-fail">${fails.map(f => `<span class="fail-tag">${escHtml(f)}</span>`).join('')}</div>` : ''}
        ${stock.signals.length ? `<div class="perf-sigs">${stock.signals.map(s => `<span class="sig-tag">${escHtml(s)}</span>`).join('')}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="perf-session">
      <div class="perf-session-hdr">
        <div><span class="perf-date">${mkt} ${session.date}</span><span class="perf-meta">${session.stocks.length}종목 · ${days}일 경과</span></div>
        <div class="perf-summary">
          ${winRate !== null ? `<span class="perf-wr ${winRate >= 60 ? 'up' : winRate < 40 ? 'down' : ''}">승률 ${winRate}%</span>` : ''}
          ${avgGain !== null ? `<span class="perf-avg ${avgGain >= 0 ? 'up' : 'down'}">${avgGain >= 0 ? '+' : ''}${avgGain}%</span>` : ''}
          ${pending.length ? `<span class="perf-pending">⏳${pending.length}건</span>` : ''}
        </div>
      </div>
      <div class="perf-stock-list">${stocksHtml}</div>
    </div>`;
  }).join('');
}

/* ── 스크리너 캐시 (localStorage) ── */
function scCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > 10 * 60 * 1000) return null; // 10분
    return data;
  } catch { return null; }
}
function scCacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function perCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > 6 * 60 * 60 * 1000) return null; // 6시간
    return data;
  } catch { return null; }
}

/* ── 단일 종목 스크리닝 ── */
async function screenOne(symbol) {
  try {
    const data = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=6mo&interval=1d`);
    const closes  = clean(data.close);
    const volumes = (data.volume || []).map(v => v ?? 0);
    const highs   = clean(data.high);
    if (closes.length < 30) return null;

    const price   = closes[closes.length - 1];
    const prev    = closes[closes.length - 2] || price;
    const chgPct  = prev ? ((price - prev) / prev * 100) : 0;
    const rsi     = calcRSI(closes);
    const macd    = calcMACD(closes);
    const ma5     = calcMA(closes, 5);
    const ma20    = calcMA(closes, 20);
    const ma60    = calcMA(closes, Math.min(60, closes.length));
    const vr      = volRatio(volumes);
    const high52  = is52WkHigh(highs);
    const bb      = calcBB(closes);

    let score = 0;
    const signals = [];

    if (vr >= 3)        { score += 3; signals.push(`거래량 ${vr.toFixed(1)}x`); }
    else if (vr >= 2)   { score += 2; signals.push(`거래량 ${vr.toFixed(1)}x`); }
    else if (vr >= 1.5) { score += 1; signals.push(`거래량 ${vr.toFixed(1)}x`); }

    if (rsi !== null) {
      if (rsi >= 60 && rsi <= 75) { score += 2; signals.push(`RSI ${rsi.toFixed(0)}`); }
      else if (rsi > 50)           { score += 1; }
    }

    if (macd.golden)      { score += 3; signals.push('골든크로스'); }
    else if (macd.bullish) { score += 1; signals.push('MACD 강세'); }

    if (ma5 && ma20 && ma60 && ma5 > ma20 && ma20 > ma60) { score += 2; signals.push('정배열'); }

    if (high52) { score += 2; signals.push('52주 신고가'); }

    if (bb.above)   { score += 2; signals.push('BB 상단돌파'); }
    else if (bb.squeeze) { score += 1; signals.push('BB 수축'); }

    if (chgPct >= 3)     score += 2;
    else if (chgPct >= 1) score += 1;

    if (score < 4) return null;

    const ticker = symbol.replace(/\.(KS|KQ)$/, '');
    const krEntry = KR_STOCKS.find(s => s.code === ticker);
    return {
      ticker,
      name: krEntry ? krEntry.name : (US_NAMES[ticker] || ticker),
      price,
      change_pct: parseFloat(chgPct.toFixed(2)),
      rsi:        rsi !== null ? parseFloat(rsi.toFixed(1)) : 0,
      vol_ratio:  parseFloat(vr.toFixed(1)),
      score,
      signals,
      golden:     macd.golden,
      macd_bull:  macd.bullish,
    };
  } catch { return null; }
}

/* 배치 처리 (5개씩) */
async function batchScreen(list, market = 'us') {
  const results = [];
  for (let i = 0; i < list.length; i += 5) {
    const chunk = list.slice(i, i + 5);
    const settled = await Promise.allSettled(chunk.map(s => screenOne(s)));
    settled.forEach(r => { if (r.status === 'fulfilled' && r.value) results.push(r.value); });
    if (i + 5 < list.length) await new Promise(r => setTimeout(r, 300));
  }
  const sorted = results.sort((a, b) => b.score - a.score);

  // US 종목: 배치로 회사 영문명 보완
  if (market === 'us' && sorted.length > 0) {
    try {
      const syms = sorted.map(r => r.ticker).join(',');
      const data = await apiFetch(`/batch?symbols=${encodeURIComponent(syms)}`);
      const nameMap = {};
      (data.quoteResponse?.result || []).forEach(q => {
        if (q.shortName) nameMap[q.symbol] = q.shortName;
      });
      sorted.forEach(r => { if (nameMap[r.ticker]) r.name = nameMap[r.ticker]; });
    } catch {}
  }

  return sorted;
}

/* ── 급등 스크리너 실행 ── */
async function runScreener(refresh = false) {
  const btn  = document.getElementById('runBtn');
  const load = document.getElementById('scLoading');
  const list = document.getElementById('scList');
  const sum  = document.getElementById('scSummary');
  const emp  = document.getElementById('scEmpty');

  const cacheKey = `sc_${screenerMarket}`;
  if (!refresh) {
    const cached = scCache(cacheKey);
    if (cached) { renderScreenerResults(cached); return; }
  }

  btn.disabled = true; btn.textContent = '⏳ 분석 중...';
  [load].forEach(el => el.classList.remove('hidden'));
  [list, sum, emp].forEach(el => el.classList.add('hidden'));

  try {
    const stockList = screenerMarket === 'us' ? US_SCREEN_LIST : KR_SCREEN_LIST;
    const results = await batchScreen(stockList, screenerMarket);
    scCacheSet(cacheKey, results);
    saveScreenerHistory(results, screenerMarket);
    renderScreenerResults(results);
  } catch (e) {
    alert('스크리너 오류: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '▶ 실행';
    load.classList.add('hidden');
  }
}

function renderScreenerResults(results) {
  const list = document.getElementById('scList');
  const sum  = document.getElementById('scSummary');
  const emp  = document.getElementById('scEmpty');

  if (!results.length) { emp.classList.remove('hidden'); return; }

  const now = new Date().toLocaleTimeString('ko-KR');
  const highScore = results.filter(i => i.score >= 8).length;
  sum.innerHTML = `<strong>${results.length}개</strong> 종목 &nbsp;|&nbsp;
    <strong style="color:var(--gold)">강력신호 ${highScore}개</strong> &nbsp;|&nbsp; ${now} (10분 캐시)`;
  sum.classList.remove('hidden');

  list.innerHTML = results.map(item => {
    const scoreCls = item.score >= 10 ? 'score-s' : item.score >= 7 ? 'score-a' : 'score-b';
    const chgCls   = item.change_pct >= 0 ? 'up' : 'down';
    const chgSign  = item.change_pct >= 0 ? '+' : '';
    const price    = screenerMarket === 'us'
      ? '$' + item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })
      : item.price.toLocaleString('ko-KR') + '원';
    const rsiCls   = item.rsi > 70 ? 'rsi-hot' : item.rsi >= 50 ? 'rsi-ok' : item.rsi >= 40 ? 'rsi-mid' : 'rsi-cool';
    const sigHtml  = item.signals.map(s => {
      const cls = s.includes('골든') || s.includes('신고가') ? 'hot'
                : s.includes('정배열') ? 'good' : '';
      return `<span class="sig-tag ${cls}">${s}</span>`;
    }).join('');
    return `<div class="sc-card" data-code="${item.ticker}" data-name="${escHtml(item.name)}">
      <div class="sc-card-top">
        <div class="sc-card-left">
          <div class="score-badge ${scoreCls}">${item.score}</div>
          <div>
            <div class="sc-name">${escHtml(item.name)}</div>
            <div class="sc-code">${item.ticker}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="sc-price">${price}</div>
          <div class="${chgCls}" style="font-size:12px">${chgSign}${item.change_pct}%</div>
        </div>
      </div>
      <div class="sc-card-bottom">
        <span class="rsi-pill ${rsiCls}">RSI ${item.rsi}</span>
        <span class="sc-meta">거래량 ${item.vol_ratio}x</span>
        ${item.golden ? '<span class="sig-tag hot">✂️ 골든크로스</span>' : item.macd_bull ? '<span class="sig-tag">▲ MACD 강세</span>' : ''}
        ${sigHtml}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.sc-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMarket = screenerMarket;
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.market === screenerMarket));
      switchTab('home');
      selectStock(card.dataset.code, card.dataset.name);
    });
  });

  list.classList.remove('hidden');
}

/* ── 저PER 스크리너 ── */
async function runPerScreener(refresh = false) {
  const btn  = document.getElementById('perRunBtn');
  const load = document.getElementById('perLoading');
  const list = document.getElementById('perList');
  const sum  = document.getElementById('perSummary');
  const emp  = document.getElementById('perEmpty');

  const cacheKey = `per_${perMarket}`;
  if (!refresh) {
    const cached = perCache(cacheKey);
    if (cached) { renderPerResults(cached); return; }
  }

  btn.disabled = true; btn.textContent = '⏳ 수집 중...';
  load.classList.remove('hidden');
  [list, sum, emp].forEach(el => el.classList.add('hidden'));

  try {
    const stockList = perMarket === 'us' ? US_SCREEN_LIST : KR_SCREEN_LIST;
    // 배치로 Flask /batch 호출 (20개씩)
    const all = [];
    for (let i = 0; i < stockList.length; i += 20) {
      const chunk = stockList.slice(i, i + 20).join(',');
      try {
        const data = await apiFetch(`/batch?symbols=${encodeURIComponent(chunk)}`);
        const items = data.quoteResponse?.result || [];
        all.push(...items);
      } catch {}
      if (i + 20 < stockList.length) await new Promise(r => setTimeout(r, 200));
    }

    const results = all
      .filter(i => i.forwardPE && i.forwardPE > 0 && i.forwardPE < 50)
      .sort((a, b) => a.forwardPE - b.forwardPE)
      .slice(0, 50)
      .map(i => ({
        ticker:     i.symbol.replace(/\.(KS|KQ)$/, ''),
        name:       i.shortName || i.symbol,
        price:      i.regularMarketPrice || 0,
        change_pct: parseFloat((i.regularMarketChangePercent || 0).toFixed(2)),
        forward_pe: parseFloat(i.forwardPE.toFixed(1)),
        sector:     i.sector || '',
      }));

    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: results }));
    renderPerResults(results);
  } catch (e) {
    alert('오류: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '▶ 실행';
    load.classList.add('hidden');
  }
}

function renderPerResults(results) {
  const list = document.getElementById('perList');
  const sum  = document.getElementById('perSummary');
  const emp  = document.getElementById('perEmpty');

  if (!results.length) { emp.classList.remove('hidden'); return; }

  const now  = new Date().toLocaleTimeString('ko-KR');
  const vlow = results.filter(i => i.forward_pe < 10).length;
  const low  = results.filter(i => i.forward_pe >= 10 && i.forward_pe < 15).length;
  sum.innerHTML = `<strong>${results.length}개</strong> 저PER 종목 &nbsp;|&nbsp;
    <span style="color:var(--gold)">PER&lt;10: ${vlow}개</span> &nbsp;
    <span style="color:var(--green)">PER 10~15: ${low}개</span> &nbsp;|&nbsp; ${now} (6시간 캐시)`;
  sum.classList.remove('hidden');

  list.innerHTML = results.map((item, idx) => {
    const fpe    = item.forward_pe;
    const perCls = fpe < 10 ? 'per-very-low' : fpe < 15 ? 'per-low' : fpe < 20 ? 'per-mid' : 'per-high';
    const chgCls = item.change_pct >= 0 ? 'up' : 'down';
    const sign   = item.change_pct >= 0 ? '+' : '';
    const price  = perMarket === 'us'
      ? (item.price ? '$' + item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-')
      : (item.price ? item.price.toLocaleString('ko-KR') + '원' : '-');
    return `<div class="per-card" data-code="${item.ticker}" data-name="${escHtml(item.name)}">
      <div class="rank-num ${idx < 3 ? 'top3' : ''}">${idx+1}</div>
      <div class="per-info">
        <div class="per-name">${escHtml(item.name)}</div>
        <div class="per-sub">${item.ticker} · ${item.sector}</div>
      </div>
      <div class="per-badge ${perCls}">PER ${fpe.toFixed(1)}</div>
      <div class="per-right">
        <div class="per-price">${price}</div>
        <div class="per-chg ${chgCls}">${sign}${item.change_pct}%</div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.per-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMarket = perMarket;
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.market === perMarket));
      switchTab('home');
      selectStock(card.dataset.code, card.dataset.name);
    });
  });
  list.classList.remove('hidden');
}

/* ── 탭 전환 ── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(p =>
    p.classList.toggle('hidden', p.id !== `tab-${tabId}`));
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabId));
  if (tabId === 'watch') renderWatchlist();
  if (tabId === 'home') document.getElementById('searchInput').focus();
  if (tabId === 'perf') updatePerfPrices().then(hist => renderPerfTab(hist));
}

/* ── 마켓 전환 ── */
function switchMarket(market) {
  currentMarket = market;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.market === market));
}

/* ── 검색 ── */
async function doSearch(q) {
  const box = document.getElementById('searchResults');
  box.innerHTML = '<div class="search-item"><div class="si-name">검색 중...</div></div>';
  box.classList.remove('hidden');
  try {
    const items = await fetchSearch(q);
    if (!items.length) {
      box.innerHTML = '<div class="search-item"><div class="si-name">결과 없음</div></div>';
      return;
    }
    box.innerHTML = items.map(item =>
      `<div class="search-item" data-code="${item.symbol}" data-name="${escHtml(item.name)}">
        <div class="si-name">${escHtml(item.name)}</div>
        <div class="si-code">${item.display}</div>
      </div>`
    ).join('');
    box.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('click', () => {
        selectStock(el.dataset.code, el.dataset.name);
        hideSearch();
        document.getElementById('searchInput').value = '';
        switchTab('home');
      });
    });
  } catch (e) {
    box.innerHTML = `<div class="search-item"><div class="si-name">오류: ${escHtml(e.message)}</div></div>`;
  }
}

function hideSearch() { document.getElementById('searchResults').classList.add('hidden'); }

/* ── 종목 선택 ── */
async function selectStock(code, name) {
  currentSymbol = code;
  document.getElementById('emptyState').classList.add('hidden');
  const detail = document.getElementById('stockDetail');
  detail.classList.remove('hidden');
  document.getElementById('stockName').textContent = name || code;
  document.getElementById('stockCode').textContent = code;
  document.getElementById('stockPrice').textContent = '조회 중...';
  document.getElementById('stockChange').textContent = '';
  ['mOpen','mHigh','mLow','mVolume'].forEach(id => document.getElementById(id).textContent = '-');

  try {
    const [q, c] = await Promise.all([fetchQuote(code), fetchChart(code)]);
    updateStockHeader(q);
    updateCharts(c);
    document.getElementById('addWatchBtn').textContent = '⭐ 관심종목 추가';
  } catch (e) {
    document.getElementById('stockPrice').textContent = '오류';
    console.error(e);
  }
}

function updateStockHeader(q) {
  if (!q) return;
  const chg  = q.change || 0;
  const pct  = q.change_pct || 0;
  const sign = chg >= 0 ? '+' : '';
  document.getElementById('stockPrice').textContent = formatPrice(q.price, currentMarket, q.currency);
  const chgEl = document.getElementById('stockChange');
  chgEl.textContent = `${sign}${chg.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
  chgEl.className = 'change ' + (chg >= 0 ? 'up' : 'down');
  document.getElementById('mOpen').textContent    = formatPrice(q.open,   currentMarket, q.currency);
  document.getElementById('mHigh').textContent    = formatPrice(q.high,   currentMarket, q.currency);
  document.getElementById('mLow').textContent     = formatPrice(q.low,    currentMarket, q.currency);
  document.getElementById('mVolume').textContent  = fmtVol(q.volume);
  document.getElementById('mPer').textContent     = q.per   ? q.per.toFixed(1) + 'x'  : '-';
  document.getElementById('mFpe').textContent     = q.fpe   ? q.fpe.toFixed(1) + 'x'  : '-';
  document.getElementById('mPbr').textContent     = q.pbr   ? q.pbr.toFixed(2) + 'x'  : '-';
  document.getElementById('mEps').textContent     = q.eps   ? formatPrice(q.eps, currentMarket, q.currency) : '-';
  document.getElementById('mDiv').textContent     = q.dividend ? q.dividend.toFixed(2) + '%' : '-';
  document.getElementById('mMcap').textContent    = q.market_cap ? fmtMcap(q.market_cap, currentMarket) : '-';
  document.getElementById('m52H').textContent     = q.week52_high ? formatPrice(q.week52_high, currentMarket, q.currency) : '-';
  document.getElementById('m52L').textContent     = q.week52_low  ? formatPrice(q.week52_low,  currentMarket, q.currency) : '-';
  document.getElementById('mRoe').textContent     = q.roe        ? q.roe.toFixed(1) + '%'  : '-';
  document.getElementById('mSectorPer').textContent = q.sector_per ? q.sector_per.toFixed(1) + 'x' : '-';
}

/* ── 차트 ── */
function initCharts() {
  const scaleBase = {
    x: { ticks: { color: '#8b949e', maxTicksLimit: 6 }, grid: { color: '#21262d' } },
    y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' }, position: 'right' },
  };
  priceChart = new Chart(document.getElementById('priceChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '종가', data: [],
          borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,.08)',
          fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2, order: 1,
        },
        {
          label: 'BB 상단', data: [],
          borderColor: 'rgba(255,120,80,.7)', borderDash: [5, 3],
          borderWidth: 1, fill: false, pointRadius: 0, tension: 0, order: 2,
        },
        {
          label: 'BB 중간', data: [],
          borderColor: 'rgba(180,180,180,.5)', borderDash: [4, 3],
          borderWidth: 1, fill: false, pointRadius: 0, tension: 0, order: 3,
        },
        {
          label: 'BB 하단', data: [],
          borderColor: 'rgba(80,200,130,.7)', borderDash: [5, 3],
          borderWidth: 1,
          fill: { target: 1, above: 'rgba(150,150,160,.07)' },
          pointRadius: 0, tension: 0, order: 4,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#8b949e', boxWidth: 10, font: { size: 11 }, padding: 10 },
        },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: scaleBase,
    },
  });
  volumeChart = new Chart(document.getElementById('volumeChart'), {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: 'rgba(88,166,255,.4)' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { ...scaleBase, y: { ...scaleBase.y, ticks: { color: '#8b949e', callback: v => fmtVol(v) } } },
    },
  });
}

function updateCharts(d) {
  if (!d) return;
  const bb = calcBBSeries(d.close || []);
  priceChart.data.labels = d.dates;
  priceChart.data.datasets[0].data = d.close;
  priceChart.data.datasets[1].data = bb.upper;
  priceChart.data.datasets[2].data = bb.mid;
  priceChart.data.datasets[3].data = bb.lower;
  priceChart.update();
  volumeChart.data.labels = d.dates;
  volumeChart.data.datasets[0].data = d.volume;
  volumeChart.update();
}

/* ── 관심종목 ── */
function saveWatchlist() { localStorage.setItem('watchlist_v2', JSON.stringify(watchlist)); }
function loadWatchlistData() {
  try {
    const saved = localStorage.getItem('watchlist_v2');
    if (saved) Object.assign(watchlist, JSON.parse(saved));
  } catch {}
}

function renderWatchlist() {
  const panel = document.getElementById('watchlistPanel');
  const items = watchlist[watchMarket];
  if (!items.length) {
    panel.innerHTML = '<div class="wl-empty">관심종목이 없습니다.<br>종목 탭에서 ⭐ 버튼으로 추가하세요.</div>';
    return;
  }
  panel.innerHTML = items.map(item => `
    <div class="wl-card ${item.code === currentSymbol ? 'active' : ''}" data-code="${item.code}" data-name="${escHtml(item.name)}">
      <div class="wl-info">
        <div class="wl-name">${escHtml(item.name || item.code)}</div>
        <div class="wl-code">${item.code}</div>
      </div>
      <button class="wl-remove" data-code="${item.code}">×</button>
    </div>
  `).join('');
  panel.querySelectorAll('.wl-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('wl-remove')) return;
      currentMarket = watchMarket;
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.market === watchMarket));
      switchTab('home');
      selectStock(card.dataset.code, card.dataset.name);
    });
  });
  panel.querySelectorAll('.wl-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      watchlist[watchMarket] = watchlist[watchMarket].filter(i => i.code !== btn.dataset.code);
      saveWatchlist();
      renderWatchlist();
    });
  });
}

/* ── 유틸 ── */
function formatPrice(n, market, currency) {
  if (!n) return '-';
  if (market === 'kr' || currency === 'KRW') return Number(n).toLocaleString('ko-KR') + '원';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMcap(n, market) {
  if (!n) return '-';
  if (market === 'kr') {
    if (n >= 1e12) return (n/1e12).toFixed(1) + '조';
    if (n >= 1e8)  return (n/1e8).toFixed(0) + '억';
    return n.toLocaleString('ko-KR');
  }
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString();
}
function fmtVol(n) {
  if (!n) return '-';
  if (n >= 1e8) return (n/1e8).toFixed(1) + '억';
  if (n >= 1e4) return (n/1e4).toFixed(1) + '만';
  return Number(n).toLocaleString();
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 이벤트 바인딩 ── */
document.querySelectorAll('.nav-btn').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => switchMarket(btn.dataset.market)));

const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 1) { hideSearch(); return; }
  searchTimer = setTimeout(() => doSearch(q), 400);
});
document.addEventListener('click', e => { if (!e.target.closest('.search-box')) hideSearch(); });

document.getElementById('addWatchBtn').addEventListener('click', () => {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  if (!watchlist[currentMarket].find(i => i.code === currentSymbol)) {
    watchlist[currentMarket].push({ code: currentSymbol, name });
    saveWatchlist();
  }
  document.getElementById('addWatchBtn').textContent = '✅ 추가됨';
  setTimeout(() => { document.getElementById('addWatchBtn').textContent = '⭐ 관심종목 추가'; }, 1500);
});

document.querySelectorAll('.sc-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sc-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    screenerMarket = btn.dataset.m;
    ['scList','scSummary','scEmpty'].forEach(id => document.getElementById(id).classList.add('hidden'));
  });
});

document.querySelectorAll('.per-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.per-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    perMarket = btn.dataset.m;
    ['perList','perSummary','perEmpty'].forEach(id => document.getElementById(id).classList.add('hidden'));
  });
});

document.getElementById('runBtn').addEventListener('click', () => runScreener(false));
document.getElementById('refreshBtn').addEventListener('click', () => runScreener(true));
document.getElementById('perRunBtn').addEventListener('click', () => runPerScreener(false));
document.getElementById('perRefreshBtn').addEventListener('click', () => runPerScreener(true));

document.getElementById('perfUpdateBtn').addEventListener('click', () =>
  updatePerfPrices().then(hist => renderPerfTab(hist)));

document.querySelectorAll('.wl-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wl-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    watchMarket = btn.dataset.market;
    renderWatchlist();
  });
});

/* ── 초기화 ── */
loadWatchlistData();
initCharts();
