'use strict';

/* ── 글자 크기 조절 (CSS zoom — 모바일 포함 전체 스케일) ── */
const FONT_STEPS = [75, 85, 100, 110, 125, 140, 160];
let _fontIdx = 2; // 기본 100%

function _isLandscapeMobile() {
  return window.innerWidth > window.innerHeight && window.innerWidth < 1024;
}

function _applyFontSize(idx) {
  if (idx !== undefined) {
    _fontIdx = Math.max(0, Math.min(FONT_STEPS.length - 1, idx));
    localStorage.setItem('fontSizeIdx', _fontIdx);
  }
  const base = FONT_STEPS[_fontIdx] / 100;
  const zoom = _isLandscapeMobile() ? base * 2 : base;
  document.querySelector('.app').style.zoom = zoom;
  const lbl = document.getElementById('fontSizeLabel');
  if (lbl) lbl.textContent = FONT_STEPS[_fontIdx] + '%';
}

// 저장된 설정 복원 & 버튼 연결 (스크립트는 </body> 직전 → DOM 이미 완성)
(function initFontSize() {
  const saved = parseInt(localStorage.getItem('fontSizeIdx'), 10);
  _applyFontSize(isNaN(saved) ? 2 : saved);
  document.getElementById('fontIncBtn').addEventListener('click', () => _applyFontSize(_fontIdx + 1));
  document.getElementById('fontDecBtn').addEventListener('click', () => _applyFontSize(_fontIdx - 1));
  // 화면 회전 감지
  window.addEventListener('resize', () => _applyFontSize());
})();

/* ── 상태 ── */
let currentMarket = 'kr';
let currentSymbol = null;
let screenerMarket = 'kr';
let perMarket = 'kr';
let watchMarket = 'kr';
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
  // ETF - 국내지수
  { code:'069500', name:'KODEX 200' }, { code:'122630', name:'KODEX 레버리지' },
  { code:'114800', name:'KODEX 인버스' }, { code:'252670', name:'KODEX 200선물인버스2X' },
  { code:'233740', name:'KODEX 코스닥150레버리지' }, { code:'091160', name:'KODEX 반도체' },
  { code:'091170', name:'KODEX 은행' }, { code:'102110', name:'TIGER 200' },
  { code:'148020', name:'KBSTAR 200' }, { code:'229200', name:'KODEX 코스닥150' },
  { code:'278540', name:'KODEX MSCI Korea TR' },
  // ETF - 해외/테마
  { code:'360750', name:'TIGER 미국S&P500' }, { code:'379800', name:'KODEX 미국S&P500' },
  { code:'133690', name:'TIGER 미국나스닥100' }, { code:'379810', name:'KODEX 미국나스닥100' },
  { code:'371460', name:'TIGER 차이나전기차SOLACTIVE' },
  { code:'453950', name:'TIGER TSMC파운드리밸류체인' },
  { code:'449690', name:'TIGER 한중반도체' }, { code:'329200', name:'TIGER 리츠부동산인프라' },
  { code:'195930', name:'TIGER 해외상장리츠(합성H)' }, { code:'304660', name:'TIGER 차이나CSI300' },
  { code:'428510', name:'TIGER 미국테크TOP10INDXX' }, { code:'459580', name:'KODEX 미국AI테크TOP10' },
  // 리츠 (REITs)
  { code:'088980', name:'맥쿼리인프라' }, { code:'330590', name:'롯데리츠' },
  { code:'365550', name:'ESR켄달스퀘어리츠' }, { code:'395400', name:'SK리츠' },
  { code:'350520', name:'이지스레지던스리츠' }, { code:'417310', name:'코람코더원리츠' },
  { code:'448730', name:'삼성FN리츠' }, { code:'451800', name:'한화리츠' },
  { code:'293940', name:'신한알파리츠' }, { code:'357120', name:'코람코라이프인프라리츠' },
  { code:'404990', name:'신한서부티엔디리츠' }, { code:'432720', name:'디앤디플랫폼리츠' },
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

/* ── 반전예상주 스크리너 ── */
const REV_HIST_KEY    = 'rev_history_v1';
const REV_WEIGHTS_KEY = 'rev_weights_v1';
const REV_DEFAULT_W   = {
  'RSI 과매도 탈출': 3, 'BB 하단 복귀': 3, 'MA5 반전 중': 3,
  'MACD 개선 중':   2, '거래량 반등':  2, '52주 저가 근접': 2, '소폭 반등': 1,
};

let revMarket  = 'us';
let revSubTab  = 'screener';
let _revLastRes = [];

function loadRevWeights() {
  try {
    const s = localStorage.getItem(REV_WEIGHTS_KEY);
    return s ? { ...REV_DEFAULT_W, ...JSON.parse(s) } : { ...REV_DEFAULT_W };
  } catch { return { ...REV_DEFAULT_W }; }
}
function saveRevWeights(w) {
  try { localStorage.setItem(REV_WEIGHTS_KEY, JSON.stringify(w)); } catch {}
}

function loadRevHistory() {
  try {
    const r = localStorage.getItem(REV_HIST_KEY);
    if (!r) return [];
    const all = JSON.parse(r);
    const cutoff = Date.now() - 7 * 864e5;
    const fresh = all.filter(s => s.ts >= cutoff);
    if (fresh.length !== all.length) {
      try { localStorage.setItem(REV_HIST_KEY, JSON.stringify(fresh)); } catch {}
    }
    return fresh;
  } catch { return []; }
}
function saveRevHistoryData(h) {
  try { localStorage.setItem(REV_HIST_KEY, JSON.stringify(h)); } catch {}
}
function saveRevHistory(results, market) {
  if (!results || !results.length) return;
  const history = loadRevHistory();
  history.unshift({
    id: Date.now(), date: new Date().toLocaleDateString('ko-KR'),
    ts: Date.now(), market,
    stocks: results.slice(0, 20).map(r => ({
      ticker: r.ticker, name: r.name, entry_price: r.price,
      score: r.score, signals: r.signals, rsi: r.rsi, prices: {},
    })),
  });
  if (history.length > 30) history.splice(30);
  saveRevHistoryData(history);
}

// MACD 히스토그램 개선 여부 (음수에서 상승 추세)
function calcMACDHistogram(closes) {
  if (closes.length < 35) return { improving: false };
  const e12  = emaSeries(closes, 12);
  const e26  = emaSeries(closes, 26);
  const line = e12.map((v, i) => v - e26[i]);
  const sig  = emaSeries(line.slice(25), 9);
  const n    = sig.length - 1;
  const h    = [
    line[line.length - 3] - (sig[n - 2] ?? sig[n]),
    line[line.length - 2] - (sig[n - 1] ?? sig[n]),
    line[line.length - 1] - sig[n],
  ];
  return { improving: h[2] < 0 && h[2] > h[1] && h[1] > h[0] };
}

// 반전 매도 플랜 (급등주보다 넉넉하게)
function calcRevExitPlan(item) {
  let targetPct, stopPct, holdDays, holdDaysNum;
  if (item.score >= 10)     { targetPct = 25; stopPct = 7; holdDays = '최대 20거래일'; holdDaysNum = 20; }
  else if (item.score >= 7) { targetPct = 15; stopPct = 7; holdDays = '최대 15거래일'; holdDaysNum = 15; }
  else                       { targetPct = 10; stopPct = 7; holdDays = '최대 10거래일'; holdDaysNum = 10; }
  const p = item.price;
  return {
    targetPct, stopPct, holdDays, holdDaysNum,
    targetPrice: p * (1 + targetPct / 100),
    stopPrice:   p * (1 - stopPct   / 100),
  };
}

// 단일 종목 반전 스크리닝
async function revScreenOne(symbol) {
  try {
    const data = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=6mo&interval=1d`);
    const closes  = clean(data.close);
    const volumes = (data.volume || []).map(v => v ?? 0);
    const lows    = clean(data.low);
    if (closes.length < 40) return null;

    const price  = closes[closes.length - 1];
    const prev   = closes[closes.length - 2] || price;
    const chgPct = prev ? ((price - prev) / prev * 100) : 0;
    if (chgPct < -4) return null;  // 아직 급락 중 → 제외

    const rsi   = calcRSI(closes);
    if (rsi === null || rsi > 55 || rsi < 20) return null;  // 과매도 회복 구간만

    const ma5    = calcMA(closes, 5);
    const ma20   = calcMA(closes, 20);
    const ma5ago = calcMA(closes.slice(0, -3), 5);  // 3일 전 MA5
    const vr     = volRatio(volumes);
    const bb     = calcBB(closes);
    const bbPrev = calcBB(closes.slice(0, -5));
    const macdH  = calcMACDHistogram(closes);

    // 52주 저가 근접
    const yr52L  = lows.length >= 20 ? Math.min(...(lows.length >= 252 ? lows.slice(-252) : lows)) : 0;
    const near52 = yr52L > 0 && price <= yr52L * 1.20;

    const weights = loadRevWeights();
    let score = 0;
    const signals = [];

    // RSI 과매도 탈출: 현재 28~52 범위
    if (rsi >= 28 && rsi <= 52) {
      score += weights['RSI 과매도 탈출'] || 3;
      signals.push(`RSI 과매도 탈출 (${rsi.toFixed(0)})`);
    }

    // BB 하단 복귀: 이전에 하단 아래였다가 현재 안으로 들어옴
    if (bbPrev.below && !bb.below) {
      score += weights['BB 하단 복귀'] || 3;
      signals.push('BB 하단 복귀');
    }

    // MA5 반전: MA5 < MA20 이지만 MA5가 상향 전환 중
    if (ma5 && ma20 && ma5 < ma20 && ma5ago && ma5 > ma5ago) {
      score += weights['MA5 반전 중'] || 3;
      signals.push('MA5 반전 중');
    }

    // MACD 히스토그램 개선 (음수에서 상승)
    if (macdH.improving) {
      score += weights['MACD 개선 중'] || 2;
      signals.push('MACD 개선 중');
    }

    // 거래량 반등 (양봉 + 2배 이상)
    if (vr >= 2 && chgPct > 0) {
      score += weights['거래량 반등'] || 2;
      signals.push(`거래량 반등 ${vr.toFixed(1)}x`);
    } else if (vr >= 1.5 && chgPct > 0) {
      score += 1;
      signals.push(`거래량 증가 ${vr.toFixed(1)}x`);
    }

    // 52주 저가 근접
    if (near52) {
      score += weights['52주 저가 근접'] || 2;
      signals.push('52주 저가 근접');
    }

    // 소폭 반등 (당일 +0.5% 이상)
    if (chgPct >= 0.5) {
      score += weights['소폭 반등'] || 1;
      signals.push(`반등 +${chgPct.toFixed(1)}%`);
    }

    if (score < 5 || signals.length < 2) return null;

    const ticker  = symbol.replace(/\.(KS|KQ)$/, '');
    const krEntry = KR_STOCKS.find(s => s.code === ticker);
    return {
      ticker,
      name:       krEntry ? krEntry.name : (US_NAMES[ticker] || ticker),
      price,
      change_pct: parseFloat(chgPct.toFixed(2)),
      rsi:        parseFloat(rsi.toFixed(1)),
      vol_ratio:  parseFloat(vr.toFixed(1)),
      score:      parseFloat(score.toFixed(1)),
      signals,
    };
  } catch { return null; }
}

async function batchRevScreen(list, market) {
  const results = [];
  for (let i = 0; i < list.length; i += 5) {
    const chunk   = list.slice(i, i + 5);
    const settled = await Promise.allSettled(chunk.map(s => revScreenOne(s)));
    settled.forEach(r => { if (r.status === 'fulfilled' && r.value) results.push(r.value); });
    if (i + 5 < list.length) await new Promise(r => setTimeout(r, 300));
  }
  const sorted = results.sort((a, b) => b.score - a.score);
  if (market === 'us' && sorted.length > 0) {
    try {
      const syms = sorted.map(r => r.ticker).join(',');
      const data = await apiFetch(`/batch?symbols=${encodeURIComponent(syms)}`);
      const nm   = {};
      (data.quoteResponse?.result || []).forEach(q => { if (q.shortName) nm[q.symbol] = q.shortName; });
      sorted.forEach(r => { if (nm[r.ticker]) r.name = nm[r.ticker]; });
    } catch {}
  }
  return sorted;
}

async function runRevScreener(refresh = false) {
  const btn  = document.getElementById('revRunBtn');
  const load = document.getElementById('revLoading');
  const list = document.getElementById('revList');
  const sum  = document.getElementById('revSummary');
  const emp  = document.getElementById('revEmpty');

  const cacheKey = `rev_${revMarket}`;
  if (!refresh) {
    const cached = scCache(cacheKey);
    if (cached) { renderRevResults(cached); return; }
  }

  btn.disabled = true; btn.textContent = '⏳ 탐색 중...';
  load.classList.remove('hidden');
  [list, sum, emp].forEach(el => el.classList.add('hidden'));

  try {
    const stockList = revMarket === 'us' ? US_SCREEN_LIST : KR_SCREEN_LIST;
    const results   = await batchRevScreen(stockList, revMarket);
    scCacheSet(cacheKey, results);
    saveRevHistory(results, revMarket);
    renderRevResults(results);
  } catch (e) {
    alert('스크리너 오류: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '▶ 실행';
    load.classList.add('hidden');
  }
}

function renderRevResults(results) {
  _revLastRes = results;
  const list = document.getElementById('revList');
  const sum  = document.getElementById('revSummary');
  const emp  = document.getElementById('revEmpty');

  if (!results.length) { emp.classList.remove('hidden'); return; }

  const now  = new Date().toLocaleTimeString('ko-KR');
  sum.innerHTML = `<strong>${results.length}개</strong> 반전 후보 &nbsp;|&nbsp;
    <span style="color:var(--violet)">강력신호 ${results.filter(i => i.score >= 8).length}개</span>
    &nbsp;|&nbsp; ${now} (10분 캐시)`;
  sum.classList.remove('hidden');

  list.innerHTML = results.map(item => {
    const ex      = calcRevExitPlan(item);
    const isOwned = !!ownedMap[item.ticker];
    const chgCls  = item.change_pct >= 0 ? 'up' : 'down';
    const chgSign = item.change_pct >= 0 ? '+' : '';
    const mkt     = revMarket;
    const fmtP    = p => mkt === 'us'
      ? '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(p).toLocaleString('ko-KR') + '원';
    const scoreCls = item.score >= 10 ? 'score-s' : item.score >= 7 ? 'score-a' : 'score-b';
    const rsiCls   = item.rsi <= 35 ? 'rsi-cool' : item.rsi <= 45 ? 'rsi-mid' : 'rsi-ok';
    const sigHtml  = item.signals.map(s =>
      `<span class="sig-tag" style="background:rgba(163,113,247,.1);color:var(--violet)">${escHtml(s)}</span>`
    ).join('');
    return `<div class="rev-card" data-code="${item.ticker}" data-name="${escHtml(item.name)}">
      <div class="sc-card-top">
        <div class="sc-card-left">
          <div class="score-badge rev-score">${item.score}</div>
          <div>
            <div class="sc-name">${escHtml(item.name)}</div>
            <div class="sc-code">${item.ticker}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="sc-price">${fmtP(item.price)}</div>
          <div class="${chgCls}" style="font-size:12px">${chgSign}${item.change_pct}%</div>
          ${isOwned ? '<div style="margin-top:4px"><span class="owned-badge">✅ 보유중</span></div>' : ''}
        </div>
      </div>
      <div class="sc-card-bottom">
        <span class="rsi-pill ${rsiCls}">RSI ${item.rsi}</span>
        <span class="sc-meta">거래량 ${item.vol_ratio}x</span>
        ${sigHtml}
      </div>
      <div class="sc-exit">
        <span class="exit-target">▲ +${ex.targetPct}% ${fmtP(ex.targetPrice)}</span>
        <span class="exit-sep">|</span>
        <span class="exit-stop">▼ -${ex.stopPct}% ${fmtP(ex.stopPrice)}</span>
        <span class="exit-sep">|</span>
        <span class="exit-days">${ex.holdDays}</span>
        <span style="flex:1"></span>
        ${watchBtnHtml(item.ticker, item.name, revMarket, 'reversal', item.price)}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.rev-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      currentMarket = revMarket;
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.market === revMarket));
      switchTab('home');
      selectStock(card.dataset.code, card.dataset.name);
    });
  });
  list.classList.remove('hidden');
}

// 반전주 매수 모달 (exit plan이 다르므로 별도 래퍼)
let _revBuyTicker = null;
function openRevBuyModal(ticker) {
  const item = _revLastRes.find(r => r.ticker === ticker);
  if (!item) return;
  _revBuyTicker = ticker;
  const ex  = calcRevExitPlan(item);
  const mkt = revMarket;
  document.getElementById('buyModalInfo').innerHTML =
    `<strong>${escHtml(item.name)}</strong> (${item.ticker})<br>` +
    `현재가: ${mkt === 'us' ? '$' + item.price.toFixed(2) : item.price.toLocaleString('ko-KR') + '원'}<br>` +
    `스코어: ${item.score}점 · RSI ${item.rsi} · <span style="color:var(--violet)">반전예상주</span>`;
  document.getElementById('buyPrice').value = mkt === 'us' ? item.price.toFixed(2) : String(Math.round(item.price));
  document.getElementById('buyQty').value   = 1;
  document.getElementById('buyExitInfo').innerHTML =
    `목표가: +${ex.targetPct}% &nbsp;|&nbsp; 손절가: -${ex.stopPct}% &nbsp;|&nbsp; 보유기간: ${ex.holdDays}<br>` +
    `조건 충족 시 카카오톡으로 알림을 발송합니다.`;
  document.getElementById('buyModal').classList.remove('hidden');
  // confirmBuy를 rev용으로 override
  document.getElementById('buyModal').dataset.mode = 'rev';
}

// ── 성과·피드백 ──────────────────────────────────────────────
async function updateRevPerfPrices() {
  const history = loadRevHistory();
  let updated   = false;
  const btn     = document.getElementById('revPerfUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 조회 중...'; }

  for (const session of history) {
    const daysPassed = (Date.now() - session.ts) / 864e5;
    for (const stock of session.stocks) {
      if (stock.prices.t5) continue;
      if (daysPassed < 5) continue;
      const sym = session.market === 'kr' ? stock.ticker + '.KS' : stock.ticker;
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
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (updated) saveRevHistoryData(history);
  if (btn) { btn.disabled = false; btn.textContent = '↺ 업데이트'; }
  return history;
}

function getRevSignalStats(history) {
  const stats = {};
  for (const session of history) {
    for (const stock of session.stocks) {
      const t5 = stock.prices.t5;
      if (!t5) continue;
      const win = t5.gain_pct >= 5;  // 반전은 +5% 이상이 기준
      for (const sig of (stock.signals || [])) {
        // 신호명에서 숫자/퍼센트 제거해서 기준 키로 만들기
        const key = sig.replace(/[\d.]+[x%]/g, '').trim().replace(/\s+/g, ' ');
        if (!stats[key]) stats[key] = { wins: 0, total: 0 };
        stats[key].total++;
        if (win) stats[key].wins++;
      }
    }
  }
  return Object.entries(stats)
    .filter(([, s]) => s.total >= 2)
    .map(([sig, s]) => ({ sig, wins: s.wins, total: s.total, rate: Math.round(s.wins / s.total * 100) }))
    .sort((a, b) => b.rate - a.rate);
}

function adaptRevWeights(stats) {
  const weights = loadRevWeights();
  const changes = [];
  stats.forEach(s => {
    if (s.total < 5) return;
    const baseKey = Object.keys(REV_DEFAULT_W).find(k => s.sig.startsWith(k.split(' ')[0]));
    if (!baseKey) return;
    const cur = weights[baseKey] ?? REV_DEFAULT_W[baseKey];
    if (s.rate >= 70 && cur < 5) {
      const nw = Math.min(5, parseFloat((cur + 0.5).toFixed(1)));
      weights[baseKey] = nw;
      changes.push({ sig: baseKey, from: cur, to: nw, rate: s.rate, dir: 'up' });
    } else if (s.rate < 35 && cur > 0.5) {
      const nw = Math.max(0.5, parseFloat((cur - 0.5).toFixed(1)));
      weights[baseKey] = nw;
      changes.push({ sig: baseKey, from: cur, to: nw, rate: s.rate, dir: 'down' });
    }
  });
  if (changes.length) saveRevWeights(weights);
  return { weights, changes };
}

function renderRevFeedback(history, stats, changes) {
  const el = document.getElementById('revFeedbackEl');
  const measured    = history.flatMap(s => s.stocks).filter(s => s.prices.t5);
  const wins        = measured.filter(s => s.prices.t5.gain_pct >= 5);
  const overallRate = measured.length ? Math.round(wins.length / measured.length * 100) : null;

  if (!measured.length && !changes.length) { el.classList.add('hidden'); return; }

  let html = '<div class="rev-feedback-title">🤖 AI 피드백 & 자동 학습 현황</div>';

  if (overallRate !== null) {
    html += `<div class="fb-line">전체 적중률 (T+5, +5% 기준): <strong class="${overallRate >= 50 ? 'up' : 'down'}">${overallRate}% (${wins.length}/${measured.length}건)</strong></div>`;
  }

  if (changes.length) {
    html += '<div class="fb-section">⚙ 신호 가중치 자동 조정</div>';
    changes.forEach(c => {
      html += `<div class="fb-change">"${escHtml(c.sig)}" ${c.from} → <strong>${c.to}</strong>
        <span class="weight-tag ${c.dir === 'up' ? 'weight-up' : 'weight-down'}">${c.dir === 'up' ? '▲ 강화' : '▼ 약화'} (승률 ${c.rate}%)</span></div>`;
    });
  }

  const poor   = stats.filter(s => s.total >= 3 && s.rate < 40);
  const strong = stats.filter(s => s.total >= 3 && s.rate >= 65);

  if (strong.length) {
    html += '<div class="fb-section">✅ 신뢰도 높은 신호</div>';
    strong.forEach(s => { html += `<div class="fb-good">"${escHtml(s.sig)}" — 승률 ${s.rate}% (${s.wins}/${s.total})</div>`; });
  }
  if (poor.length) {
    html += '<div class="fb-section">⚠ 신뢰도 낮은 신호 (단독 진입 주의)</div>';
    poor.forEach(s => { html += `<div class="fb-warn">"${escHtml(s.sig)}" — 승률 ${s.rate}% (${s.wins}/${s.total}) → 추가 조건 확인 필요</div>`; });
  }

  if (!strong.length && !poor.length && !changes.length) {
    html += '<div class="fb-line" style="color:var(--muted)">데이터 축적 중... 5건 이상 측정 후 분석이 시작됩니다.</div>';
  }

  el.innerHTML = html;
  el.classList.remove('hidden');
}

function renderRevPerfTab(history) {
  const statsEl    = document.getElementById('revPerfStats');
  const sessionsEl = document.getElementById('revPerfSessions');
  const emptyEl    = document.getElementById('revPerfEmpty');
  const valid      = (history || []).filter(s => s.stocks && s.stocks.length);

  if (!valid.length) {
    emptyEl.classList.remove('hidden');
    statsEl.classList.add('hidden');
    sessionsEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');

  // 신호 승률 + 가중치 학습
  const stats = getRevSignalStats(history);
  const { changes } = adaptRevWeights(stats);
  renderRevFeedback(history, stats, changes);

  // 시그널 승률 바
  if (stats.length) {
    statsEl.innerHTML = `<div class="perf-stats-title">신호별 승률 (T+5, +5% 기준)</div>` +
      stats.map(s => {
        const col = s.rate >= 65 ? 'var(--green)' : s.rate >= 40 ? 'var(--violet)' : 'var(--red)';
        return `<div class="sig-stat-row">
          <span class="sig-stat-name">${escHtml(s.sig)}</span>
          <div class="sig-bar-wrap"><div class="sig-bar" style="width:${s.rate}%;background:${col}"></div></div>
          <span class="sig-stat-rate ${s.rate >= 65 ? 'up' : s.rate < 40 ? 'down' : ''}">${s.rate}%</span>
          <span class="sig-stat-cnt">${s.wins}/${s.total}</span>
        </div>`;
      }).join('');
    statsEl.classList.remove('hidden');
  } else {
    statsEl.classList.add('hidden');
  }

  // 세션 목록
  sessionsEl.innerHTML = valid.map(session => {
    const measured  = session.stocks.filter(s => s.prices.t5);
    const wins      = measured.filter(s => s.prices.t5.gain_pct >= 5);
    const pending   = session.stocks.filter(s => !s.prices.t5);
    const winRate   = measured.length ? Math.round(wins.length / measured.length * 100) : null;
    const avgGain   = measured.length
      ? (measured.reduce((a, s) => a + s.prices.t5.gain_pct, 0) / measured.length).toFixed(1)
      : null;
    const days = Math.floor((Date.now() - session.ts) / 864e5);
    const mkt  = session.market === 'us' ? '🇺🇸' : '🇰🇷';

    const stocksHtml = session.stocks.map(stock => {
      const t5   = stock.prices.t5;
      const isWin  = t5 && t5.gain_pct >= 5;
      const isLoss = t5 && t5.gain_pct < 0;
      const scoreCls = stock.score >= 10 ? 'score-s' : stock.score >= 7 ? 'score-a' : 'score-b';
      const name = resolveName(stock.ticker, session.market);
      return `<div class="perf-stock ${isWin ? 'win' : isLoss ? 'loss' : ''}" style="${isWin ? '' : isLoss ? '' : 'border-left-color:var(--violet)'}">
        <div class="perf-stock-top">
          <div class="perf-stock-left">
            <div class="score-badge ${scoreCls}" style="width:26px;height:26px;font-size:11px">${stock.score}</div>
            <div>
              <div class="perf-sname">${escHtml(name)}</div>
              <div class="perf-scode">${stock.ticker} · 진입 ${formatPrice(stock.entry_price, session.market)}</div>
            </div>
          </div>
          <div class="perf-results">
            ${t5 ? `<div class="perf-result ${t5.gain_pct >= 0 ? 'up' : 'down'}">T+5 ${t5.gain_pct >= 0 ? '+' : ''}${t5.gain_pct}% ${isWin ? '✅' : isLoss ? '❌' : '▷'}</div>`
                 : '<div class="perf-result muted">T+5 ⏳ (5일 후 측정)</div>'}
          </div>
        </div>
        ${stock.signals.length ? `<div class="perf-sigs">${stock.signals.map(s => `<span class="sig-tag" style="background:rgba(163,113,247,.1);color:var(--violet)">${escHtml(s)}</span>`).join('')}</div>` : ''}
        <div style="margin-top:4px">${watchBtnHtml(stock.ticker, name, session.market, 'reversal', stock.entry_price)}</div>
      </div>`;
    }).join('');

    return `<div class="perf-session">
      <div class="perf-session-hdr">
        <div><span class="perf-date">${mkt} ${session.date}</span><span class="perf-meta">${session.stocks.length}종목 · ${days}일 경과</span></div>
        <div class="perf-summary">
          ${winRate !== null ? `<span class="perf-wr ${winRate >= 50 ? 'up' : winRate < 30 ? 'down' : ''}" style="color:var(--violet)">적중 ${winRate}%</span>` : ''}
          ${avgGain !== null ? `<span class="perf-avg ${avgGain >= 0 ? 'up' : 'down'}">${avgGain >= 0 ? '+' : ''}${avgGain}%</span>` : ''}
          ${pending.length ? `<span class="perf-pending">⏳${pending.length}건</span>` : ''}
        </div>
      </div>
      <div class="perf-stock-list">${stocksHtml}</div>
    </div>`;
  }).join('');
}

function switchRevSubTab(tab) {
  revSubTab = tab;
  document.querySelectorAll('.rev-stab').forEach(b =>
    b.classList.toggle('active', b.dataset.stab === tab));
  document.getElementById('revScreenSection').classList.toggle('hidden', tab !== 'screener');
  document.getElementById('revPerfSection').classList.toggle('hidden', tab !== 'perf');
  if (tab === 'perf') {
    updateRevPerfPrices().then(hist => renderRevPerfTab(hist));
  }
}

/* ── 출처별 매도 조건 ── */
// 출처별 표시 정보 (실제 매도 조건은 서버 _get_conditions()에서 스코어 기반으로 결정)
const SOURCE_META = {
  momentum: { label: '급등주', cls: 'src-momentum', desc: '목표 +7~15% / 손절 -3~5% / 트레일링·RSI·MA5' },
  value:    { label: '저PER',  cls: 'src-value',    desc: '목표 +20% / 손절 -10% / 트레일링 -15%' },
  reversal: { label: '반등',   cls: 'src-reversal', desc: '목표 +15% / 손절 -10% / 트레일링 -10% / MA5' },
  stock:    { label: '종목탭', cls: 'src-stock',    desc: '목표 +10% / 손절 -10% / 트레일링 -10% / MA5' },
};

async function addToWatchFromTab(ticker, name, market, source, price) {
  const exists = watchlist[market]?.find(i => i.code === ticker);
  if (exists) {
    const btn = document.querySelector(`[data-wl-ticker="${ticker}"]`);
    if (btn) { btn.textContent = '✅ 관심중'; setTimeout(() => { btn.textContent = '⭐ 관심'; }, 1500); }
    return;
  }
  try {
    // 조건은 서버(_get_conditions)에서 출처·스코어 기반으로 자동 결정
    await fetch(SERVER + '/purchase', {
      method: 'POST',
      headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, name, market, entry_price: price, quantity: 1, source, score: 5, signals: [], rsi: 50 }),
    });
  } catch (e) { console.warn('Flask 등록 실패:', e); }
  if (!watchlist[market]) watchlist[market] = [];
  watchlist[market].push({
    code: ticker, name,
    source, addPrice: price,
    addDate: new Date().toLocaleDateString('ko-KR'),
  });
  saveWatchlist();
  const btn = document.querySelector(`[data-wl-ticker="${ticker}"]`);
  if (btn) { btn.textContent = '✅ 관심중'; btn.classList.add('wl-added'); }
  ownedMap[ticker] = { ticker, name };
}

async function removeFromWatch(code, market) {
  watchlist[market] = (watchlist[market] || []).filter(i => i.code !== code);
  saveWatchlist();
  try { await fetch(SERVER + `/purchase/${code}`, { method: 'DELETE', headers: HDR }); } catch {}
  delete ownedMap[code];
  renderWatchlist();
  // 화면에 보이는 버튼 업데이트
  const btn = document.querySelector(`[data-wl-ticker="${code}"]`);
  if (btn) { btn.textContent = '⭐ 관심'; btn.classList.remove('wl-added'); }
}

function isInWatch(ticker, market) {
  return !!(watchlist[market] || []).find(i => i.code === ticker);
}

function watchBtnHtml(ticker, name, market, source, price) {
  const inWatch = isInWatch(ticker, market);
  return `<button class="wl-quick-btn${inWatch ? ' wl-added' : ''}" data-wl-ticker="${ticker}"
    onclick="event.stopPropagation();addToWatchFromTab('${ticker}','${escHtml(name)}','${market}','${source}',${price})">
    ${inWatch ? '✅ 관심중' : '⭐ 관심'}
  </button>`;
}

/* ── 보유종목 관리 ── */
let ownedMap    = {};  // ticker → purchase info
let _scItemMap  = {};  // ticker → screener item (모달용)
let _lastScRes  = [];  // 마지막 스크리너 결과

async function loadPurchases() {
  try {
    const data = await apiFetch('/purchase');
    ownedMap = {};
    (data || []).forEach(p => { ownedMap[p.ticker] = p; });
  } catch {}
}

let _buyTicker = null;

function openBuyModal(ticker) {
  const item = _scItemMap[ticker];
  if (!item) return;
  _buyTicker = ticker;
  const ex  = calcExitPlan(item);
  const mkt = screenerMarket;
  const priceStr = mkt === 'us'
    ? item.price.toFixed(2)
    : String(Math.round(item.price));
  document.getElementById('buyModalInfo').innerHTML =
    `<strong>${escHtml(item.name)}</strong> (${item.ticker})<br>` +
    `현재가: ${mkt === 'us' ? '$' + item.price.toFixed(2) : item.price.toLocaleString('ko-KR') + '원'}<br>` +
    `스코어: ${item.score}점 · RSI ${item.rsi}`;
  document.getElementById('buyPrice').value = priceStr;
  document.getElementById('buyQty').value   = 1;
  document.getElementById('buyExitInfo').innerHTML =
    `목표가: +${ex.targetPct}% &nbsp;|&nbsp; 손절가: -${ex.stopPct}% &nbsp;|&nbsp; 보유기간: ${ex.holdDays}<br>` +
    `조건 충족 시 카카오톡으로 알림을 발송합니다.`;
  document.getElementById('buyModal').classList.remove('hidden');
}

function closeBuyModal() {
  const modal = document.getElementById('buyModal');
  modal.classList.add('hidden');
  modal.dataset.mode = '';
  _buyTicker    = null;
  _revBuyTicker = null;
}

async function confirmBuy() {
  const isRev  = document.getElementById('buyModal').dataset.mode === 'rev';
  const ticker = isRev ? _revBuyTicker : _buyTicker;
  const item   = isRev ? _revLastRes.find(r => r.ticker === ticker) : _scItemMap[ticker];
  if (!item) return;
  const price = parseFloat(document.getElementById('buyPrice').value);
  const qty   = parseInt(document.getElementById('buyQty').value, 10);
  if (!price || !qty || qty < 1) { alert('매수가와 수량을 입력하세요.'); return; }

  const ex     = isRev ? calcRevExitPlan(item) : calcExitPlan(item);
  const market = isRev ? revMarket : screenerMarket;
  try {
    const res = await fetch(SERVER + '/purchase', {
      method: 'POST',
      headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker:      item.ticker,
        name:        item.name,
        market,
        entry_price: price,
        quantity:    qty,
        score:       item.score,
        signals:     item.signals,
        rsi:         item.rsi,
        target_pct:  ex.targetPct,
        stop_pct:    ex.stopPct,
        hold_days:   ex.holdDaysNum,
      }),
    });
    if (!res.ok) throw new Error('서버 오류');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    ownedMap[item.ticker] = { ticker: item.ticker, name: item.name };
    closeBuyModal();
    if (isRev) renderRevResults(_revLastRes);
    else renderScreenerResults(_lastScRes);
    alert(`✅ ${item.name} 매수 등록!\n서버가 10분마다 매도 조건을 확인하고\n카카오톡으로 알림을 보내드립니다.`);
  } catch (e) {
    alert('등록 실패: ' + e.message);
  }
}

async function sellStock(ticker) {
  if (!confirm(`${ticker} 매도 처리하시겠습니까?\n(보유종목 목록에서 삭제됩니다)`)) return;
  try {
    await fetch(SERVER + `/purchase/${ticker}`, { method: 'DELETE', headers: HDR });
    delete ownedMap[ticker];
    if (_revLastRes.find(r => r.ticker === ticker)) renderRevResults(_revLastRes);
    if (_lastScRes.find(r => r.ticker === ticker))  renderScreenerResults(_lastScRes);
  } catch (e) {
    alert('처리 실패: ' + e.message);
  }
}

/* ── 성과 추적 ── */
const PERF_KEY = 'perf_history_v1';

function loadHistory() {
  try {
    const r = localStorage.getItem(PERF_KEY);
    if (!r) return [];
    const all = JSON.parse(r);
    const cutoff = Date.now() - 7 * 864e5;          // 7일 이전 세션 제거
    const fresh = all.filter(s => s.ts >= cutoff);
    if (fresh.length !== all.length) saveHistory(fresh); // 자동 정리
    return fresh;
  } catch { return []; }
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
        <div style="margin-top:4px">${watchBtnHtml(stock.ticker, displayName, session.market, 'momentum', stock.entry_price)}</div>
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

    // ── 스크리너 v2.0 (2026-06-10, 백테스트 기반 개선) ──────
    // 변경 이력: D:\stock_app\SCREENER_CHANGELOG.md 참조
    let score = 0;
    const signals = [];

    // 거래량: 5배+ 추가, 1.5배 제거 (백테스트: 1.5배는 노이즈)
    if (vr >= 5)        { score += 4; signals.push(`거래량 ${vr.toFixed(1)}x`); }
    else if (vr >= 3)   { score += 2; signals.push(`거래량 ${vr.toFixed(1)}x`); }
    else if (vr >= 2)   { score += 1; signals.push(`거래량 ${vr.toFixed(1)}x`); }
    // 1.5배 미만: 0점 (노이즈)

    // RSI: 50~65로 하향 (백테스트: 과매수 구간 제거)
    // 75초과는 0점 (이미 과매수)
    if (rsi !== null) {
      if (rsi >= 50 && rsi <= 65) { score += 2; signals.push(`RSI ${rsi.toFixed(0)}`); }
      else if (rsi > 65 && rsi <= 75) { score += 1; signals.push(`RSI ${rsi.toFixed(0)}`); }
      // rsi > 75: 0점 (과매수, 오히려 위험)
    }

    if (macd.golden)      { score += 3; signals.push('골든크로스'); }
    else if (macd.bullish) { score += 1; signals.push('MACD 강세'); }

    if (ma5 && ma20 && ma60 && ma5 > ma20 && ma20 > ma60) { score += 2; signals.push('정배열'); }

    if (high52) { score += 2; signals.push('52주 신고가'); }

    // BB: 수축 후 돌파만 인정 (단순 상단 돌파는 역효과)
    if (bb.above && bb.squeeze)  { score += 3; signals.push('BB 수축돌파'); }  // 강력
    else if (bb.squeeze)          { score += 1; signals.push('BB 수축'); }       // 준비
    // bb.above 단독: 0점 (평균회귀 위험)

    if (chgPct >= 3)     score += 2;
    else if (chgPct >= 1) score += 1;

    // 최소 점수 4→7 상향 (백테스트: 7점 미만 승률 47% 이하)
    if (score < 7) return null;

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

function calcExitPlan(item) {
  // v2.0: 최소 7점부터 표시되므로 등급 조정
  let targetPct, stopPct, holdDays, holdDaysNum;
  if (item.score >= 10)     { targetPct = 15; stopPct = 5; holdDays = '최대 5거래일'; holdDaysNum = 5; }
  else if (item.score >= 8) { targetPct = 10; stopPct = 5; holdDays = '최대 3거래일'; holdDaysNum = 3; }
  else                       { targetPct = 8;  stopPct = 5; holdDays = '최대 2거래일'; holdDaysNum = 2; }
  const p = item.price;
  return {
    targetPct, stopPct, holdDays, holdDaysNum,
    targetPrice: p * (1 + targetPct / 100),
    stopPrice:   p * (1 - stopPct   / 100),
    rsiWarn:     item.rsi > 75,
    ma5Exit:     item.score < 10,
  };
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

  _lastScRes = results;
  _scItemMap = {};
  results.forEach(r => { _scItemMap[r.ticker] = r; });

  list.innerHTML = results.map(item => {
    const scoreCls = item.score >= 10 ? 'score-s' : item.score >= 7 ? 'score-a' : 'score-b';
    const chgCls   = item.change_pct >= 0 ? 'up' : 'down';
    const chgSign  = item.change_pct >= 0 ? '+' : '';
    const isOwned  = !!ownedMap[item.ticker];
    const mkt      = screenerMarket;
    const fmtP     = p => mkt === 'us'
      ? '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(p).toLocaleString('ko-KR') + '원';
    const price    = fmtP(item.price);
    const rsiCls   = item.rsi > 70 ? 'rsi-hot' : item.rsi >= 50 ? 'rsi-ok' : item.rsi >= 40 ? 'rsi-mid' : 'rsi-cool';
    const sigHtml  = item.signals.map(s => {
      const cls = s.includes('골든') || s.includes('신고가') ? 'hot'
                : s.includes('정배열') ? 'good' : '';
      return `<span class="sig-tag ${cls}">${s}</span>`;
    }).join('');
    const ex = calcExitPlan(item);
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
          ${isOwned ? '<div style="margin-top:4px"><span class="owned-badge">✅ 보유중</span></div>' : ''}
        </div>
      </div>
      <div class="sc-card-bottom">
        <span class="rsi-pill ${rsiCls}">RSI ${item.rsi}</span>
        <span class="sc-meta">거래량 ${item.vol_ratio}x</span>
        ${item.golden ? '<span class="sig-tag hot">✂️ 골든크로스</span>' : item.macd_bull ? '<span class="sig-tag">▲ MACD 강세</span>' : ''}
        ${sigHtml}
      </div>
      <div class="sc-exit">
        <span class="exit-target">▲ +${ex.targetPct}% ${fmtP(ex.targetPrice)}</span>
        <span class="exit-sep">|</span>
        <span class="exit-stop">▼ -${ex.stopPct}% ${fmtP(ex.stopPrice)}</span>
        <span class="exit-sep">|</span>
        <span class="exit-days">${ex.holdDays}</span>
        ${ex.rsiWarn ? '<span class="exit-warn">⚠ RSI 과열</span>' : ''}
        ${ex.ma5Exit ? '<span class="exit-note">MA5 이탈시 즉시 매도</span>' : ''}
        <span style="flex:1"></span>
        ${watchBtnHtml(item.ticker, item.name, screenerMarket, 'momentum', item.price)}
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

/* ── 저PER 스크리너 — 서버 /api/per/<market> 사용 ── */
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
    // 서버 측 스크리너 사용 (Kiwoom/Naver → yfinance 우선순위)
    const qs  = refresh ? '?refresh=true' : '';
    const data = await apiFetch(`/api/per/${perMarket}${qs}`);
    const results = data.results || [];

    if (!results.length) { emp.classList.remove('hidden'); return; }

    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: results }));
    renderPerResults(results);
  } catch (e) {
    emp.classList.remove('hidden');
    console.error('저PER 스크리너 오류:', e.message);
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
    const tpe    = item.trailing_pe;
    const perCls = fpe < 10 ? 'per-very-low' : fpe < 15 ? 'per-low' : fpe < 20 ? 'per-mid' : 'per-high';
    const chgCls = item.change_pct >= 0 ? 'up' : 'down';
    const sign   = item.change_pct >= 0 ? '+' : '';
    const isKr   = perMarket === 'kr';
    const price  = isKr
      ? (item.price ? item.price.toLocaleString('ko-KR') + '원' : '-')
      : (item.price ? '$' + item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-');

    // 펀더멘털 항목 헬퍼
    const fmtVal = (v, suffix='', digits=1) => v != null ? v.toFixed(digits) + suffix : '-';
    const metrics = [
      { label:'선행PER',    val: fpe != null ? fpe.toFixed(1) : '-',  cls: perCls },
      { label:'TTM PER',   val: tpe ? tpe.toFixed(1) : '-',          cls: '' },
      { label:'PBR',       val: item.pbr != null ? item.pbr.toFixed(2)+'x' : '-', cls: '' },
      { label:'ROE',       val: item.roe != null ? item.roe.toFixed(1)+'%' : '-',
        cls: item.roe >= 15 ? 'up' : item.roe < 5 ? 'down' : '' },
      { label:'배당수익률', val: item.div_yield != null ? item.div_yield.toFixed(2)+'%' : '-',
        cls: item.div_yield >= 3 ? 'up' : '' },
      { label:'업종PER',   val: item.sector_per != null ? item.sector_per.toFixed(1) : '-', cls: '' },
    ];
    const metricHtml = metrics.map(m =>
      `<div class="per-metric">
        <span class="per-metric-label">${m.label}</span>
        <span class="per-metric-val ${m.cls}">${m.val}</span>
      </div>`).join('');

    return `<div class="per-card" data-code="${item.ticker}${isKr?'.KS':''}" data-name="${escHtml(item.name)}">
      <div class="per-card-top">
        <div class="per-card-left">
          <div class="rank-num ${idx < 3 ? 'top3' : ''}">${idx+1}</div>
          <div class="per-info">
            <div class="per-name">${escHtml(item.name)}</div>
            <div class="per-sub">${item.ticker} · ${escHtml(item.sector)}</div>
          </div>
        </div>
        <div class="per-right">
          <div class="per-price">${price}</div>
          <div class="per-chg ${chgCls}">${sign}${item.change_pct}%</div>
          ${watchBtnHtml(item.ticker + (isKr?'.KS':''), item.name, perMarket, 'value', item.price || 0)}
        </div>
      </div>
      <div class="per-metrics-row">${metricHtml}</div>
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

/* ── 배당 스크리너 ── */
let divMarket = 'kr';

async function runDivScreener(refresh = false) {
  const btn  = document.getElementById('divRunBtn');
  const load = document.getElementById('divLoading');
  const list = document.getElementById('divList');
  const sum  = document.getElementById('divSummary');
  const emp  = document.getElementById('divEmpty');
  const qs   = refresh ? '?refresh=true' : '';

  btn.disabled = true; btn.textContent = '⏳ 수집 중...';
  load.classList.remove('hidden');
  [list, sum, emp].forEach(el => el.classList.add('hidden'));

  try {
    const data = await apiFetch(`/api/div/${divMarket}${qs}`);
    const results = data.results || [];
    if (!results.length) { emp.classList.remove('hidden'); return; }

    const now = new Date().toLocaleTimeString('ko-KR');
    const avg = (results.reduce((a, r) => a + r.div_yield, 0) / results.length).toFixed(2);
    sum.innerHTML = `<strong>${results.length}개</strong> 고배당 종목 &nbsp;|&nbsp;
      <span style="color:var(--green)">평균 배당수익률 ${avg}%</span> &nbsp;|&nbsp; ${now} (3시간 캐시)`;
    sum.classList.remove('hidden');

    list.innerHTML = results.map((item, idx) => {
      const isMrkt  = divMarket;
      const isKr    = isMrkt === 'kr';
      const priceStr = isKr
        ? (item.price ? Math.round(item.price).toLocaleString('ko-KR') + '원' : '-')
        : (item.price ? '$' + item.price.toLocaleString('en-US', {minimumFractionDigits:2}) : '-');
      const divRate  = item.div_rate
        ? (isKr ? Math.round(item.div_rate).toLocaleString('ko-KR') + '원' : '$' + item.div_rate.toFixed(2))
        : null;
      const yieldCls = item.div_yield >= 8 ? 'div-yield-high'
                     : item.div_yield >= 5 ? 'div-yield-mid' : 'div-yield-low';
      const chgCls   = item.change_pct >= 0 ? 'up' : 'down';
      const chgSign  = item.change_pct >= 0 ? '+' : '';

      return `<div class="div-card" data-code="${item.ticker}${isKr ? '.KS' : ''}" data-name="${escHtml(item.name)}">
        <div class="div-rank">${idx + 1}</div>
        <div class="div-info">
          <div class="div-name">${escHtml(item.name)}</div>
          <div class="div-sub">${item.ticker} · ${escHtml(item.sector)}</div>
          ${divRate ? `<div class="div-rate-label">연 배당금 ${divRate}${item.payout_ratio ? ` · 배당성향 ${item.payout_ratio}%` : ''}</div>` : ''}
        </div>
        <div class="div-right">
          <div class="${yieldCls}">${item.div_yield.toFixed(2)}%</div>
          <div class="div-price">${priceStr}</div>
          <div class="${chgCls}" style="font-size:11px">${chgSign}${item.change_pct}%</div>
          ${watchBtnHtml(item.ticker + (isKr ? '.KS' : ''), item.name, isMrkt, 'value', item.price || 0)}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.div-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        currentMarket = divMarket;
        document.querySelectorAll('.tab-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.market === divMarket));
        switchTab('home');
        selectStock(card.dataset.code, card.dataset.name);
      });
    });
    list.classList.remove('hidden');
  } catch (e) {
    emp.classList.remove('hidden');
    console.error('배당 스크리너 오류:', e.message);
  } finally {
    btn.disabled = false; btn.textContent = '▶ 실행';
    load.classList.add('hidden');
  }
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
    // 목표 주가 섹션 표시 + 초기화
    const ts = document.getElementById('targetSection');
    if (ts) {
      ts.style.display = '';
      _sectorData = null;
      document.getElementById('targetContent').innerHTML =
        '<div style="color:var(--muted);font-size:12px">↺ 업종 분석 버튼을 클릭하세요</div>';
      document.getElementById('customPerResult').innerHTML = '';
      const inp = document.getElementById('customPerInput');
      if (inp) inp.value = '';
    }
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

async function renderWatchlist() {
  const panel = document.getElementById('watchlistPanel');
  const items = watchlist[watchMarket] || [];
  if (!items.length) {
    panel.innerHTML = '<div class="wl-empty">관심종목이 없습니다.<br>각 탭의 ⭐ 버튼으로 추가하세요.</div>';
    return;
  }

  const isKr = watchMarket === 'kr';

  // 1단계: 즉시 렌더 (현재가 로딩 플레이스홀더)
  panel.innerHTML = items.map(item => {
    const src = SOURCE_META[item.source];
    const entryPrice = Number(item.addPrice) || 0;
    const entryStr = entryPrice
      ? (isKr ? entryPrice.toLocaleString('ko-KR') + '원' : '$' + entryPrice.toFixed(2))
      : null;
    const cond = src ? src.desc : null;

    return `
    <div class="wl-card ${item.code === currentSymbol ? 'active' : ''}"
         data-code="${item.code}" data-name="${escHtml(item.name || item.code)}"
         data-entry="${entryPrice}">
      <div class="wl-info" style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="wl-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(item.name || item.code)}</div>
          <div id="wl-price-${item.code}" style="text-align:right;flex-shrink:0;margin-left:8px;font-size:13px;color:var(--muted)">조회중…</div>
        </div>
        <div class="wl-code">${item.code}${item.addDate ? ' · ' + item.addDate : ''}</div>
        <div class="wl-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px">
          ${src ? `<span class="wl-src-badge ${src.cls}">${src.label}</span>` : ''}
          ${entryStr ? `<span class="wl-add-price">진입 ${entryStr}</span>` : ''}
          <span id="wl-pnl-${item.code}" style="font-size:11px;color:var(--muted)"></span>
        </div>
        ${cond ? `<div class="wl-cond">${cond}</div>` : ''}
      </div>
      <button class="wl-remove" data-code="${item.code}" data-market="${watchMarket}" title="관심 해제">×</button>
    </div>`;
  }).join('');

  // 이벤트 바인딩
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
    btn.addEventListener('click', () => removeFromWatch(btn.dataset.code, btn.dataset.market));
  });

  // 2단계: 현재가 병렬 조회
  const fetchPrice = async (item) => {
    const entryPrice = Number(item.addPrice) || 0;
    const priceEl = document.getElementById(`wl-price-${item.code}`);
    const pnlEl   = document.getElementById(`wl-pnl-${item.code}`);
    if (!priceEl) return;
    try {
      const url = isKr
        ? `${SERVER}/api/kr/quote/${item.code}`
        : `${SERVER}/api/us/quote/${item.code}`;
      const q = await fetch(url, { headers: HDR }).then(r => r.json());
      const cur = Number(q.price || q.regularMarketPrice || q.currentPrice || 0);
      if (!cur) { priceEl.textContent = '-'; return; }

      // 현재가 표시
      const curStr = isKr ? cur.toLocaleString('ko-KR') + '원' : '$' + cur.toFixed(2);
      const chg    = Number(q.change_pct || q.regularMarketChangePercent || 0);
      const chgCol = chg >= 0 ? 'var(--green)' : 'var(--red)';
      const chgStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      priceEl.innerHTML = `<span style="font-weight:700;color:${chgCol}">${curStr}</span>
        <span style="font-size:10px;color:${chgCol};margin-left:3px">${chgStr}</span>`;

      // 진입가 대비 수익
      if (entryPrice > 0) {
        const diff    = cur - entryPrice;
        const diffPct = diff / entryPrice * 100;
        const diffCol = diff >= 0 ? 'var(--green)' : 'var(--red)';
        const diffStr = isKr
          ? (diff >= 0 ? '+' : '') + Math.round(diff).toLocaleString('ko-KR') + '원'
          : (diff >= 0 ? '+' : '') + '$' + Math.abs(diff).toFixed(2);
        pnlEl.innerHTML = `<span style="color:${diffCol};font-weight:600">${diffStr} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)</span>`;
      }
    } catch {
      priceEl.textContent = '-';
    }
  };

  // 동시에 최대 5개씩 조회
  for (let i = 0; i < items.length; i += 5) {
    await Promise.all(items.slice(i, i + 5).map(fetchPrice));
  }
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

document.querySelectorAll('.rev-stab').forEach(btn =>
  btn.addEventListener('click', () => switchRevSubTab(btn.dataset.stab)));

document.querySelectorAll('.rev-mkt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rev-mkt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    revMarket = btn.dataset.m;
    ['revList', 'revSummary', 'revEmpty'].forEach(id => document.getElementById(id).classList.add('hidden'));
  });
});

document.getElementById('revRunBtn').addEventListener('click', () => runRevScreener(false));
document.getElementById('revRefreshBtn').addEventListener('click', () => runRevScreener(true));
document.getElementById('revPerfUpdateBtn').addEventListener('click', () =>
  updateRevPerfPrices().then(hist => renderRevPerfTab(hist)));

document.querySelectorAll('.div-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.div-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    divMarket = btn.dataset.m;
    ['divList','divSummary','divEmpty'].forEach(id => document.getElementById(id).classList.add('hidden'));
  });
});
document.getElementById('divRunBtn').addEventListener('click', () => runDivScreener(false));
document.getElementById('divRefreshBtn').addEventListener('click', () => runDivScreener(true));

document.querySelectorAll('.wl-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wl-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    watchMarket = btn.dataset.market;
    renderWatchlist();
  });
});

/* ── AI 분석 (뉴스·전자공시·밸류에이션) ── */
function openAiModal(title) {
  document.getElementById('aiModalTitle').textContent = title;
  document.getElementById('aiModalContent').innerHTML =
    '<div class="ai-loading"><div class="spinner"></div><p>Gemini AI 분석 중...<br><small>검색 및 분석에 15~30초 소요됩니다</small></p></div>';
  document.getElementById('aiModal').classList.remove('hidden');
}
function closeAiModal() {
  document.getElementById('aiModal').classList.add('hidden');
  // 채팅 레이아웃 리셋 (다음 일반 AI 패널 표시 위해)
  const c = document.getElementById('aiModalContent');
  c.style.cssText = '';
}

function _sentimentBadge(s) {
  const map = { positive: ['긍정적', '#3fb950'], negative: ['부정적', '#f85149'], neutral: ['중립', '#8b949e'] };
  const [label, color] = map[s] || ['중립', '#8b949e'];
  return `<span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:700">${label}</span>`;
}

async function runAiNews() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('📰 뉴스요약 — ' + name);
  try {
    const d = await fetch(SERVER + '/ai/news', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket }),
    }).then(r => r.json());

    if (d.error && !d.news) { document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">${escHtml(d.raw || d.error)}</p>`; return; }

    const newsHtml = (d.news || []).map(n => `
      <div class="ai-news-item">
        <div class="ai-news-title">${escHtml(n.title || '')} ${_sentimentBadge(n.sentiment)}</div>
        <div class="ai-news-meta">${escHtml(n.source || '')} · ${escHtml(n.date || '')}</div>
        <div class="ai-news-summary">${escHtml(n.summary || '')}</div>
      </div>`).join('');

    document.getElementById('aiModalContent').innerHTML = `
      <div class="ai-section-title">📋 주요 뉴스</div>
      ${newsHtml}
      <div class="ai-section-title" style="margin-top:16px">🔍 수익성 영향 분석</div>
      <div class="ai-impact">${escHtml(d.impact_analysis || '')}</div>
      <div class="ai-footer-row">
        <span>종합 전망: ${_sentimentBadge(d.overall_sentiment)}</span>
        ${d.key_risk ? `<span style="color:var(--red)">⚠ ${escHtml(d.key_risk)}</span>` : ''}
        ${d.key_opportunity ? `<span style="color:var(--green)">✅ ${escHtml(d.key_opportunity)}</span>` : ''}
      </div>`;
  } catch (e) {
    document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

async function runAiDart() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('📋 전자공시요약 — ' + name);
  try {
    const d = await fetch(SERVER + '/ai/dart', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket }),
    }).then(r => r.json());

    if (d.error && !d.annual_report && !d.latest_quarter) {
      document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">${escHtml(d.raw || d.error)}</p>`; return;
    }

    const isDart = d._source === 'DART';  // 실제 DART vs AI 추정
    const lq = d.latest_quarter || {};
    const ar = d.annual_report || {};

    // DART 실제 공시 링크 포함
    const disclosures = (d.recent_disclosures || []).map(dc => {
      const link = dc.url
        ? `<a href="${escHtml(dc.url)}" target="_blank" style="color:var(--accent);font-size:11px">원문 보기 →</a>`
        : '';
      return `<div class="ai-news-item">
        <div class="ai-news-title">${escHtml(dc.title || '')} ${link}</div>
        <div class="ai-news-meta">${escHtml(dc.date || '')}${dc.summary ? ' · ' + escHtml(dc.summary) : ''}</div>
      </div>`;
    }).join('');

    // AI 추정값인 경우 기존 필드 처리
    const lqHighlights = (lq.highlights || []).map(k => `<li>${escHtml(k)}</li>`).join('');
    const keyPoints    = (ar.key_points  || []).map(k => `<li>${escHtml(k)}</li>`).join('');
    const risks        = (d.major_risks  || []).map(r => `<li style="color:var(--red)">${escHtml(r)}</li>`).join('');

    const sourceLabel = isDart
      ? `<span style="color:var(--green);font-weight:700">✅ DART 실제 공시 데이터</span>`
      : `<span style="color:var(--gold)">⚠ AI 추정값 (DART 미연동 종목)</span>`;

    // 전년비 배지
    function prevBadge(cur, prev) {
      if (!prev || prev === '-') return '';
      return `<div style="font-size:10px;color:var(--muted)">직전: ${escHtml(prev)}</div>`;
    }

    document.getElementById('aiModalContent').innerHTML = `
      <div style="margin-bottom:10px">${sourceLabel}</div>
      ${lq.period ? `
      <div class="ai-section-title" style="color:var(--gold)">⭐ 최근 분기 실적 — ${escHtml(lq.period)}${lq.fs_source ? ` <span style="font-size:10px;color:var(--muted)">(${escHtml(lq.fs_source)})</span>` : ''}</div>
      <div class="ai-metrics-row">
        ${lq.revenue ? `<div class="ai-metric"><span>매출액</span><strong>${escHtml(lq.revenue)}</strong>${prevBadge(lq.revenue, lq.revenue_prev||lq.revenue_yoy)}</div>` : ''}
        ${lq.operating_profit ? `<div class="ai-metric"><span>영업이익</span><strong>${escHtml(lq.operating_profit)}</strong>${prevBadge(lq.operating_profit, lq.op_prev||lq.op_yoy)}</div>` : ''}
        ${lq.net_profit ? `<div class="ai-metric"><span>순이익</span><strong>${escHtml(lq.net_profit)}</strong></div>` : ''}
        ${lq.op_margin ? `<div class="ai-metric"><span>영업이익률</span><strong>${escHtml(lq.op_margin)}</strong></div>` : ''}
      </div>
      ${lqHighlights ? `<ul class="ai-list">${lqHighlights}</ul>` : ''}
      ${lq.guidance ? `<div class="ai-impact" style="border-left-color:var(--gold)">📢 가이던스: ${escHtml(lq.guidance)}</div>` : ''}
      ` : '<div style="color:var(--muted);font-size:13px;margin:8px 0">최근 분기보고서 없음</div>'}
      <div class="ai-section-title" style="margin-top:16px">📊 ${escHtml(ar.year || '')} 연간 사업보고서${ar.fs_source ? ` <span style="font-size:10px;color:var(--muted)">(${escHtml(ar.fs_source)})</span>` : ''}</div>
      <div class="ai-metrics-row">
        ${ar.revenue ? `<div class="ai-metric"><span>매출액</span><strong>${escHtml(ar.revenue)}</strong></div>` : ''}
        ${ar.operating_profit ? `<div class="ai-metric"><span>영업이익</span><strong>${escHtml(ar.operating_profit)}</strong></div>` : ''}
        ${ar.net_profit ? `<div class="ai-metric"><span>당기순이익</span><strong>${escHtml(ar.net_profit)}</strong></div>` : ''}
        ${ar.op_margin ? `<div class="ai-metric"><span>영업이익률</span><strong>${escHtml(ar.op_margin)}</strong></div>` : ''}
      </div>
      ${keyPoints ? `<ul class="ai-list">${keyPoints}</ul>` : ''}
      ${d.business_outlook ? `<div class="ai-section-title" style="margin-top:16px">🔭 사업 전망</div><div class="ai-impact">${escHtml(d.business_outlook)}</div>` : ''}
      ${risks ? `<ul class="ai-list ai-risk-list">${risks}</ul>` : ''}
      ${disclosures ? `<div class="ai-section-title" style="margin-top:16px">📄 최근 공시${isDart ? ' (실제)' : ''}</div>${disclosures}` : ''}
      ${d.ai_opinion ? `
      <div class="ai-section-title" style="margin-top:16px">🤖 AI 재무의견</div>
      <div class="ai-impact" style="border-left-color:var(--violet)">${escHtml(d.ai_opinion)}</div>` : ''}
      <div class="ai-source">출처: ${escHtml(d.source || '')}</div>
      ${!isDart ? `<div class="ai-disclaimer" style="border-color:rgba(248,81,73,.3);background:rgba(248,81,73,.05)">
        ⚠ AI 추정값입니다. 실제 DART 공시와 다를 수 있습니다. 투자 전 반드시 <a href="https://dart.fss.or.kr" target="_blank" style="color:var(--accent)">DART 원문</a>을 확인하세요.
      </div>` : ''}`;
  } catch (e) {
    document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

async function runAiValuation() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('💡 밸류에이션 분석 — ' + name);
  const fundamentals = {
    per:        document.getElementById('mPer')?.textContent,
    fpe:        document.getElementById('mFpe')?.textContent,
    pbr:        document.getElementById('mPbr')?.textContent,
    eps:        document.getElementById('mEps')?.textContent,
    roe:        document.getElementById('mRoe')?.textContent,
    dividend:   document.getElementById('mDiv')?.textContent,
    market_cap: document.getElementById('mMcap')?.textContent,
  };
  try {
    const d = await fetch(SERVER + '/ai/valuation', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket, fundamentals }),
    }).then(r => r.json());

    if (d.error && !d.scores) { document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">${escHtml(d.raw || d.error)}</p>`; return; }

    const sc = d.scores || {};
    function scoreBar(val, label, reverse = false) {
      const n = parseInt(val) || 0;
      const col = reverse
        ? (n < 40 ? 'var(--green)' : n < 70 ? 'var(--gold)' : 'var(--red)')
        : (n >= 70 ? 'var(--green)' : n >= 40 ? 'var(--gold)' : 'var(--red)');
      return `<div class="score-bar-row">
        <span class="score-bar-label">${label}</span>
        <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${n}%;background:${col}"></div></div>
        <span class="score-bar-val" style="color:${col}">${n}</span>
      </div>`;
    }
    const cons = d.consensus || {};
    const risks = (d.risks || []).map(r => `<li style="color:var(--red)">${escHtml(r)}</li>`).join('');

    document.getElementById('aiModalContent').innerHTML = `
      <div class="ai-section-title">📊 애널리스트 컨센서스</div>
      <div class="ai-metrics-row">
        ${cons.target_price ? `<div class="ai-metric"><span>목표주가</span><strong>${escHtml(cons.target_price)}</strong></div>` : ''}
        ${cons.upside ? `<div class="ai-metric"><span>상승여력</span><strong style="color:var(--green)">${escHtml(cons.upside)}</strong></div>` : ''}
        ${cons.buy_count ? `<div class="ai-metric"><span>매수/중립/매도</span><strong>${escHtml(cons.buy_count+'/'+(cons.hold_count||0)+'/'+(cons.sell_count||0))}</strong></div>` : ''}
      </div>
      <div class="ai-section-title" style="margin-top:16px">📈 종합 점수 (0~100)</div>
      ${scoreBar(sc.risk_score, '리스크 점수 (낮을수록 안전)', true)}
      ${scoreBar(sc.growth_score, '수익성 점수')}
      ${scoreBar(sc.buy_score, '매수의견 수치화')}
      <div class="ai-section-title" style="margin-top:16px">🔍 업종 비교 · 성장 전망</div>
      <div class="ai-impact">${escHtml(d.sector_comparison || '')} ${escHtml(d.growth_outlook || '')}</div>
      ${risks ? `<div class="ai-section-title" style="margin-top:12px">⚠ 주요 리스크</div><ul class="ai-list ai-risk-list">${risks}</ul>` : ''}
      <div class="ai-section-title" style="margin-top:16px">📝 종합 의견</div>
      <div class="ai-impact" style="font-style:italic">${escHtml(d.verdict || '')}</div>
      <div class="ai-disclaimer">⚠ 본 분석은 참고용이며 투자 권유가 아닙니다.</div>`;
  } catch (e) {
    document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

/* ── 운세 탭 ── */
async function runFortune() {
  const birthDate = document.getElementById('fortuneBirthDate').value;
  if (!birthDate) { alert('생년월일을 입력하세요.'); return; }
  const birthTime  = document.getElementById('fortuneBirthTime').value;
  const calType    = document.querySelector('input[name="calType"]:checked')?.value || 'solar';
  const load = document.getElementById('fortuneLoading');
  const result = document.getElementById('fortuneResult');
  load.classList.remove('hidden');
  result.classList.add('hidden');
  try {
    const d = await fetch(SERVER + '/ai/fortune', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth_date: birthDate, birth_time: birthTime, calendar_type: calType }),
    }).then(r => r.json());

    load.classList.add('hidden');
    if (d.error) { result.innerHTML = `<p style="color:var(--red)">${escHtml(d.raw || d.error)}</p>`; result.classList.remove('hidden'); return; }

    const hx = d.hexagram || {};
    const stocks = (d.recommended_stocks || []).map(s => `
      <div class="fortune-stock-card" onclick="currentMarket='${s.market}';switchTab('home');selectStock('${s.ticker}${s.market==='kr'?'.KS':''}','${escHtml(s.name)}')">
        <div class="fortune-stock-name">${escHtml(s.name)} <span style="color:var(--muted);font-size:11px">${s.ticker}</span></div>
        <div class="fortune-stock-reason">${escHtml(s.reason || '')}</div>
      </div>`).join('');

    const luckyHtml = (d.lucky_sectors || []).map(s => `<span class="fortune-sector">${escHtml(s)}</span>`).join('');

    result.innerHTML = `
      <div class="fortune-hexagram">
        <div class="fortune-symbol">${escHtml(hx.symbol || '☰')}</div>
        <div class="fortune-hx-name">${escHtml(hx.number || '')}. ${escHtml(hx.name_ko || '')} <span style="color:var(--muted)">${escHtml(hx.name_cn || '')}</span></div>
        <div class="fortune-lucky-row">
          ${d.lucky_number ? `<span class="fortune-lucky-badge">🔢 ${escHtml(d.lucky_number)}</span>` : ''}
          ${d.lucky_color  ? `<span class="fortune-lucky-badge">🎨 ${escHtml(d.lucky_color)}</span>`  : ''}
        </div>
      </div>
      <div class="fortune-card">
        <div class="fortune-section-title">💰 오늘의 재물운</div>
        <div class="fortune-text">${escHtml(d.wealth_fortune || '')}</div>
      </div>
      <div class="fortune-card">
        <div class="fortune-section-title">📈 오늘의 투자운</div>
        <div class="fortune-text">${escHtml(d.investment_fortune || '')}</div>
        <div class="fortune-text" style="color:var(--violet);font-size:12px">👉 ${escHtml(d.investment_guidance || '')}</div>
        ${luckyHtml ? `<div class="fortune-sectors" style="margin-top:8px">행운의 섹터: ${luckyHtml}</div>` : ''}
      </div>
      <div class="fortune-card">
        <div class="fortune-section-title">🎯 주역 추천 종목</div>
        ${stocks}
        <div class="fortune-caution" style="margin-top:8px">⚡ ${escHtml(d.caution || '')}</div>
      </div>
      <div class="ai-disclaimer">${escHtml(d.disclaimer || '본 내용은 오락 목적이며 투자 권유가 아닙니다.')}</div>`;
    result.classList.remove('hidden');
  } catch (e) {
    load.classList.add('hidden');
    result.innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
    result.classList.remove('hidden');
  }
}

/* ── 기업보고서 (NotebookLM) ── */
async function runNotebookLM() {
  if (!currentSymbol || currentMarket !== 'kr') {
    alert('한국 종목을 선택해야 노트북LM 기능을 사용할 수 있습니다.');
    return;
  }
  const name = document.getElementById('stockName').textContent;
  const btn  = document.getElementById('btnNotebookLM');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ 보고서 URL 준비 중...';

  try {
    // ngrok URL 가져오기
    const pubRes   = await fetch(SERVER + '/api/public-url', { headers: HDR });
    const ngrokUrl = (await pubRes.json()).url;
    if (!ngrokUrl) { alert('ngrok이 실행되지 않았습니다.'); return; }

    const clean      = currentSymbol.replace('.KS','').replace('.KQ','');
    const dartDocUrl = `${ngrokUrl}/dart-doc/${clean}`;

    // URL 클립보드 복사 + 서버 저장 + 보고서 미리 캐시
    try { await navigator.clipboard.writeText(dartDocUrl); } catch {}
    fetch(SERVER + '/nlm/store-url', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: dartDocUrl, company: name }),
    }).catch(() => {});
    fetch(dartDocUrl, { headers: { 'ngrok-skip-browser-warning': '1' } }).catch(() => {});

    // NotebookLM 소스추가 창 열린 상태로 오픈
    const NLM = 'https://notebooklm.google.com/notebook/bfc3f589-787d-4f6e-a508-a833514366ed';
    window.open(NLM + '?addSource=true', 'notebooklm');

    // 안내 모달
    openAiModal(`📒 노트북LM — ${name}`);
    document.getElementById('aiModalContent').innerHTML = `
      <div style="text-align:center;padding:12px 0 10px">
        <div style="font-size:32px">📋</div>
        <div style="font-size:15px;font-weight:700;margin:6px 0">URL이 클립보드에 복사됐습니다</div>
        <div style="font-size:12px;color:var(--muted)">NotebookLM 소스 추가 창이 자동으로 열렸습니다</div>
      </div>

      <div class="ai-impact" style="border-left-color:var(--green);margin:10px 0">
        <code style="font-size:10px;word-break:break-all;color:var(--muted)">${escHtml(dartDocUrl)}</code>
      </div>

      <div class="ai-section-title">다음 순서</div>
      <ol style="padding-left:18px;font-size:13px;line-height:2.4;margin-bottom:12px">
        <li>NotebookLM 탭으로 이동</li>
        <li><strong>웹사이트</strong> 버튼 클릭</li>
        <li><kbd style="background:var(--surface);border:1px solid var(--border);padding:1px 6px;border-radius:4px">Ctrl+V</kbd> 붙여넣기
          <span style="color:var(--muted);font-size:11px">(폰은 길게 눌러 붙여넣기)</span>
        </li>
        <li><strong>삽입</strong> → <strong>"${escHtml(name)} 보고서를 요약해줘"</strong> 질문</li>
      </ol>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="navigator.clipboard.writeText('${escHtml(dartDocUrl)}').then(()=>this.textContent='✅ 복사됨').catch(()=>{})" class="ai-btn">📋 URL 다시 복사</button>
        <button onclick="window.open('${NLM}?addSource=true','notebooklm')" class="ai-btn" style="color:#4285f4">📒 NotebookLM</button>
      </div>
      <div class="ai-disclaimer" style="margin-top:10px">※ 전년도 + 최근 정기보고서 2개 포함</div>`;

  } catch (e) {
    alert('오류: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

/* ── NotebookLM 셋업 ── */
async function startNlmSetup() {
  const btn = document.querySelector('#aiModalContent button');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 셋업 진행 중...'; }
  try {
    const r = await fetch(SERVER + '/nlm/setup', { method: 'POST', headers: HDR });
    const d = await r.json();
    const content = document.getElementById('aiModalContent');
    if (content) content.innerHTML += `<div class="ai-impact" style="border-left-color:var(--green);margin-top:10px">✅ ${escHtml(d.message)}</div>`;
  } catch(e) { alert('오류: ' + e.message); }
}

/* ── 목표 주가 산출 ── */
let _sectorData = null;  // 마지막 업종 분석 결과

async function loadSectorPer() {
  if (!currentSymbol) return;
  const btn = document.getElementById('targetRefreshBtn');
  const content = document.getElementById('targetContent');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 분석 중...'; }
  content.innerHTML = '<div style="color:var(--muted);font-size:12px">업종 시총 상위 종목 PER 수집 중... (30~60초 소요)</div>';

  try {
    const res = await fetch(SERVER + '/sector-per', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, market: currentMarket }),
    });
    const d = await res.json();
    if (d.error) { content.innerHTML = `<p style="color:var(--red)">${escHtml(d.error)}</p>`; return; }

    _sectorData = d;
    const isKr = currentMarket === 'kr';
    const fmt = (v) => v != null ? (isKr ? `${Math.round(v).toLocaleString('ko-KR')}원` : `$${v.toLocaleString('en-US',{minimumFractionDigits:2})}`) : '-';
    const fmtEps = (v) => v != null ? (isKr ? `${v.toLocaleString('ko-KR')}원` : `$${v.toFixed(2)}`) : '-';

    const peersHtml = (d.peers || []).map((p,i) =>
      `<span style="font-size:10px;color:var(--muted)">${i+1}.${escHtml(p.name)} <strong>${p.per}x</strong></span>`
    ).join(' &nbsp; ');

    content.innerHTML = `
      <div class="target-grid">
        <div class="target-item">
          <div class="target-label">업종명</div>
          <div class="target-val" style="font-size:11px">${escHtml(d.sector||'-')}</div>
        </div>
        <div class="target-item">
          <div class="target-label">업종 평균 PER</div>
          <div class="target-val" style="color:var(--gold)">${d.avg_per != null ? d.avg_per+'x' : '-'}</div>
        </div>
        <div class="target-item">
          <div class="target-label">TTM EPS</div>
          <div class="target-val">${fmtEps(d.eps)}</div>
        </div>
        <div class="target-item">
          <div class="target-label">선행 EPS</div>
          <div class="target-val">${fmtEps(d.fwd_eps)}</div>
        </div>
        <div class="target-item highlight">
          <div class="target-label">업종PER 기준 목표가 <small>(TTM EPS)</small></div>
          <div class="target-val" style="color:var(--green);font-size:16px">${fmt(d.target_by_sector)}</div>
        </div>
        <div class="target-item highlight">
          <div class="target-label">업종PER 기준 목표가 <small>(선행 EPS)</small></div>
          <div class="target-val" style="color:var(--accent);font-size:16px">${fmt(d.fwd_target_by_sector)}</div>
        </div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--muted)">
        📊 비교 기업 (시총 상위): ${peersHtml}
      </div>`;
  } catch(e) {
    content.innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↺ 업종 분석'; }
  }
}

function calcCustomPer() {
  const perInput = parseFloat(document.getElementById('customPerInput')?.value);
  const result   = document.getElementById('customPerResult');
  if (!result) return;
  if (!perInput || perInput <= 0) { result.innerHTML = '<span style="color:var(--red)">PER을 입력하세요</span>'; return; }

  const isKr = currentMarket === 'kr';
  const fmt = (v) => v != null ? (isKr ? `${Math.round(v).toLocaleString('ko-KR')}원` : `$${v.toFixed(2)}`) : '-';

  // 저장된 EPS 사용 (또는 화면에서 읽기)
  let eps = _sectorData?.eps;
  let fwdEps = _sectorData?.fwd_eps;

  // 화면에 표시된 EPS 값 폴백
  if (!eps) {
    const epsEl = document.getElementById('mEps');
    if (epsEl) {
      const parsed = parseFloat(epsEl.textContent.replace(/[^0-9.\-]/g,''));
      if (!isNaN(parsed)) eps = parsed;
    }
  }

  const ttmTarget = eps ? Math.round(eps * perInput) : null;
  const fwdTarget = fwdEps ? Math.round(fwdEps * perInput) : null;

  result.innerHTML = `
    <div class="target-grid" style="margin-top:6px">
      <div class="target-item highlight">
        <div class="target-label">PER ${perInput}x 목표가 <small>(TTM EPS)</small></div>
        <div class="target-val" style="color:var(--green);font-size:16px">${fmt(ttmTarget)}</div>
      </div>
      ${fwdTarget ? `<div class="target-item highlight">
        <div class="target-label">PER ${perInput}x 목표가 <small>(선행 EPS)</small></div>
        <div class="target-val" style="color:var(--accent);font-size:16px">${fmt(fwdTarget)}</div>
      </div>` : ''}
    </div>`;
}

/* ── 차트분석 ── */
async function runChartAnalysis() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('📈 차트분석 — ' + name);
  try {
    const d = await fetch(SERVER + '/ai/chart', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket }),
    }).then(r => r.json());

    if (d.error) { document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">${escHtml(d.error)}</p>`; return; }

    const opinionColor = d.opinion === 'buy' ? 'var(--green)' : d.opinion === 'sell' ? 'var(--red)' : 'var(--gold)';
    const opinionLabel = d.opinion === 'buy' ? '📈 매수' : d.opinion === 'sell' ? '📉 매도' : '⏸ 관망';
    const trendIcon    = d.trend === '상승' ? '↗' : d.trend === '하락' ? '↘' : '→';
    const score = parseInt(d.buy_score) || 0;
    const scoreColor = score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)';
    const scoreLabel = score >= 70 ? '매수 권장' : score >= 50 ? '중립·관망' : '매도·회피';

    // 지표 상세 카드 렌더링
    const indicatorCards = (d.indicator_details || []).map(ind => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:700;font-size:13px">${escHtml(ind.name)}</span>
          <span style="font-size:12px;color:var(--accent);font-weight:600">${escHtml(ind.value || '')}</span>
        </div>
        <div style="font-size:11px;color:var(--gold);margin-bottom:4px">📖 ${escHtml(ind.what || '')}</div>
        <div style="font-size:12px;color:#c9d1d9;line-height:1.6;margin-bottom:4px">${escHtml(ind.meaning || '')}</div>
        <div style="font-size:11px;color:var(--green)">→ ${escHtml(ind.action || '')}</div>
      </div>`).join('');

    const positives = (d.signals?.positive || []).map(s => `<li style="color:var(--green)">✅ ${escHtml(s)}</li>`).join('');
    const negatives = (d.signals?.negative || []).map(s => `<li style="color:var(--red)">❌ ${escHtml(s)}</li>`).join('');

    document.getElementById('aiModalContent').innerHTML = `
      <!-- ① 미니 차트 -->
      <div style="height:130px;margin-bottom:14px;position:relative">
        <canvas id="chartAnalysisMini"></canvas>
      </div>

      <!-- ② 매수의견 + 점수 -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="font-size:26px;font-weight:900;color:${opinionColor}">${opinionLabel}</div>
        <div style="flex:1">
          <div style="font-size:12px;color:var(--muted)">${trendIcon} ${escHtml(d.trend||'')} — ${escHtml(d.trend_desc||'')}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="flex:1;background:var(--border);border-radius:6px;height:10px;overflow:hidden">
          <div style="width:${score}%;height:100%;background:${scoreColor};border-radius:6px;transition:width .8s"></div>
        </div>
        <span style="font-size:20px;font-weight:800;color:${scoreColor}">${score}</span>
        <span style="font-size:11px;color:${scoreColor};width:56px">${scoreLabel}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">📌 ${escHtml(d.score_basis||'')}</div>

      <!-- ③ 지표별 상세 설명 -->
      <div class="ai-section-title">📐 기술지표 상세 분석</div>
      ${indicatorCards}

      <!-- ④ 신호 요약 -->
      <div class="ai-section-title" style="margin-top:10px">🔍 신호 요약</div>
      <ul class="ai-list" style="margin-bottom:10px">${positives}${negatives}</ul>

      <!-- ⑤ 지지/저항선 -->
      <div class="ai-metrics-row" style="margin-bottom:10px">
        ${d.support    ? `<div class="ai-metric"><span>지지선</span><strong style="color:var(--green)">${escHtml(d.support)}</strong></div>` : ''}
        ${d.resistance ? `<div class="ai-metric"><span>저항선</span><strong style="color:var(--red)">${escHtml(d.resistance)}</strong></div>` : ''}
      </div>

      <!-- ⑥ 종합 의견 -->
      <div class="ai-section-title">💬 종합 의견</div>
      <div class="ai-impact" style="border-left-color:${opinionColor};margin-bottom:8px">${escHtml(d.opinion_desc||'')}</div>

      <!-- ⑦ 단기 전망 -->
      ${d.short_term ? `<div class="ai-impact" style="border-left-color:var(--accent);margin-bottom:8px">📅 단기 전망: ${escHtml(d.short_term)}</div>` : ''}

      <!-- ⑧ 리스크 상세 -->
      ${(d.risk || d.risk_detail) ? `
      <div class="ai-section-title" style="margin-top:4px">⚠ 리스크 분석</div>
      <div class="ai-impact" style="border-left-color:var(--red)">
        <strong>${escHtml(d.risk||'')}</strong><br>
        <span style="font-size:12px;color:#c9d1d9">${escHtml(d.risk_detail||'')}</span>
      </div>` : ''}

      <div class="ai-disclaimer" style="margin-top:12px">⚠ 본 분석은 기술적 지표 기반 참고용이며 투자 권유가 아닙니다.</div>`;

    // 미니 차트 렌더링 (기존 priceChart 데이터 재활용)
    try {
      const miniCanvas = document.getElementById('chartAnalysisMini');
      if (miniCanvas && priceChart?.data?.labels?.length) {
        const last60 = n => priceChart.data.datasets[0].data.slice(-n);
        const labels60 = priceChart.data.labels.slice(-60);
        const closes60 = last60(60);
        const minP = Math.min(...closes60.filter(v=>v!=null));
        const maxP = Math.max(...closes60.filter(v=>v!=null));
        new Chart(miniCanvas, {
          type: 'line',
          data: {
            labels: labels60,
            datasets: [{
              data: closes60,
              borderColor: d.trend === '상승' ? '#3fb950' : d.trend === '하락' ? '#f85149' : '#58a6ff',
              borderWidth: 1.5, fill: true,
              backgroundColor: d.trend === '상승' ? 'rgba(63,185,80,.08)' : d.trend === '하락' ? 'rgba(248,81,73,.08)' : 'rgba(88,166,255,.06)',
              pointRadius: 0, tension: 0.3,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
              x: { display: false },
              y: { display: true, position: 'right', min: minP*0.98, max: maxP*1.02,
                   ticks: { color:'#8b949e', font:{size:9}, maxTicksLimit: 4,
                            callback: v => v >= 1000 ? Math.round(v/1000)+'k' : v },
                   grid: { color:'#21262d' } },
            },
          },
        });
      }
    } catch(e) { /* 차트 렌더 실패해도 계속 */ }
  } catch(e) {
    document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

/* ── 투자 대가 분석 (종목탭 버핏 버튼) ── */
/* ── AI Chat (종목 컨텍스트 기반 멀티턴 채팅) ── */
let _chatHistory = [];
let _chatSymbol  = null;

function openAiChat() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;

  // 종목이 바뀌면 히스토리 초기화
  if (_chatSymbol !== currentSymbol) {
    _chatHistory = [];
    _chatSymbol  = currentSymbol;
  }

  const modal = document.getElementById('aiModal');
  const titleEl = document.getElementById('aiModalTitle');
  const contentEl = document.getElementById('aiModalContent');

  titleEl.textContent = `💬 AI Chat — ${name}`;
  contentEl.innerHTML = '';
  modal.classList.remove('hidden');

  // 채팅 전용 레이아웃
  contentEl.style.cssText = 'display:flex;flex-direction:column;height:420px;padding:0;';
  contentEl.innerHTML = `
    <div id="chatMessages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;"></div>
    <div style="display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border);background:var(--bg);">
      <input id="chatInput" type="text" placeholder="${name}에 대해 질문하세요..." autocomplete="off"
        style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:8px;
               padding:9px 12px;color:var(--text);font-size:14px;outline:none;">
      <button id="chatSendBtn" style="background:#a78bfa;border:none;border-radius:8px;padding:9px 16px;
               color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">전송</button>
    </div>`;

  // 기존 히스토리 복원
  const msgBox = document.getElementById('chatMessages');
  _chatHistory.forEach(h => _appendChatBubble(msgBox, h.role, h.content));
  if (_chatHistory.length === 0) {
    _appendChatBubble(msgBox, 'assistant',
      `안녕하세요! ${name}에 대해 궁금한 점을 질문해 주세요.\n예) 오늘 하락 이유를 설명해줘 / PER 수준이 적정한가요?`);
  }
  msgBox.scrollTop = msgBox.scrollHeight;

  const input  = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  const sendMsg = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    sendBtn.disabled = true;

    _appendChatBubble(msgBox, 'user', msg);
    _chatHistory.push({ role: 'user', content: msg });
    msgBox.scrollTop = msgBox.scrollHeight;

    // 로딩 버블
    const loadId = 'chatLoad_' + Date.now();
    msgBox.insertAdjacentHTML('beforeend',
      `<div id="${loadId}" style="align-self:flex-start;background:var(--surface);border:1px solid var(--border);
         border-radius:12px 12px 12px 2px;padding:10px 14px;max-width:85%;color:var(--muted);font-size:13px;">
         <span style="animation:pulse 1s infinite">●</span> 답변 생성 중...
       </div>`);
    msgBox.scrollTop = msgBox.scrollHeight;

    try {
      const fund = {
        per:      document.getElementById('mPer')?.textContent,
        fpe:      document.getElementById('mFpe')?.textContent,
        pbr:      document.getElementById('mPbr')?.textContent,
        roe:      document.getElementById('mRoe')?.textContent,
        dividend: document.getElementById('mDiv')?.textContent,
        price:    document.getElementById('stockPrice')?.textContent,
      };
      const res = await fetch(SERVER + '/ai/chat', {
        method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: currentSymbol, name,
          market: currentMarket, ...fund,
          message: msg,
          history: _chatHistory.slice(0, -1),  // 방금 추가한 user 제외
        }),
      }).then(r => r.json());

      document.getElementById(loadId)?.remove();
      const answer = res.answer || res.error || '응답 없음';
      _appendChatBubble(msgBox, 'assistant', answer);
      _chatHistory.push({ role: 'assistant', content: answer });
    } catch(e) {
      document.getElementById(loadId)?.remove();
      _appendChatBubble(msgBox, 'assistant', '오류: ' + e.message);
    }

    sendBtn.disabled = false;
    msgBox.scrollTop = msgBox.scrollHeight;
    input.focus();
  };

  sendBtn.addEventListener('click', sendMsg);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  input.focus();
}

function _appendChatBubble(container, role, text) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.style.cssText = `
    align-self:${isUser ? 'flex-end' : 'flex-start'};
    background:${isUser ? 'rgba(167,139,250,.2)' : 'var(--surface)'};
    border:1px solid ${isUser ? 'rgba(167,139,250,.4)' : 'var(--border)'};
    border-radius:${isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};
    padding:10px 14px;max-width:85%;font-size:13px;line-height:1.7;
    color:var(--text);white-space:pre-wrap;word-break:break-word;`;
  div.textContent = text;
  container.appendChild(div);
}

async function runLegendAnalysis() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('🎩 투자 대가의 시각 — ' + name);
  const fund = {
    per:        document.getElementById('mPer')?.textContent,
    fpe:        document.getElementById('mFpe')?.textContent,
    pbr:        document.getElementById('mPbr')?.textContent,
    eps:        document.getElementById('mEps')?.textContent,
    roe:        document.getElementById('mRoe')?.textContent,
    dividend:   document.getElementById('mDiv')?.textContent,
    market_cap: document.getElementById('mMcap')?.textContent,
  };
  try {
    const d = await fetch(SERVER + '/ai/legends', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket, ...fund }),
    }).then(r => r.json());

    if (d.error) { document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">${escHtml(d.raw||d.error)}</p>`; return; }

    const legends = [
      { key:'buffett', label:'워렌 버핏',        icon:'🇺🇸', desc:'가치투자·경제적 해자·장기보유',  color:'#4285f4' },
      { key:'graham',  label:'벤저민 그레이엄',  icon:'📚', desc:'내재가치·안전마진·저PBR/PER',   color:'var(--gold)' },
      { key:'lynch',   label:'피터 린치',         icon:'📈', desc:'성장주·PEG·일상에서 발견',      color:'var(--green)' },
      { key:'dalio',   label:'레이 달리오',       icon:'🌊', desc:'거시경제·부채사이클·분산투자',  color:'var(--violet)' },
    ];

    const verdictLabel = v => v==='buy'?'✅ 매수':v==='avoid'?'❌ 회피':'⏸ 관망';
    const verdictColor = v => v==='buy'?'var(--green)':v==='avoid'?'var(--red)':'var(--gold)';

    const cardsHtml = legends.map(l => {
      const ld = d[l.key] || {};
      return `<div style="background:var(--surface);border:1px solid var(--border);border-left:3px solid ${l.color};border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:18px">${l.icon}</span>
            <strong style="font-size:14px;margin-left:6px">${l.label}</strong>
            <span style="font-size:10px;color:var(--muted);margin-left:6px">${l.desc}</span>
          </div>
          <span style="color:${verdictColor(ld.verdict)};font-weight:700;font-size:13px">${verdictLabel(ld.verdict||'hold')}</span>
        </div>
        <div style="font-size:13px;color:#c9d1d9;line-height:1.7;margin-bottom:6px">"${escHtml(ld.comment||'-')}"</div>
        ${ld.key_metric ? `<div style="font-size:11px;color:var(--muted)">📌 핵심지표: ${escHtml(ld.key_metric)}</div>` : ''}
      </div>`;
    }).join('');

    document.getElementById('aiModalContent').innerHTML = `
      ${cardsHtml}
      ${d.consensus ? `<div class="ai-impact" style="border-left-color:var(--gold);margin-top:4px">
        🏆 종합: ${escHtml(d.consensus)}</div>` : ''}
      <div class="ai-disclaimer">⚠ AI가 각 투자 대가의 철학을 기반으로 추론한 의견입니다. 실제 발언이 아닙니다.</div>`;
  } catch(e) {
    document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

/* ── AI 버튼 이벤트 ── */
document.getElementById('btnNews').addEventListener('click', runAiNews);
document.getElementById('btnDart').addEventListener('click', runAiDart);
document.getElementById('btnValuation').addEventListener('click', runAiValuation);
document.getElementById('btnChart').addEventListener('click', runChartAnalysis);
document.getElementById('btnLegends').addEventListener('click', runLegendAnalysis);
document.getElementById('btnNotebookLM').addEventListener('click', runNotebookLM);
document.getElementById('btnAiChat').addEventListener('click', openAiChat);

document.getElementById('fortuneRunBtn').addEventListener('click', runFortune);

/* ── 초기화 ── */
loadWatchlistData();
loadPurchases();
initCharts();
