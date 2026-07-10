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
  // ── 고변동·중소형·고베타 (2026-06 추가) ──
  'IONQ':'IonQ','RGTI':'Rigetti','QBTS':'D-Wave Quantum','ALAB':'Astera Labs','CRDO':'Credo',
  'WOLF':'Wolfspeed','AEHR':'Aehr Test','ON':'ON Semiconductor','MRVL':'Marvell',
  'OKLO':'Oklo','SMR':'NuScale Power','NNE':'Nano Nuclear','BE':'Bloom Energy','ENPH':'Enphase','PLUG':'Plug Power',
  'RKLB':'Rocket Lab','ASTS':'AST SpaceMobile','LUNR':'Intuitive Machines','ACHR':'Archer Aviation',
  'MARA':'MARA Holdings','RIOT':'Riot Platforms','CLSK':'CleanSpark','HUT':'Hut 8',
  'CELH':'Celsius','CAVA':'CAVA Group','DUOL':'Duolingo','RBLX':'Roblox','DKNG':'DraftKings',
  'RDDT':'Reddit','APP':'AppLovin','CVNA':'Carvana',
  'AFRM':'Affirm','UPST':'Upstart','NU':'Nu Holdings','SOFI':'SoFi',
  'VKTX':'Viking Therapeutics','CRSP':'CRISPR Therapeutics','HIMS':'Hims & Hers','MRNA':'Moderna',
  'BABA':'Alibaba','PDD':'PDD Holdings','JD':'JD.com','LI':'Li Auto','XPEV':'XPeng','NIO':'NIO',
  'GME':'GameStop','LCID':'Lucid','SNAP':'Snap',
  'PLTR':'Palantir','HOOD':'Robinhood','COIN':'Coinbase','MSTR':'MicroStrategy','SMCI':'Super Micro',
};

/* ── 스크리너 종목 목록 ── */
const US_SCREEN_LIST = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','LLY','AVGO','TSLA','WMT',
  'JPM','V','UNH','XOM','ORCL','MA','COST','HD','PG','JNJ',
  'ABBV','BAC','KO','MRK','CVX','NFLX','AMD','PEP','TMO','ADBE',
  'CRM','ACN','MCD','ABT','WFC','PM','TXN','NEE','ISRG','IBM',
  'CAT','AMGN','INTU','GS','SPGI','MS','BLK','AXP','NOW','BSX',
  'SCHW','ZTS','PANW','ETN','SO','HCA','LRCX','KLAC','MU','QCOM',
  // ── 고변동·중소형·고베타 (급등 후보군 확대) ──
  'IONQ','RGTI','QBTS','ALAB','CRDO','WOLF','AEHR','ON','MRVL',
  'OKLO','SMR','NNE','BE','ENPH','PLUG',
  'RKLB','ASTS','LUNR','ACHR',
  'MARA','RIOT','CLSK','HUT',
  'CELH','CAVA','DUOL','RBLX','DKNG','RDDT','APP','CVNA',
  'AFRM','UPST','NU','SOFI',
  'VKTX','CRSP','HIMS','MRNA',
  'BABA','PDD','JD','LI','XPEV','NIO',
  'GME','LCID','SNAP',
  'PLTR','HOOD','COIN','MSTR','SMCI'
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

/* ── 스크리너 로직 버전 (코드에 정의 → 화면에 주입: 실제 로드된 버전 확인용) ── */
const SCREENER_DESC_SURGE = '단기 급등 v3.0 (2026-06-15) — 추세(정배열)·신고가·거래량·RSI·골든크로스. 5~10일 보유. 임계값 한국6/미국7점';
const SCREENER_DESC_MID   = '3개월 유망 v1.1 (2026-06-17) — 변동성·6개월모멘텀·상승여력·장기추세 + 상대강도·매수세 품질, 초고변동(>90%)·단발급등 감점. 목표 +15%/3개월. 백테스트 달성 40%·중앙 +4.9% · ⚠ 손실 위험 큼';

const SCREENER_META = {
  scDesc:  { v: 'v3.0', date: '2026-06-15', desc: SCREENER_DESC_SURGE },
  oqDesc:  { v: 'v1.1', date: '2026-06-17', desc: SCREENER_DESC_MID },
  revDesc: { v: 'v2.0', date: '2026-06-15',
             desc: '반전 — BB 하단 복귀·거래량 반등(필수 트리거)·MA5 반전·MACD 개선. 백테스트 최악인 "52주 저가 근접" 제거. 임계값 한국 7 / 미국 5점' },
  perDesc: { v: 'v1.0', date: '기본',
             desc: '포워드 PER 기준 저평가 상위 종목 (야후 파이낸스). 로직 변경 없음' },
  divDesc: { v: 'v1.1', date: '2026-06-12',
             desc: '배당수익률 상위 20종목 (yfinance). 배당수익률 % 계산 오류 수정(QQQ 38%→0.38% 등)' },
};

function _renderScreenerVersions() {
  for (const [id, m] of Object.entries(SCREENER_META)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<strong style="color:var(--violet)">로직 ${m.v}</strong> `
      + `<span style="color:var(--muted)">(${m.date} 적용)</span> · ${escHtml(m.desc)}`;
  }
}

/* ── Flask 서버 (ngrok) ── */
const _V = 14; // version
const SERVER = 'https://bucked-swaddling-revenge.ngrok-free.dev';
const HDR = { 'ngrok-skip-browser-warning': '1' };

// 관심종목: 브라우저별 익명 ID (사용자끼리 목록이 섞이지 않도록 서버에 개별 보관)
const _clientId = (() => {
  let id = localStorage.getItem('clientId');
  if (!id) { id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); localStorage.setItem('clientId', id); }
  return id;
})();
// 소유자(카톡 알림 수신) 모드: 주소에 ?admin=토큰 을 한 번 붙여 들어오면 저장됨
(() => { try { const m = new URLSearchParams(location.search).get('admin'); if (m) localStorage.setItem('adminToken', m); } catch {} })();
const _adminToken = localStorage.getItem('adminToken') || '';
// 관심종목 API 전용 헤더 (client-id + 선택적 admin-token)
function WL_HDR(extra) {
  const h = { ...HDR, 'X-Client-Id': _clientId, ...(extra || {}) };
  if (_adminToken) h['X-Admin-Token'] = _adminToken;
  return h;
}

// 비차단 토스트 (모바일에서 alert 대신) — 화면 하단 중앙에 잠깐 표시
function toast(msg, isErr) {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:9999;max-width:86%;'
      + 'padding:11px 16px;border-radius:10px;font-size:13px;line-height:1.4;color:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4);'
      + 'opacity:0;transition:opacity .25s;pointer-events:none';
    document.body.appendChild(t);
  }
  t.style.background = isErr ? 'rgba(200,40,40,.95)' : 'rgba(40,40,48,.95)';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.opacity = '0'; }, 3200);
}

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

let _chartRange = '6mo';   // 차트 기간 (6mo/1y/3y/5y/10y)
async function fetchChart(symbol, range) {
  return apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=${range || _chartRange}&interval=1d`);
}

/* 선택한 기간으로 차트만 다시 로드 (시세는 그대로) */
async function loadChartRange(range) {
  if (!currentSymbol) return;
  _chartRange = range;
  document.querySelectorAll('.chart-range').forEach(b =>
    b.classList.toggle('active', b.dataset.range === range));
  try {
    const c = await fetchChart(currentSymbol, range);
    if (c) updateCharts(c);
  } catch (e) { console.error('차트 기간 로드 실패:', e); }
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
  'BB 하단 복귀': 3, '거래량 반등': 3,      // 실질 반전 트리거
  'MA5 반전 중': 2, 'MACD 개선 중': 2,      // 보조 확인
  'RSI 과매도 탈출': 1, '소폭 반등': 1,
};   // '52주 저가 근접'은 백테스트상 최악(하락지속)이라 제거

let revMarket  = 'kr';   // HTML 기본 활성 버튼(한국)과 일치시킴
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

/* ── 차트 오버레이용 전체 시계열 지표 ── */
function maSeriesFull(closes, period) {
  const out = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let s = 0, ok = true;
    for (let j = i - period + 1; j <= i; j++) { if (closes[j] == null) { ok = false; break; } s += closes[j]; }
    out.push(ok ? s / period : null);
  }
  return out;
}
function rsiSeriesFull(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i-1]; if (d > 0) ag += d; else al -= d; }
  ag /= period; al /= period;
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    ag = (ag * (period-1) + Math.max(d, 0)) / period;
    al = (al * (period-1) + Math.max(-d, 0)) / period;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}
function macdSeriesFull(closes) {
  const n = closes.length;
  if (n < 35) return { macd: [], signal: [], hist: [] };
  const e12 = emaSeries(closes, 12), e26 = emaSeries(closes, 26);
  const macd = e12.map((v, i) => v - e26[i]);
  const sigRaw = emaSeries(macd, 9);   // 전체 길이 유지(근사)
  const hist = macd.map((v, i) => v - sigRaw[i]);
  return { macd, signal: sigRaw, hist };
}
// 캔들 패턴 마커 (도지·장대양봉·해머·역해머·상승/하락장악)
function detectPatterns(o, h, l, c, times) {
  const m = [];
  for (let i = 1; i < c.length; i++) {
    if ([o[i], h[i], l[i], c[i]].some(v => v == null)) continue;
    const body = Math.abs(c[i] - o[i]), range = h[i] - l[i];
    if (range <= 0) continue;
    const up = c[i] >= o[i];
    const upSh = h[i] - Math.max(o[i], c[i]), loSh = Math.min(o[i], c[i]) - l[i];
    let text = null, pos = 'belowBar', color = 'var(--muted)', shape = 'circle';
    if (body / range < 0.1) { text = '도지'; color = '#c9a227'; }
    else if (body / range > 0.7 && range / (c[i]||1) > 0.045) {
      text = up ? '장대양봉' : '장대음봉'; color = up ? '#f85149' : '#58a6ff';
      pos = up ? 'belowBar' : 'aboveBar'; shape = up ? 'arrowUp' : 'arrowDown';
    }
    else if (loSh > body * 2 && upSh < body && body / range < 0.4) { text = '해머'; color = '#3fb950'; shape = 'arrowUp'; }
    else if (upSh > body * 2 && loSh < body && body / range < 0.4) { text = '역해머'; color = '#db6d28'; pos = 'aboveBar'; shape = 'arrowDown'; }
    else {
      // 장악형
      const pBody = Math.abs(c[i-1] - o[i-1]);
      if (up && c[i-1] < o[i-1] && c[i] > o[i-1] && o[i] < c[i-1] && body > pBody) { text = '상승장악'; color = '#f85149'; shape = 'arrowUp'; }
      else if (!up && c[i-1] > o[i-1] && c[i] < o[i-1] && o[i] > c[i-1] && body > pBody) { text = '하락장악'; color = '#58a6ff'; pos = 'aboveBar'; shape = 'arrowDown'; }
    }
    if (text) m.push({ time: times[i], position: pos, color, shape, text });
  }
  return m.slice(-40);   // 너무 많으면 최근 40개만
}

// 반전 매도 플랜 (2년 MFE/MAE 백테스트 기반)
// - 목표가: 진입 후 최대상승(MFE) 중앙값 ~+7%. 점수는 반등폭 예측력 거의 없어(7~8점 오히려 부진)
//   상위 점수(9+, 실제로 더 큼)만 +13%, 그 외 +8%로 현실화.
// - 손절: 변동성(ATR) 기반 1.7배, 4~8% 범위 (소형주 노이즈 손절 방지). MAE 중앙값(~-5%)과 정합.
function calcRevExitPlan(item) {
  const atr = Number(item.atr) || 4;
  const stopPct  = Math.round(Math.min(8, Math.max(4, atr * 1.7)) * 10) / 10;
  const targetPct = item.score >= 9 ? 13 : 8;
  const holdDaysNum = 15;
  const holdDays = '최대 15거래일 · 트레일링 권장';
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

    const highs2 = (data.high || []).map(v => v ?? null);
    const price  = closes[closes.length - 1];
    const prev   = closes[closes.length - 2] || price;

    // 거래대금 하한 (품절주·잡주 제거 — 20일 중앙값 기준: 이벤트성 급증에 안 휘둘림)
    if (!_liquidEnough(symbol, closes, volumes, price)) return null;

    const chgPct = prev ? ((price - prev) / prev * 100) : 0;
    const vr     = volRatio(volumes);

    // 급락 중 제외 — 단, 긴 아래꼬리+거래량(반전 망치형)은 예외로 허용
    // (예: 시초가 갭하락 후 장중 매수세로 저가서 크게 회복한 양봉성 캔들)
    if (chgPct < -4) {
      const _h = highs2[highs2.length - 1], _l = lows[lows.length - 1];
      const _rng = (_h != null && _l != null) ? _h - _l : 0;
      const _recov = _rng > 0 ? (price - _l) / _rng : 0;   // 당일 저가 대비 종가 회복도
      const _hammer = _recov >= 0.6 && vr >= 1.5;          // 망치형 반전(저가서 60%+ 회복 + 거래량)
      if (!_hammer) return null;
    }

    const rsi   = calcRSI(closes);
    if (rsi === null || rsi > 55 || rsi < 20) return null;  // 과매도 회복 구간만

    const ma5    = calcMA(closes, 5);
    const ma20   = calcMA(closes, 20);
    const ma60   = calcMA(closes, Math.min(60, closes.length));
    const ma5ago = calcMA(closes.slice(0, -3), 5);  // 3일 전 MA5
    const bb     = calcBB(closes);
    const bbPrev = calcBB(closes.slice(0, -5));
    const macdH  = calcMACDHistogram(closes);

    // ── 반등 스크리너 v2 (2년 백테스트 검증) ──────
    // '52주 저가 근접'은 최악(하락추세 지속, 평균 -1.2%)이라 제거.
    // 단순 과매도만으론 진입 안 함 — 실질 반전 트리거(BB 하단복귀/거래량 반등) 필수.
    // 검증: 미국 T+10 평균 +2.4%→+4.8%, 적중 27%→35%
    const weights = loadRevWeights();
    let score = 0;
    const signals = [];
    let trigger = false;

    // 신호 카테고리(중복 가산 방지) — 같은 '가격 회복' 현상을 여러 지표로 중복 점수화하지 않도록
    let catPrice = false, catVol = false, catMom = false;

    // ── 실질 반전 트리거 (둘 중 하나는 있어야 함) ──
    // BB 하단 복귀: 이전에 하단 아래였다가 현재 안으로 들어옴 [가격]
    if (bbPrev.below && !bb.below) {
      score += weights['BB 하단 복귀'];
      signals.push('BB 하단 복귀'); trigger = true; catPrice = true;
    }
    // 거래량 반등 (양봉 + 2배 이상) [거래량]
    if (vr >= 2 && chgPct > 0) {
      score += weights['거래량 반등'];
      signals.push(`거래량 반등 ${vr.toFixed(1)}x`); trigger = true; catVol = true;
    } else if (vr >= 1.5 && chgPct > 0) {
      score += 1;
      signals.push(`거래량 증가 ${vr.toFixed(1)}x`); catVol = true;
    }

    // ── 보조 확인 신호 ──
    // RSI 과매도 탈출 [모멘텀]
    if (rsi >= 28 && rsi <= 52) {
      score += weights['RSI 과매도 탈출'];
      signals.push(`RSI 과매도 탈출 (${rsi.toFixed(0)})`); catMom = true;
    }
    // MA5 반전 [가격]
    if (ma5 && ma20 && ma5 < ma20 && ma5ago && ma5 > ma5ago) {
      score += weights['MA5 반전 중'];
      signals.push('MA5 반전 중'); catPrice = true;
    }
    // MACD 히스토그램 개선 [모멘텀]
    if (macdH.improving) {
      score += weights['MACD 개선 중'];
      signals.push('MACD 개선 중'); catMom = true;
    }
    // 소폭 반등 (당일 +0.5% 이상) [가격]
    if (chgPct >= 0.5) {
      score += weights['소폭 반등'];
      signals.push(`반등 +${chgPct.toFixed(1)}%`); catPrice = true;
    }

    // ── 이평선 저항 마진 (역배열 반등은 머리 위 이평선이 저항 — 먹을 공간 평가) ──
    const _res = [ma20, ma60].filter(m => m && m > price);
    if (_res.length) {
      const margin = (Math.min(..._res) - price) / price * 100;
      if (margin < 2)       { score -= 2; signals.push('이평선 저항 임박'); }
      else if (margin >= 7) { score += 1; signals.push('상단 공간 충분'); }
    }

    // ── 부정 필터 (추격·분산 방지) ──
    {
      const _h = highs2[highs2.length - 1], _l = lows[lows.length - 1];
      const _o = (data.open || [])[(data.open || []).length - 1];
      const _rng = (_h != null && _l != null) ? _h - _l : 0;
      const _uw  = (_h != null) ? _h - Math.max(_o ?? price, price) : 0;
      if (_rng > 0 && _uw / _rng > 0.6 && vr >= 2) {   // 긴 윗꼬리 + 거래량 급증 = 분산 의심
        score -= 2; signals.push('긴 윗꼬리(-)');
      }
    }

    // 시장별 임계값 + 카테고리 교차 확인 (가격회복 + 거래량/모멘텀 중 하나)
    const isKrSym = /\.(KS|KQ)$/.test(symbol);
    const minScore = isKrSym ? 7 : 5;
    const crossConfirm = catPrice && (catVol || catMom);   // 같은 계열 중복만으론 통과 불가
    if (!trigger || !crossConfirm || score < minScore) return null;

    // ATR(14) % — 변동성 기반 손절폭 산정용
    let atrPct = null;
    if (highs2.length >= 15 && lows.length >= 15 && closes.length >= 15) {
      let trSum = 0, cnt = 0;
      for (let k = closes.length - 14; k < closes.length; k++) {
        const tr = Math.max(
          (highs2[k] ?? 0) - (lows[k] ?? 0),
          Math.abs((highs2[k] ?? 0) - (closes[k-1] ?? 0)),
          Math.abs((lows[k] ?? 0) - (closes[k-1] ?? 0)));
        if (isFinite(tr) && tr > 0) { trSum += tr; cnt++; }
      }
      if (cnt) atrPct = (trSum / cnt) / price * 100;
    }

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
      atr:        atrPct ? parseFloat(atrPct.toFixed(2)) : null,
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
    toast('스크리너 오류: ' + e.message, true);
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
  _entryCode    = ticker;
  _entryMarket  = revMarket;
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
  midterm:  { label: '1Q',     cls: 'src-momentum', desc: '목표 +15% / 손절 -10% / 최대 3개월 보유' },
  stock:    { label: '종목탭', cls: 'src-stock',    desc: '목표 +10% / 손절 -10% / 트레일링 -10% / MA5' },
};

async function addToWatchFromTab(ticker, name, market, source, price) {
  const exists = watchlist[market]?.find(i => i.code === ticker);
  if (exists) {
    const btn = document.querySelector(`[data-wl-ticker="${ticker}"]`);
    if (btn) { btn.textContent = '✅ 관심중'; setTimeout(() => { btn.textContent = '⭐ 관심'; }, 1500); }
    return;
  }
  const addDate = new Date().toLocaleDateString('ko-KR');
  try {
    await fetch(SERVER + `/api/watchlist/${market}/${ticker}`, {
      method: 'POST',
      headers: WL_HDR({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, market, source, add_price: price, add_date: addDate }),
    });
  } catch (e) { console.warn('Flask 등록 실패:', e); }
  if (!watchlist[market]) watchlist[market] = [];
  watchlist[market].push({ code: ticker, name, source, addPrice: price, addDate });
  saveWatchlist();
  _refreshOwnedMap();
  const btn = document.querySelector(`[data-wl-ticker="${ticker}"]`);
  if (btn) { btn.textContent = '✅ 관심중'; btn.classList.add('wl-added'); }
}

async function removeFromWatch(code, market) {
  watchlist[market] = (watchlist[market] || []).filter(i => i.code !== code);
  saveWatchlist();
  _refreshOwnedMap();
  try { await fetch(SERVER + `/api/watchlist/${market}/${code}`, { method: 'DELETE', headers: WL_HDR() }); } catch {}
  renderWatchlist();
  const btn = document.querySelector(`[data-wl-ticker="${code}"]`);
  if (btn) { btn.textContent = '⭐ 관심'; btn.classList.remove('wl-added'); }
}

function isInWatch(ticker, market) {
  return !!(watchlist[market] || []).find(i => i.code === ticker);
}

function watchBtnHtml(ticker, name, market, source, price) {
  const inWatch = isInWatch(ticker, market);
  // 데이터는 data-* 속성으로만 전달(인라인 onclick JS문자열에 이름을 넣지 않음).
  // 이전엔 name에 작은따옴표(McDonald's 등)가 있으면 onclick이 깨졌음 → 위임 리스너로 처리.
  return `<button class="wl-quick-btn${inWatch ? ' wl-added' : ''}" data-wl-ticker="${escHtml(ticker)}"
    data-wl-name="${escHtml(name)}" data-wl-market="${escHtml(market)}" data-wl-source="${escHtml(source || '')}" data-wl-price="${Number(price) || 0}">
    ${inWatch ? '✅ 관심중' : '⭐ 관심'}
  </button>`;
}

/* ── 보유 상태 (관심종목에서 파생) ── */
let ownedMap   = {};  // ticker → {ticker, name}  (entryPrice 있는 항목만)
let _scItemMap = {};  // ticker → screener item (모달용)
let _lastScRes = [];  // 마지막 스크리너 결과

function _refreshOwnedMap() {
  ownedMap = {};
  ['us', 'kr'].forEach(mkt => {
    (watchlist[mkt] || []).forEach(item => {
      if (item.entryPrice) ownedMap[item.code] = { ticker: item.code, name: item.name };
    });
  });
}

/* ── 매수가 설정 모달 (관심종목 카드에서 호출) ── */
let _entryCode   = null;
let _entryMarket = null;

function openBuyModal(ticker, marketOverride) {
  // 스크리너/반등 탭에서 호출 시: 관심종목에 추가 + 매수가 설정
  const isRev   = document.getElementById('buyModal').dataset.mode === 'rev';
  const mkt     = marketOverride || (isRev ? revMarket : screenerMarket);
  const scItem  = _scItemMap[ticker] || _revLastRes?.find(r => r.ticker === ticker);
  _entryCode    = ticker;
  _entryMarket  = mkt;
  _buyTicker    = ticker;

  const name      = scItem?.name || ticker;
  const curPrice  = scItem?.price || 0;
  const priceStr  = mkt === 'us' ? curPrice.toFixed(2) : String(Math.round(curPrice));
  const ex        = scItem ? (isRev ? calcRevExitPlan(scItem) : calcExitPlan(scItem)) : null;

  document.getElementById('buyModalInfo').innerHTML =
    `<strong>${escHtml(name)}</strong> (${ticker})<br>` +
    (curPrice ? `현재가: ${mkt === 'us' ? '$' + curPrice.toFixed(2) : curPrice.toLocaleString('ko-KR') + '원'}` : '');
  document.getElementById('buyPrice').value = priceStr;
  document.getElementById('buyQty').value   = 1;
  document.getElementById('buyExitInfo').innerHTML = ex
    ? `목표가: +${ex.targetPct}% | 손절가: -${ex.stopPct}% | 보유기간: ${ex.holdDays}<br>매수가 설정 시 장중 카카오톡 알림을 보내드립니다.`
    : `매수가 설정 시 장중 카카오톡 알림을 보내드립니다.`;
  document.getElementById('buyModal').classList.remove('hidden');
}

function openEntryModal(code, market) {
  // 관심종목 카드에서 직접 매수가 수정
  _entryCode   = code;
  _entryMarket = market;
  _buyTicker   = code;
  const item   = watchlist[market]?.find(i => i.code === code);
  const name   = item?.name || code;
  document.getElementById('buyModalInfo').innerHTML =
    `<strong>${escHtml(name)}</strong> (${code})<br>매수가를 입력하면 카카오톡 알림이 활성화됩니다.`;
  document.getElementById('buyPrice').value = item?.entryPrice || item?.addPrice || '';
  document.getElementById('buyQty').value   = item?.quantity || 1;
  document.getElementById('buyExitInfo').innerHTML =
    `매수가 입력 시 목표가·손절가 도달 시 장중 카카오톡으로 알림을 드립니다.<br>비워두면 알림이 해제됩니다.`;
  document.getElementById('buyModal').classList.remove('hidden');
}

function closeBuyModal() {
  const modal = document.getElementById('buyModal');
  modal.classList.add('hidden');
  modal.dataset.mode = '';
  _buyTicker    = null;
  _revBuyTicker = null;
  _entryCode    = null;
  _entryMarket  = null;
}

async function confirmBuy() {
  const ticker = _entryCode || _buyTicker;
  const market = _entryMarket || screenerMarket;
  if (!ticker) return;

  const price = parseFloat(document.getElementById('buyPrice').value) || null;
  const qty   = parseInt(document.getElementById('buyQty').value, 10) || 1;

  // 관심종목에 없으면 먼저 추가
  if (!watchlist[market]?.find(i => i.code === ticker)) {
    const scItem = _scItemMap[ticker] || _revLastRes?.find(r => r.ticker === ticker);
    const name   = scItem?.name || ticker;
    watchlist[market] = watchlist[market] || [];
    watchlist[market].push({ code: ticker, name, source: scItem?.source || '', addPrice: scItem?.price || 0,
      addDate: new Date().toLocaleDateString('ko-KR') });
  }

  // 로컬 watchlist에 entryPrice 설정
  const wItem = watchlist[market].find(i => i.code === ticker);
  if (wItem) {
    if (price) {
      wItem.entryPrice   = price;
      wItem.quantity     = qty;
      wItem.purchasedAt  = wItem.purchasedAt || new Date().toISOString();
    } else {
      delete wItem.entryPrice;
      delete wItem.quantity;
      delete wItem.purchasedAt;
    }
  }
  saveWatchlist();
  _refreshOwnedMap();

  // 서버 동기화
  const scItem = _scItemMap[ticker] || _revLastRes?.find(r => r.ticker === ticker);
  try {
    if (watchlist[market].find(i => i.code === ticker)) {
      await fetch(SERVER + `/api/watchlist/${market}/${ticker}`, {
        method: 'POST',
        headers: WL_HDR({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name:        wItem?.name || ticker,
          source:      scItem?.source || '',
          add_price:   scItem?.price || wItem?.addPrice || 0,
          add_date:    wItem?.addDate || '',
          entry_price: price || null,
          quantity:    price ? qty : null,
          score:       scItem?.score || 5,
          signals:     scItem?.signals || [],
          rsi:         scItem?.rsi || 50,
        }),
      });
    }
  } catch (e) { console.warn('서버 동기화 실패:', e); }

  closeBuyModal();
  // 화면 갱신
  const isRev = document.getElementById('buyModal').dataset.mode === 'rev';
  if (_revLastRes?.find(r => r.ticker === ticker)) renderRevResults(_revLastRes);
  if (_lastScRes?.find(r => r.ticker === ticker))  renderScreenerResults(_lastScRes);
  if (document.querySelector('.nav-btn[data-tab="watch"]')?.classList.contains('active') ||
      document.getElementById('watchPanel')?.style.display !== 'none') renderWatchlist();
  if (price) alert(`✅ ${wItem?.name || ticker} 매수가 설정!\n장중(9~15시) 매도 조건 충족 시 카카오톡으로 알림을 드립니다.`);
}

async function sellStock(ticker) {
  if (!confirm(`${ticker} 매도 처리하시겠습니까?\n(관심종목에서도 삭제됩니다)`)) return;
  const market = Object.keys(watchlist).find(m => watchlist[m]?.find(i => i.code === ticker)) || 'kr';
  await removeFromWatch(ticker, market);
  if (_revLastRes?.find(r => r.ticker === ticker)) renderRevResults(_revLastRes);
  if (_lastScRes?.find(r => r.ticker === ticker))  renderScreenerResults(_lastScRes);
}

let _buyTicker    = null;

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
  // 빈 결과는 캐시하지 않음 — 일시적 네트워크 실패가 "결과 없음"을 10분간 고정하는 버그 방지
  if (!Array.isArray(data) || data.length === 0) return;
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

/* ── 유동성 필터 (20일 거래대금 중앙값 + 초저가 제외) ── */
function _liquidEnough(symbol, closes, volumes, price) {
  const isKr = /\.(KS|KQ)$/.test(symbol);
  // 초저가주 제외 (미국: $2 미만 — 스프레드·조작 위험 / 한국: 1,000원 미만)
  if (isKr ? price < 1000 : price < 2) return false;
  // 최근 20일 거래대금 '중앙값' (하루 이벤트성 급증에 안 휘둘림)
  const dv = [];
  for (let i = Math.max(0, closes.length - 20); i < closes.length; i++) {
    dv.push((closes[i] || 0) * (volumes[i] || 0));
  }
  if (!dv.length) return false;
  dv.sort((a, b) => a - b);
  const median = dv[Math.floor(dv.length / 2)];
  const minDV = isKr ? 3e9 : 1e7;   // 한국 30억원 / 미국 $10M (microcap 노이즈 차단)
  return median >= minDV;
}

/* ── 단일 종목 스크리닝 ── */
async function screenOne(symbol) {
  try {
    const data = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`);
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
    const bb      = calcBB(closes);

    // ── 거래대금 하한 필터 (품절주·잡주 노이즈 제거, 20일 중앙값 기준) ──
    if (!_liquidEnough(symbol, closes, volumes, price)) return null;

    // ── 스크리너 v3 (모멘텀 중심, 2년 백테스트 검증) ──────
    // 추세·신고가가 실제 예측력 핵심. 거래량 급등·BB 단순돌파·MACD 상향은
    // 백테스트에서 예측력이 약해(일부는 음(-) 수익) 비중 축소·제거.
    // 검증: KR T+5 적중 32%→42%(평균 +1.9%→+3.2%), 미국 변동성유니버스 고점수 적중 40%+
    let score = 0;
    const signals = [];
    // 52주 고점 대비 위치 (1년 데이터 → 진짜 신고가 판정)
    const hiArr = highs.length >= 252 ? highs.slice(-252) : highs;
    const hi = hiArr.length ? Math.max(...hiArr) : 0;
    const highPct = hi > 0 ? (price / hi * 100) : 0;

    // ① 추세 (예측력 최상위)
    if (ma5 && ma20 && ma60 && price > ma5 && ma5 > ma20 && ma20 > ma60) {
      score += 3; signals.push('정배열');
    } else if (ma20 && ma60 && price > ma20 && ma20 > ma60) {
      score += 1; signals.push('상승추세');
    }

    // ② 신고가 모멘텀
    if (highPct >= 98)      { score += 3; signals.push('신고가'); }
    else if (highPct >= 92) { score += 2; signals.push('신고가 근접'); }
    else if (highPct >= 85) { score += 1; signals.push('고가권'); }

    // ③ 거래량 동반 (1.5~3배 이상적, 과도 스파이크는 클라이맥스 의심)
    if (vr >= 1.5 && vr <= 3.0) { score += 2; signals.push(`거래량 ${vr.toFixed(1)}x`); }
    else if (vr > 3.0)          { score += 1; signals.push(`거래량 ${vr.toFixed(1)}x`); }

    // ④ RSI — 건강한 강세 + 강한 추세(72~80)까지 인정 (백테스트: 고RSI 모멘텀 지속).
    //    80 초과만 가점 제외(극단 과열). RSI 라벨에 '강세' 표기로 위험도 가시화.
    if (rsi !== null && rsi >= 55) {
      if (rsi <= 72)      { score += 1; signals.push(`RSI ${rsi.toFixed(0)}`); }
      else if (rsi <= 80) { score += 1; signals.push(`RSI ${rsi.toFixed(0)} 강세`); }
      // rsi > 80: 가점 없음 (추격 위험)
    }

    // ⑤ MACD 골든크로스만 (강세/상향은 예측력 없어 제외)
    if (macd.golden) { score += 1; signals.push('골든크로스'); }

    // ⑥ 거래량 동반 BB 상단 돌파만 (단순 돌파·스퀴즈는 예측 실패로 제거)
    if (bb.above && vr >= 1.5) { score += 1; signals.push('거래량+BB돌파'); }

    // 시장별 임계값 — 미국 변동성 유니버스는 신호 노이즈가 많아 더 엄격하게
    // + 시장 약세국면(지수 20일선 하회)이면 기준 +2 상향 (하락장 급등 오탐 방지)
    const isKrSym = /\.(KS|KQ)$/.test(symbol);
    const minScore = (isKrSym ? 6 : 7) + (_mktBear ? 2 : 0);
    if (score < minScore) return null;
    if (_mktBear) signals.push('⚠약세장');

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
/* ── 중기 유망주 (3개월 +15% 목표) v1.1 하이브리드 — 2년 백테스트 검증 ──
   v1(변동성 엣지) + GPT 리스크개선: >90% 초고변동 제외, 단일급등 의존·과열 감점,
   상대강도(시장 대비)·상승일 거래대금 품질 가점.
   검증: 점수 8+에서 3개월 +15% 달성 ~40%, 중앙값 +4.9%(v1보다 개선), 손실폭 축소.
   단기 급등(신고가·골든크로스)과 정반대 — 고점 근접은 감점. */
let _oneqIdxMom6 = 0;   // 시장지수 6개월 모멘텀 (상대강도 계산용, 실행 시 1회 세팅)

async function midTermScreenOne(symbol) {
  try {
    const data = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`);
    const closes  = clean(data.close);
    const volumes = (data.volume || []).map(v => v ?? 0);
    const highs   = (data.high || []).map(v => v ?? null);
    const lows    = (data.low  || []).map(v => v ?? null);
    if (closes.length < 200) return null;
    const n = closes.length;
    const price = closes[n - 1];
    if (!_liquidEnough(symbol, closes, volumes, price)) return null;

    // ATR(14) % — 변동성 기반 손절폭 산정용
    let atrPct = null;
    if (highs.length >= 15 && lows.length >= 15) {
      let tr = 0, cnt = 0;
      for (let k = n - 14; k < n; k++) {
        const t = Math.max((highs[k] ?? 0) - (lows[k] ?? 0),
                           Math.abs((highs[k] ?? 0) - closes[k - 1]),
                           Math.abs((lows[k] ?? 0) - closes[k - 1]));
        if (isFinite(t) && t > 0) { tr += t; cnt++; }
      }
      if (cnt) atrPct = (tr / cnt) / price * 100;
    }

    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    const ma200 = avg(closes.slice(-200));
    const ma200prev = n >= 220 ? avg(closes.slice(-220, -20)) : ma200;
    const mom3 = n > 63  ? (price / closes[n - 64]  - 1) * 100 : 0;
    const mom6 = n > 126 ? (price / closes[n - 127] - 1) * 100 : 0;
    const ret5 = n > 5   ? (price / closes[n - 6]   - 1) * 100 : 0;
    const hi252 = Math.max(...closes.slice(-252));
    const highPct = hi252 ? price / hi252 * 100 : 0;
    let rets = [];
    for (let i = n - 20; i < n; i++) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    const m = avg(rets);
    const vol20 = Math.sqrt(avg(rets.map(r => (r - m) ** 2))) * Math.sqrt(252) * 100;
    const max1d = Math.max(...rets) * 100;
    const spike = mom3 > 0 ? ret5 / mom3 : 0;
    const rs6   = mom6 - _oneqIdxMom6;
    // 상승일 vs 하락일 거래대금 (최근 20일)
    let upv = 0, dnv = 0;
    for (let i = n - 20; i < n; i++) {
      const dv = closes[i] * (volumes[i] || 0);
      if (closes[i] > closes[i - 1]) upv += dv; else dnv += dv;
    }
    const updown = dnv > 0 ? upv / dnv : 2;
    const rsi = calcRSI(closes);

    let score = 0; const signals = [];
    // 변동성: 40~90 스위트스폿만 가점, >90 초고변동(작전·갭)은 강한 감점
    if (vol20 >= 40 && vol20 <= 90) { score += 3; signals.push(`변동성 ${vol20.toFixed(0)}%`); }
    else if (vol20 > 90)            { score -= 2; signals.push(`초고변동 ${vol20.toFixed(0)}%(-)`); }
    if (mom6 > 20)      { score += 3; signals.push(`6개월 +${mom6.toFixed(0)}%`); }
    else if (mom6 > 10) { score += 2; signals.push(`6개월 +${mom6.toFixed(0)}%`); }
    else if (mom6 > 0)  { score += 1; }
    if (price > ma200 && ma200 > ma200prev) { score += 1; signals.push('장기추세 상승'); }
    if (highPct >= 55 && highPct < 88) { score += 2; signals.push('상승여력 구간'); }
    else if (highPct >= 95)            { score -= 1; signals.push('고점 근접(-)'); }
    if (mom3 > 0)        { score += 1; }
    if (rs6 > 15)        { score += 1; signals.push('시장대비 강세'); }
    if (updown > 1.1)    { score += 1; signals.push('매수세 우위'); }
    // 리스크 감점 — 지속 상승 vs 단발 급등 분리
    if (spike > 0.5)     { score -= 1; signals.push('단발급등 의존(-)'); }
    if (max1d > 20)      { score -= 1; signals.push('급등일 존재(-)'); }

    if (score < 8) return null;
    const ticker  = symbol.replace(/\.(KS|KQ)$/, '');
    const krEntry = KR_STOCKS.find(s => s.code === ticker);
    return {
      ticker, name: krEntry ? krEntry.name : (US_NAMES[ticker] || ticker),
      price,
      change_pct: parseFloat((closes[n - 2] ? (price - closes[n - 2]) / closes[n - 2] * 100 : 0).toFixed(2)),
      rsi: rsi ? parseFloat(rsi.toFixed(1)) : 0,
      vol_ratio: parseFloat(vol20.toFixed(0)),   // 중기 카드엔 '변동성%'로 표기
      atr: atrPct ? parseFloat(atrPct.toFixed(2)) : null,
      score, signals, golden: false, macd_bull: false, _mid: true,
    };
  } catch { return null; }
}

/* 시장 국면(약세장) 판정 — 지수가 20일선 아래면 약세. 급등 스크리너 기준 강화용 */
let _mktBear = false;
async function _setMktRegime(market) {
  try {
    const idx = market === 'us' ? '^IXIC' : '^KS11';
    const d = await apiFetch(`/chart?symbol=${encodeURIComponent(idx)}&range=6mo&interval=1d`);
    const c = clean(d.close);
    if (c.length >= 20) {
      const ma20 = c.slice(-20).reduce((a, b) => a + b, 0) / 20;
      _mktBear = c[c.length - 1] < ma20;
    } else _mktBear = false;
  } catch { _mktBear = false; }
}

/* 시장지수 6개월 모멘텀 세팅 (상대강도용) — 1Q 실행 시 1회 호출 */
async function _setOneqIdxMom6(market) {
  try {
    const idx = market === 'us' ? '^IXIC' : '^KS11';
    const d = await apiFetch(`/chart?symbol=${encodeURIComponent(idx)}&range=1y&interval=1d`);
    const c = clean(d.close);
    _oneqIdxMom6 = (c.length > 126) ? (c[c.length - 1] / c[c.length - 127] - 1) * 100 : 0;
  } catch { _oneqIdxMom6 = 0; }
}

async function batchScreen(list, market = 'us', screenFn = screenOne) {
  const results = [];
  for (let i = 0; i < list.length; i += 5) {
    const chunk = list.slice(i, i + 5);
    const settled = await Promise.allSettled(chunk.map(s => screenFn(s)));
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

/* ── 급등 스크리너 실행 (단기) ── */
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
    await _setMktRegime(screenerMarket);   // 시장 국면(약세장) 반영
    const stockList = screenerMarket === 'us' ? US_SCREEN_LIST : KR_SCREEN_LIST;
    const results = await batchScreen(stockList, screenerMarket, screenOne);
    scCacheSet(cacheKey, results);
    saveScreenerHistory(results, screenerMarket);
    renderScreenerResults(results);
  } catch (e) {
    toast('스크리너 오류: ' + e.message, true);
  } finally {
    btn.disabled = false; btn.textContent = '▶ 실행';
    load.classList.add('hidden');
  }
}

/* ── 1Q 스크리너 실행 (3개월 +15% 유망주) ── */
let oneqMarket = 'kr';

async function runOneQScreener(refresh = false) {
  const btn  = document.getElementById('oqRunBtn');
  const load = document.getElementById('oqLoading');
  const list = document.getElementById('oqList');
  const sum  = document.getElementById('oqSummary');
  const emp  = document.getElementById('oqEmpty');

  const cacheKey = `oq_${oneqMarket}`;
  if (!refresh) {
    const cached = scCache(cacheKey);
    if (cached) { renderScreenerResults(cached, { list, sum, emp, market: oneqMarket, source: 'midterm' }); return; }
  }

  btn.disabled = true; btn.textContent = '⏳ 분석 중...';
  load.classList.remove('hidden');
  [list, sum, emp].forEach(el => el.classList.add('hidden'));

  try {
    await _setOneqIdxMom6(oneqMarket);   // 상대강도용 시장지수 6개월 모멘텀 세팅
    const stockList = oneqMarket === 'us' ? US_SCREEN_LIST : KR_SCREEN_LIST;
    const results = await batchScreen(stockList, oneqMarket, midTermScreenOne);
    scCacheSet(cacheKey, results);
    renderScreenerResults(results, { list, sum, emp, market: oneqMarket, source: 'midterm' });
    // out-of-sample 검증용 서버 로깅 (예측 → 3개월 후 실제수익 대조)
    if (results.length) {
      fetch(`${SERVER}/api/log-1q`, {
        method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: oneqMarket,
          items: results.map(r => ({ ticker: r.ticker, name: r.name, score: r.score, price: r.price })) }),
      }).catch(() => {});
    }
  } catch (e) {
    toast('1Q 스크리너 오류: ' + e.message, true);
  } finally {
    btn.disabled = false; btn.textContent = '▶ 실행';
    load.classList.add('hidden');
  }
}

function calcExitPlan(item) {
  // 중기 유망주(3개월 +15% 목표): ATR 기반 변동성 손절 + 포지션 사이징
  if (item._mid) {
    const p = item.price;
    const atr = Number(item.atr) || 5;
    // ATR 2배 손절 (일중 흔들기에 쉽게 안 털리게), 7~18% 범위
    const stopPct = Math.round(Math.min(18, Math.max(7, atr * 2)) * 10) / 10;
    // 포지션 사이징: 계좌 1% 리스크 기준 권장 비중 = 1% / 손절폭 (손절 클수록 소액)
    const posPct = Math.round(100 / stopPct * 10) / 10;
    return {
      targetPct: 15, stopPct, holdDays: '최대 3개월(63거래일)', holdDaysNum: 63,
      targetPrice: p * 1.15, stopPrice: p * (1 - stopPct / 100),
      rsiWarn: false, ma5Exit: false, posPct,
    };
  }
  // 단기 급등 v2.0: 최소 7점부터 표시되므로 등급 조정
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

function renderScreenerResults(results, opts) {
  const list = opts ? opts.list : document.getElementById('scList');
  const sum  = opts ? opts.sum  : document.getElementById('scSummary');
  const emp  = opts ? opts.emp  : document.getElementById('scEmpty');
  const mkt  = opts ? opts.market : screenerMarket;
  const wsrc = opts ? opts.source : 'momentum';

  if (!results.length) { emp.classList.remove('hidden'); list.classList.add('hidden'); sum.classList.add('hidden'); return; }

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
        ${item._mid ? `<span class="sc-meta">변동성 ${item.vol_ratio}%</span>`
                    : `<span class="sc-meta">거래량 ${item.vol_ratio}x</span>
                       ${item.golden ? '<span class="sig-tag hot">✂️ 골든크로스</span>' : item.macd_bull ? '<span class="sig-tag">▲ MACD 강세</span>' : ''}`}
        ${sigHtml}
      </div>
      <div class="sc-exit">
        <span class="exit-target">▲ +${ex.targetPct}% ${fmtP(ex.targetPrice)}</span>
        <span class="exit-sep">|</span>
        <span class="exit-stop">▼ -${ex.stopPct}%${item._mid ? '(ATR)' : ''} ${fmtP(ex.stopPrice)}</span>
        <span class="exit-sep">|</span>
        <span class="exit-days">${ex.holdDays}</span>
        ${item._mid && ex.posPct ? `<span class="exit-note">권장비중 ~${ex.posPct}% (1%리스크)</span>` : ''}
        ${ex.rsiWarn ? '<span class="exit-warn">⚠ RSI 과열</span>' : ''}
        ${ex.ma5Exit ? '<span class="exit-note">MA5 이탈시 즉시 매도</span>' : ''}
        <span style="flex:1"></span>
        <button class="sc-news-btn" data-nt="${escHtml(item.ticker)}" data-nn="${escHtml(item.name)}" data-nm="${mkt}"
          style="font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(139,92,246,.4);background:rgba(139,92,246,.1);color:#a78bfa;cursor:pointer">🗞 뉴스감성</button>
        ${watchBtnHtml(item.ticker, item.name, mkt, wsrc, item.price)}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.sc-news-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    runAiNews(b.dataset.nt, b.dataset.nn, b.dataset.nm);
  }));
  list.querySelectorAll('.sc-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMarket = mkt;
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.market === mkt));
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

/* ── 고배당2 스크리너 (전체종목 3년 평균 배당수익률 · 야간 프리컴퓨트) ── */
let div3Market = 'kr';
let _div3Poll = null;

async function runDiv3Screener(refresh = false) {
  const btn  = document.getElementById('div3RunBtn');
  const load = document.getElementById('div3Loading');
  const list = document.getElementById('div3List');
  const sum  = document.getElementById('div3Summary');
  const emp  = document.getElementById('div3Empty');
  const bar  = document.getElementById('div3Bar');
  const prog = document.getElementById('div3Progress');
  if (_div3Poll) { clearTimeout(_div3Poll); _div3Poll = null; }
  const market = div3Market;

  btn.disabled = true; btn.textContent = '⏳ 조회 중...';
  [list, sum, emp].forEach(el => el.classList.add('hidden'));
  load.classList.remove('hidden');
  bar.style.width = '0%';

  let first = refresh;
  const poll = async () => {
    try {
      const qs = first ? '?refresh=true' : '';
      first = false;
      const d = await apiFetch(`/api/div3/${market}${qs}`);
      if (market !== div3Market) return;   // 사용자가 시장을 바꿨으면 중단
      if (d.status === 'building') {
        const pct = d.total ? Math.round(d.progress / d.total * 100) : 0;
        bar.style.width = pct + '%';
        prog.innerHTML = `전체 종목 배당 수집 중... ${pct}%<br><small>${d.progress}/${d.total} · 최초 1회는 수 분 소요됩니다</small>`;
        _div3Poll = setTimeout(poll, 2500);
        return;
      }
      load.classList.add('hidden');
      btn.disabled = false; btn.textContent = '▶ 실행';
      if (d.status === 'error' || !d.results || !d.results.length) {
        emp.classList.remove('hidden');
        emp.textContent = d.error ? ('오류: ' + d.error) : '데이터를 가져올 수 없습니다. 다시 시도해주세요.';
        return;
      }
      renderDiv3(d, market);
    } catch (e) {
      load.classList.add('hidden');
      btn.disabled = false; btn.textContent = '▶ 실행';
      emp.classList.remove('hidden'); emp.textContent = '오류: ' + e.message;
      console.error('고배당2 오류:', e);
    }
  };
  poll();
}

function _div3Suffix(mk) {
  return (mk && (mk.indexOf('KOSDAQ') >= 0 || mk === 'KONEX')) ? '.KQ' : '.KS';
}

function renderDiv3(d, market) {
  const isKr = market === 'kr';
  const years = d.years || [];
  const results = (d.results || []).slice(0, 30);
  const sum  = document.getElementById('div3Summary');
  const list = document.getElementById('div3List');
  _div3Last = { results, market, years };

  sum.innerHTML = `<strong>TOP ${results.length}</strong> · 3년 평균 배당수익률(현재가 대비) 기준
    &nbsp;|&nbsp; <span style="color:var(--muted)">📅 데이터 기준: ${escHtml(d.computed_at || '-')} 현재</span>
    <div style="margin-top:4px;font-size:11px;color:var(--muted)">🔍 각 종목의 <b>리스크</b> 버튼: 급락 이유·존립/배당 위험·저평가 여부를 AI가 뉴스 기반으로 분석</div>`;
  sum.classList.remove('hidden');

  list.innerHTML = results.map((it, i) => {
    const price = isKr
      ? Math.round(it.price).toLocaleString('ko-KR') + '원'
      : '$' + Number(it.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const oneoffY = it.oneoff_year;
    const pills = years.map(y => {
      const v = Number((it.per_year || {})[y] || 0);
      const hot = oneoffY && Number(y) === Number(oneoffY);
      return `<span style="display:inline-block;font-size:11px;padding:2px 7px;margin:2px 3px 0 0;border-radius:6px;
        background:${hot ? 'rgba(240,180,40,.18)' : 'rgba(255,255,255,.07)'};
        color:${hot ? 'var(--gold)' : 'var(--muted)'};${hot ? 'font-weight:700' : ''}">${y} ${v.toFixed(2)}%</span>`;
    }).join('');
    const yieldCls = it.yield3 >= 8 ? 'div-yield-high' : it.yield3 >= 5 ? 'div-yield-mid' : 'div-yield-low';
    const code = it.ticker + (isKr ? _div3Suffix(it.market) : '');
    // 배당 추세
    const trend = it.trend === 'up' ? '<span style="color:var(--green)">▲ 배당증가</span>'
      : it.trend === 'down' ? '<span style="color:var(--red)">▼ 배당감소</span>'
      : it.trend === 'mixed' ? '<span style="color:var(--muted)">↕ 혼조</span>' : '';
    // 거래정지·관리종목 배지
    const statusBadge = it.status
      ? `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:5px;margin-left:5px;background:rgba(248,81,73,.15);color:var(--red)">⛔ ${escHtml(it.status)}</span>`
      : '';
    // 경상배당(일회성 제외) 병기
    const recurLine = (oneoffY && it.recurring_yield != null)
      ? `<div style="font-size:10px;color:var(--gold)">경상 ${it.recurring_yield.toFixed(2)}%</div>`
      : '';
    return `<div class="div-card" data-code="${code}" data-name="${escHtml(it.name)}" data-mk="${isKr ? 'kr' : 'us'}">
      <div class="div-rank">${i + 1}</div>
      <div class="div-info">
        <div class="div-name">${escHtml(it.name)}${oneoffY ? ' <span style="font-size:10px;color:var(--gold)">⚠일회성</span>' : ''}${statusBadge}</div>
        <div class="div-sub">${escHtml(it.ticker)} · ${escHtml(it.market || '')}${trend ? ' · ' + trend : ''}</div>
        <div style="margin-top:4px">${pills}</div>
      </div>
      <div class="div-right">
        <div class="${yieldCls}">${it.yield3.toFixed(2)}%</div>
        ${recurLine}
        <div class="div-price">${price}</div>
        <div style="font-size:10px;color:var(--muted)">3년평균${oneoffY ? '·경상' : ''}</div>
        <button class="div3-risk-btn" data-idx="${i}" style="margin-top:6px;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid var(--violet);background:rgba(139,92,246,.12);color:var(--violet);cursor:pointer">🔍 리스크</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.div-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const mk = card.dataset.mk;
      currentMarket = mk;
      document.querySelectorAll('.tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.market === mk));
      switchTab('home');
      selectStock(card.dataset.code, card.dataset.name);
    });
  });
  list.querySelectorAll('.div3-risk-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      analyzeDivRisk(results[+btn.dataset.idx], market);
    });
  });
  list.classList.remove('hidden');
}

let _div3Last = null;

async function analyzeDivRisk(it, market) {
  if (!it) return;
  openAiModal('🔍 리스크 분석 — ' + it.name);
  const box = document.getElementById('aiModalContent');
  box.innerHTML = `<div style="color:var(--muted);padding:10px">최신 뉴스·공시를 검색해 리스크를 분석 중입니다…<br><small>급락 이유 · 존립/배당 위험 · 저평가 여부</small></div>`;
  try {
    const d = await fetch(SERVER + '/ai/div-risk', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: it.ticker + (market === 'kr' ? _div3Suffix(it.market) : ''),
        name: it.name, market, yield3: it.yield3, per_year: it.per_year, price: it.price,
      }),
    }).then(r => r.json());
    _setAiProvider && _setAiProvider(d);
    if (d.error) { box.innerHTML = `<p style="color:var(--red)">오류: ${escHtml(d.error)}</p>`; return; }
    // 【..】 섹션 볼드 + 저평가/가치함정 색 강조
    let html = escHtml(d.analysis || '분석 결과가 없습니다.')
      .replace(/【([^】]+)】/g, '<div class="ai-section-title" style="margin-top:12px;color:var(--gold)">$1</div>')
      .replace(/저평가/g, '<b style="color:var(--green)">저평가</b>')
      .replace(/가치함정/g, '<b style="color:var(--red)">가치함정</b>')
      .replace(/(위험성[^\n:]*[:：]?\s*)(높음)/g, '$1<b style="color:var(--red)">높음</b>')
      .replace(/\n/g, '<br>');
    const news = (d.news || []).map(n =>
      `<div class="ai-news-item"><a href="${escHtml(n.url)}" target="_blank" style="color:var(--accent)">${escHtml(n.title)} →</a></div>`
    ).join('');
    box.innerHTML = `<div style="margin-bottom:8px;font-size:12px;color:var(--muted)">
        ${escHtml(it.name)} (${escHtml(it.ticker)}) · 3년평균 배당수익률 ${it.yield3.toFixed(2)}%</div>
      <div class="ai-impact">${html}</div>
      ${news ? `<div class="ai-section-title" style="margin-top:14px">📰 관련 뉴스</div>${news}` : ''}
      <div class="ai-disclaimer" style="margin-top:12px;font-size:11px;color:var(--muted)">AI가 뉴스·공시 검색으로 작성한 참고 의견입니다. 투자 판단·책임은 본인에게 있습니다.</div>`;
  } catch (e) {
    box.innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

/* ── 스팩 만기 이자수익률 스크리너 ── */
let _spacPoll = null;

async function runSpacScreener(refresh = false) {
  const btn  = document.getElementById('spacRunBtn');
  const load = document.getElementById('spacLoading');
  const list = document.getElementById('spacList');
  const sum  = document.getElementById('spacSummary');
  const emp  = document.getElementById('spacEmpty');
  const prog = document.getElementById('spacProgress');
  if (_spacPoll) { clearTimeout(_spacPoll); _spacPoll = null; }

  btn.disabled = true; btn.textContent = '⏳ 조회 중...';
  [list, sum, emp].forEach(el => el.classList.add('hidden'));
  load.classList.remove('hidden');

  let first = refresh;
  const poll = async () => {
    try {
      const qs = first ? '?refresh=true' : '';
      first = false;
      const d = await apiFetch(`/api/spac${qs}`);
      if (d.status === 'building') {
        prog.innerHTML = `스팩 정보 수집 중... ${d.progress}/${d.total || '?'}`;
        _spacPoll = setTimeout(poll, 2000);
        return;
      }
      load.classList.add('hidden');
      btn.disabled = false; btn.textContent = '▶ 실행';
      if (d.status === 'error' || !d.results || !d.results.length) {
        emp.classList.remove('hidden');
        emp.textContent = d.error ? ('오류: ' + d.error) : '데이터를 가져올 수 없습니다. 다시 시도해주세요.';
        return;
      }
      renderSpac(d);
    } catch (e) {
      load.classList.add('hidden');
      btn.disabled = false; btn.textContent = '▶ 실행';
      emp.classList.remove('hidden'); emp.textContent = '오류: ' + e.message;
      console.error('스팩 오류:', e);
    }
  };
  poll();
}

function _dday(days) {
  if (days == null) return '-';
  const y = Math.floor(days / 365), m = Math.round((days % 365) / 30);
  let s = '';
  if (y > 0) s += y + '년 ';
  if (m > 0) s += m + '개월';
  return (s.trim() || days + '일') + ` (D-${days})`;
}

function renderSpac(d) {
  const results = d.results || [];
  const sum  = document.getElementById('spacSummary');
  const list = document.getElementById('spacList');

  const nReal = results.filter(r => r.source === '실제').length;
  const nEst  = results.length - nReal;
  sum.innerHTML = `<strong>${results.length}개</strong> 스팩 · 수익률순
    &nbsp;|&nbsp; <span style="color:var(--green)">✅ 실제 ${nReal}</span> · <span style="color:var(--gold)">추정 ${nEst}</span>
    &nbsp;|&nbsp; <span style="color:var(--muted)">📅 데이터 기준: ${escHtml(d.computed_at || '-')} 현재</span>`;
  sum.classList.remove('hidden');

  list.innerHTML = results.map((it, i) => {
    const price = Math.round(it.price).toLocaleString('ko-KR');
    const redem = Math.round(it.redemption).toLocaleString('ko-KR');
    const yieldCls = it.ytm_annual >= 7 ? 'div-yield-high' : it.ytm_annual >= 4 ? 'div-yield-mid' : 'div-yield-low';
    const yaColor  = it.ytm_annual >= 0 ? 'var(--green)' : 'var(--red)';
    const isReal = it.source === '실제';
    const badge = isReal
      ? `<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:5px;background:rgba(63,185,80,.15);color:var(--green);font-weight:700">✅ 실제(예치금${it.nav_asof ? ' ' + escHtml(String(it.nav_asof).replace(/[^0-9.]/g, '').slice(0,7)) : ''})</span>`
      : `<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:5px;background:rgba(240,180,40,.15);color:var(--gold);font-weight:700">추정</span>`;
    return `<div class="div-card" data-code="${it.ticker}.KQ" data-name="${escHtml(it.name)}">
      <div class="div-rank">${i + 1}</div>
      <div class="div-info">
        <div class="div-name">${escHtml(it.name)}</div>
        <div class="div-sub">${escHtml(it.ticker)} · 만기 ${escHtml(it.maturity)} · <span style="color:var(--gold)">${_dday(it.remaining_days)}</span></div>
        <div style="margin-top:4px;font-size:12px;color:var(--muted)">
          현재 <b style="color:var(--text)">${price}원</b> → 만기상환 <b style="color:var(--text)">${redem}원</b>
          <span style="color:var(--muted)">(이자 +${it.interest.toLocaleString('ko-KR')}원)</span> ${badge}
        </div>
      </div>
      <div class="div-right">
        <div class="${yieldCls}" style="color:${yaColor}">연 ${it.ytm_annual != null ? it.ytm_annual.toFixed(2) : '-'}%</div>
        <div style="font-size:11px;color:var(--muted)">총 ${it.ytm_total.toFixed(2)}%</div>
        <div style="font-size:10px;color:var(--muted)">추정 수익률</div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.div-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      currentMarket = 'kr';
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.market === 'kr'));
      switchTab('home');
      selectStock(card.dataset.code, card.dataset.name);
    });
  });
  list.classList.remove('hidden');
}

/* ── 전종목 서버사이드 스크리너 (급등/1Q/반등, 나이트 프리컴퓨트) ── */
const _srvPoll = {};
async function runServerScreen(strategy) {
  const cfg = {
    surge:    { market: screenerMarket, load: 'scLoading',  sum: 'scSummary',  emp: 'scEmpty',  list: 'scList',  btn: 'srvSurgeBtn',
                render: r => renderScreenerResults(r) },
    oneq:     { market: oneqMarket,      load: 'oqLoading',  sum: 'oqSummary',  emp: 'oqEmpty',  list: 'oqList',  btn: 'srvOqBtn',
                render: r => renderScreenerResults(r, { list: document.getElementById('oqList'), sum: document.getElementById('oqSummary'), emp: document.getElementById('oqEmpty'), market: oneqMarket, source: 'midterm' }) },
    reversal: { market: revMarket,       load: 'revLoading', sum: 'revSummary', emp: 'revEmpty', list: 'revList', btn: 'srvRevBtn',
                render: r => renderRevResults(r) },
  }[strategy];
  if (!cfg) return;
  const load = document.getElementById(cfg.load), sum = document.getElementById(cfg.sum);
  const emp = document.getElementById(cfg.emp), list = document.getElementById(cfg.list), btn = document.getElementById(cfg.btn);
  const market = cfg.market;
  if (_srvPoll[strategy]) clearTimeout(_srvPoll[strategy]);
  btn.disabled = true; btn.textContent = '⏳';
  [sum, emp, list].forEach(e => e && e.classList.add('hidden'));
  load.classList.remove('hidden');
  const poll = async () => {
    try {
      const d = await apiFetch(`/api/screen2/${market}`);
      if (market !== cfg.market) return;
      if (d.status === 'building') {
        const p = load.querySelector('p');
        if (p) p.innerHTML = `전종목 스캔 중... ${d.progress}/${d.total || '?'}<br><small>최초 1회는 수 분 소요 (이후 새벽 자동 갱신)</small>`;
        _srvPoll[strategy] = setTimeout(poll, 2500);
        return;
      }
      load.classList.add('hidden'); btn.disabled = false; btn.textContent = '🌐 전종목';
      const arr = d[strategy] || [];
      if (d.status === 'error' || !arr.length) {
        emp.textContent = d.error ? ('오류: ' + d.error) : '조건에 맞는 종목이 없습니다. (전종목 기준)';
        emp.classList.remove('hidden'); return;
      }
      cfg.render(arr);
      if (sum && d.computed_at) {
        sum.insertAdjacentHTML('beforeend',
          ` &nbsp;|&nbsp; <span style="color:var(--muted)">🌐 전종목 · 📅 ${escHtml(d.computed_at)} 기준</span>`);
      }
    } catch (e) {
      load.classList.add('hidden'); btn.disabled = false; btn.textContent = '🌐 전종목';
      emp.textContent = '오류: ' + e.message; emp.classList.remove('hidden');
    }
  };
  poll();
}

/* ── 전략 백테스트 ── */
let _btChart = null, _btStrat = null, _btBh = null;
function _initBtChart() {
  const el = document.getElementById('btChart');
  if (!el || _btChart || typeof LightweightCharts === 'undefined') return;
  _btChart = LightweightCharts.createChart(el, {
    width: el.clientWidth || 600, height: 300,
    layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 11 },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    rightPriceScale: { borderColor: '#30363d' }, timeScale: { borderColor: '#30363d' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });
  _btStrat = _btChart.addLineSeries({ color: '#3fb950', lineWidth: 2, priceLineVisible: false });
  _btBh = _btChart.addLineSeries({ color: '#8b949e', lineWidth: 1.5, lineStyle: LightweightCharts.LineStyle.Dashed, priceLineVisible: false });
  _btChart._resizeFn = () => { try { _btChart.resize(el.clientWidth || 600, 300); } catch {} };
  window.addEventListener('resize', _btChart._resizeFn);
}
const BT_STRAT_DESC = {
  '2425': {
    t: '⭐ 2425 전략 (혼합 · 추천)',
    how: '여러 지표를 결합해 <b>상승추세에서만 보유하고 하락장은 피하는</b> 것을 목표로 한 복합 전략입니다.',
    rules: [
      '<b>보유 조건(모두 충족)</b>: ① 주가가 <b>200일선 위</b>(장기 상승국면) &nbsp;② <b>20일선 &gt; 60일선</b>(중기 정배열)',
      '<b>이탈(현금화)</b>: 위 조건이 깨지거나(데드크로스·200일선 이탈) <b>RSI &gt; 80</b>(단기 과열)이면 매도',
      '즉 "큰 추세가 살아있을 때만 올라타고, 꺾이면 빠진다" — 대세하락을 통째로 피해 <b>MDD(낙폭)를 줄이는</b> 데 초점',
    ],
    tip: '강한 상승장에선 매수후보유보다 수익이 낮을 수 있으나, 하락장·횡보장을 포함한 장기구간에서 낙폭 방어에 강점이 있습니다.',
  },
  'ma_cross': { t: '이평선 교차 (20/60)', how: '단기(20일)·장기(60일) 이동평균선의 교차로 추세를 판단합니다.',
    rules: ['<b>매수</b>: 20일선이 60일선을 <b>위로 돌파</b>(골든크로스) 후 보유', '<b>매도</b>: 20일선이 60일선을 <b>아래로 이탈</b>(데드크로스)'],
    tip: '가장 고전적인 추세추종. 신호가 늦은 편이라 횡보장에서 잦은 손실(휩쏘)이 날 수 있습니다.' },
  'ma_align': { t: '이평선 정배열 (5·20·60)', how: '세 이평선이 위→아래로 5>20>60 순서로 늘어선 "정배열" 구간에만 보유합니다.',
    rules: ['<b>보유</b>: 5일 &gt; 20일 &gt; 60일선 (완전한 상승 정배열)', '<b>매도</b>: 배열이 하나라도 깨지면 청산'],
    tip: '강한 추세만 골라 타므로 상승장에서 강력하지만, 진입/청산이 잦아 수수료·휩쏘에 취약할 수 있습니다.' },
  'macd': { t: 'MACD (골든/데드크로스)', how: '이평선 교차의 개선판. MACD선과 시그널선의 교차로 추세 전환을 조금 더 빠르게 포착합니다.',
    rules: ['<b>매수</b>: MACD선이 시그널선을 <b>위로 돌파</b>(골든크로스)', '<b>매도</b>: MACD선이 시그널선을 <b>아래로 이탈</b>(데드크로스)'],
    tip: '이평선 교차보다 신호가 빨라 하락 회피에 유리하나, 그만큼 잔신호(속임수)도 많습니다.' },
  'bb': { t: '볼린저밴드 (역추세)', how: '주가는 밴드(평균±2σ) 안에 머무는 경향이 있다는 원리로, 과도하게 벌어지면 평균 회귀를 노립니다.',
    rules: ['<b>매수</b>: 주가가 <b>하단선 터치</b>(과매도 → 반등 기대)', '<b>매도</b>: 주가가 <b>상단선 터치</b>(과열 → 차익실현)'],
    tip: '횡보·박스권에서 잘 맞습니다. 강한 추세장(폭등·폭락)에선 밴드를 타고 계속 움직여 손실이 커질 수 있습니다.' },
  'stochastic': { t: '스토캐스틱 (14,3)', how: '최근 n일 가격 범위에서 현재가의 상대 위치(%)로 과매수·과매도를 판단하는 민감한 모멘텀 지표입니다.',
    rules: ['<b>매수</b>: 단기선(%K)이 장기선(%D)을 <b>위로 돌파</b>', '<b>매도</b>: %K가 %D를 <b>아래로 이탈</b>'],
    tip: '주가 움직임에 매우 민감해 단타에 선호됩니다. 대신 가짜 신호(속임수)가 많은 편입니다.' },
  'rsi': { t: 'RSI 30/70 (역추세)', how: '상승/하락 강도를 0~100으로 나타내 과매도·과매수를 판단합니다.',
    rules: ['<b>매수</b>: RSI &lt; 30 (과매도)', '<b>매도</b>: RSI &gt; 70 (과매수)'],
    tip: '횡보장 저점매수에 유효. 강한 추세장에선 과매도·과매수 상태가 오래 지속돼 불리할 수 있습니다.' },
  'buyhold': { t: '매수 후 보유 (벤치마크)', how: '첫날 사서 끝까지 들고 갑니다. 모든 전략의 성과를 비교하는 기준선입니다.',
    rules: ['<b>매수</b>: 시작일 1회', '<b>매도</b>: 없음 (계속 보유)'],
    tip: '거래비용·타이밍 고민이 없습니다. 우상향 우량주라면 어지간한 전략보다 낫다는 연구가 많습니다.' },
};
function renderBtExplain(d) {
  const box = document.getElementById('btExplain');
  const s = BT_STRAT_DESC[d._strat] || BT_STRAT_DESC['ma_cross'];
  const beat = d.total_return >= d.bh_return;
  box.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:12px;font-size:12.5px;line-height:1.65">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">📌 “${escHtml(s.t)}” 전략이란?</div>
      <div style="color:var(--text);margin-bottom:8px">${s.how}</div>
      <ul style="margin:0 0 8px 18px;padding:0;color:var(--muted)">${s.rules.map(r => `<li style="margin-bottom:3px">${r}</li>`).join('')}</ul>
      <div style="background:var(--bg);border-radius:8px;padding:8px 10px;color:var(--muted)">💡 ${s.tip}</div>

      <div style="font-weight:700;font-size:13px;margin:14px 0 6px">📊 결과 지표 읽는 법</div>
      <div style="display:grid;grid-template-columns:1fr;gap:6px;color:var(--muted)">
        <div><b style="color:var(--text)">전략 수익률</b> — 이 전략대로 매매했을 때 전체 기간 누적 손익. <b>매수후보유</b>와 나란히 비교하세요.</div>
        <div><b style="color:var(--text)">연복리(CAGR)</b> — 매년 평균 몇 % 불어났는지. 기간이 다른 종목끼리 비교할 때 공정한 잣대입니다.</div>
        <div><b style="color:var(--text)">최대낙폭(MDD)</b> — 고점 대비 가장 크게 빠졌던 폭. <b>작을수록 마음 편한</b> 전략(예: -15%가 -50%보다 안전).</div>
        <div><b style="color:var(--text)">샤프지수</b> — 위험(변동성) 1단위당 수익. <b>1 이상이면 양호, 2 이상이면 우수</b>. 높을수록 효율적입니다.</div>
        <div><b style="color:var(--text)">매매/승률</b> — 사고판 횟수와, 그중 이익으로 청산한 비율. 승률이 높아도 크게 잃으면 손해일 수 있습니다.</div>
      </div>
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${beat ? 'rgba(63,185,80,.12)' : 'var(--bg)'};color:${beat ? 'var(--green)' : 'var(--muted)'}">
        ${beat
          ? `✅ 이 기간엔 전략(${((d.total_return - d.bh_return)).toFixed(1)}%p 초과)이 단순 보유를 이겼습니다. 다른 기간에도 유지되는지 기간을 바꿔 확인해 보세요.`
          : `ℹ️ 이 기간엔 단순 보유가 더 나았습니다. 전략의 진짜 가치는 <b>낙폭(MDD)이 얼마나 작은지</b>에서 드러나기도 하니 MDD도 함께 보세요.`}
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--muted)">⚠️ 과거 성과가 미래를 보장하지 않습니다. 백테스트는 참고용이며, 수수료·세금·슬리피지·미체결은 단순화되어 있습니다.</div>
    </div>`;
  box.classList.remove('hidden');
}
async function runBacktest() {
  const sym = document.getElementById('btSymbol').value.trim();
  if (!sym) { toast('티커/코드를 입력하세요'); return; }
  const strat = document.getElementById('btStrategy').value;
  const period = document.getElementById('btPeriod').value;
  const load = document.getElementById('btLoading'), stats = document.getElementById('btStats');
  const cw = document.getElementById('btChartWrap'), emp = document.getElementById('btEmpty');
  const exp = document.getElementById('btExplain');
  const btn = document.getElementById('btRun');
  btn.disabled = true; btn.textContent = '⏳';
  [stats, cw, emp, exp].forEach(e => e.classList.add('hidden'));
  load.classList.remove('hidden');
  try {
    const d = await apiFetch(`/api/backtest?symbol=${encodeURIComponent(sym)}&strategy=${strat}&period=${period}`);
    load.classList.add('hidden'); btn.disabled = false; btn.textContent = '▶ 실행';
    if (d.error) { emp.textContent = '오류: ' + d.error; emp.classList.remove('hidden'); return; }
    d._strat = strat;
    const win = d.total_return >= d.bh_return;
    const c = v => v >= 0 ? 'var(--green)' : 'var(--red)';
    const sg = v => (v >= 0 ? '+' : '') + v + '%';
    stats.innerHTML = `<div style="font-size:13px;margin-bottom:6px"><b>${escHtml(d.name || d.symbol)}</b>${d.name && d.name !== d.symbol ? ` <span style="color:var(--muted)">(${escHtml(d.symbol)})</span>` : ''} · ${escHtml(d.strategy_name)} · ${escHtml(d.from)}~${escHtml(d.to)}</div>
      <div class="ai-metrics-row">
        <div class="ai-metric"><span>전략 수익률</span><strong style="color:${c(d.total_return)}">${sg(d.total_return)}</strong></div>
        <div class="ai-metric"><span>매수후보유</span><strong style="color:${c(d.bh_return)}">${sg(d.bh_return)}</strong></div>
        <div class="ai-metric"><span>연복리(CAGR)</span><strong style="color:${c(d.cagr)}">${sg(d.cagr)}</strong></div>
        <div class="ai-metric"><span>최대낙폭(MDD)</span><strong style="color:var(--red)">${d.mdd}%</strong></div>
        <div class="ai-metric"><span>샤프지수</span><strong>${d.sharpe}</strong></div>
        <div class="ai-metric"><span>매매/승률</span><strong>${d.trades}회 / ${d.win_rate != null ? d.win_rate + '%' : '-'}</strong></div>
      </div>
      <div style="font-size:12px;margin-top:4px;color:${win ? 'var(--green)' : 'var(--muted)'}">${win ? '✅ 전략이 매수후보유보다 우수' : 'ℹ️ 이 기간엔 매수후보유가 더 나았음'}</div>`;
    stats.classList.remove('hidden');
    _initBtChart();
    if (_btChart) {
      cw.classList.remove('hidden');
      if (_btChart._resizeFn) _btChart._resizeFn();
      _btStrat.setData(d.curve.map(p => ({ time: p.date, value: p.strat })));
      _btBh.setData(d.curve.map(p => ({ time: p.date, value: p.bh })));
      requestAnimationFrame(() => { try { _btChart.timeScale().fitContent(); } catch {} });
    }
    renderBtExplain(d);
  } catch (e) {
    load.classList.add('hidden'); btn.disabled = false; btn.textContent = '▶ 실행';
    emp.textContent = '오류: ' + e.message; emp.classList.remove('hidden');
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
  if (tabId === 'index' && !document.querySelector('#idxList .idx-card')) loadIndices();
  if (tabId === 'macro' && !document.querySelector('#macroUS .macro-card')) loadMacro();
  if (tabId === 'sector' && !document.querySelector('#sectorUS .macro-card')) loadSectors();
  if (tabId === 'div3' && !document.querySelector('#div3List .div-card')) runDiv3Screener(false);
  if (tabId === 'spac' && !document.querySelector('#spacList .div-card')) runSpacScreener(false);
}

/* ── 섹터 (미국 ETF 다기간 + 한국 업종 + 섹터별 AI 전망/뉴스) ── */
let _secTabData = null;

async function loadSectors() {
  const us = document.getElementById('sectorUS'), kr = document.getElementById('sectorKR');
  us.innerHTML = '<div style="color:var(--muted);padding:20px">섹터 불러오는 중…</div>'; kr.innerHTML = '';
  try {
    const d = await apiFetch('/api/sectors');
    _secTabData = d;
    document.getElementById('sectorSource').textContent =
      `갱신 ${d.updated} · 미국 주도: ${(d.us_leaders || []).join('·')} / 한국 강세: ${(d.kr_leaders || []).join('·')}`;
    _renderSectorMulti(us, '🇺🇸 미국 섹터 (3개월 수익률순)', 'us', d.us);
    _renderSectorMulti(document.getElementById('sectorUSThemes'), '🇺🇸 미국 테마 (자동차·우주항공·방산 등)', 'us', d.us_themes);
    _renderSectorKR(kr, d.kr);
    _renderSectorMulti(document.getElementById('sectorKRThemes'), '🇰🇷 한국 테마 (자동차·방산·2차전지 등)', 'kr', d.kr_themes);
  } catch (e) {
    us.innerHTML = `<div style="color:var(--red);padding:20px">섹터 오류: ${escHtml(e.message)}</div>`;
  }
}

function _sPct(v) {
  if (v == null) return '<span style="color:var(--muted)">-</span>';
  const c = v >= 0 ? 'var(--red)' : 'var(--blue)';
  return `<span style="color:${c}">${v >= 0 ? '+' : ''}${v}%</span>`;
}

function _renderSectorMulti(el, title, market, items) {
  if (!el) return;
  const cards = (items || []).map(s => `
    <div class="macro-card sector-card" data-market="${market}" data-name="${escHtml(s.name)}" data-ticker="${escHtml(s.ticker || '')}">
      <div class="m-label">${escHtml(s.name)} <span style="color:var(--muted)">${s.ticker || ''}</span></div>
      <div class="m-value" style="font-size:18px">3M ${_sPct(s.m3)}</div>
      <div class="m-meta">1D ${_sPct(s.d1)} · 1M ${_sPct(s.m1)} · YTD ${_sPct(s.ytd)}</div>
    </div>`).join('');
  el.innerHTML = `<div class="macro-region-title">${title}</div><div class="macro-grid">${cards}</div>`;
  _bindSectorCards(el);
}

function _renderSectorKR(el, items) {
  const cards = (items || []).slice(0, 24).map(s => `
    <div class="macro-card sector-card" data-market="kr" data-name="${escHtml(s.name)}">
      <div class="m-label">${escHtml(s.name)}</div>
      <div class="m-value" style="font-size:18px">${_sPct(s.chg)}</div>
      <div class="m-meta">${s.up != null ? `▲${s.up} ▼${s.down}` : '당일 등락'}</div>
    </div>`).join('');
  el.innerHTML = `<div class="macro-region-title">🇰🇷 한국 업종 (당일 등락순)</div><div class="macro-grid">${cards}</div>`;
  _bindSectorCards(el);
}

function _bindSectorCards(el) {
  el.querySelectorAll('.sector-card').forEach(c =>
    c.addEventListener('click', () => {
      document.querySelectorAll('#tab-sector .sector-card').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      loadSectorDetail(c.dataset.name, c.dataset.market, c.dataset.ticker);
    }));
}

let _secChart = null, _secLine = null, _secTicker = null, _secMarket = 'us', _secRange = '6mo';
function _initSectorChart() {
  if (_secChart || typeof LightweightCharts === 'undefined') return;
  const el = document.getElementById('sectorChart');
  if (!el) return;
  _secChart = LightweightCharts.createChart(el, {
    width: el.clientWidth || 600, height: 260,
    layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 11 },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    rightPriceScale: { borderColor: '#30363d' }, timeScale: { borderColor: '#30363d' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal }, localization: { locale: 'ko-KR' },
  });
  _secLine = _secChart.addAreaSeries({
    lineColor: '#2f81f7', topColor: 'rgba(47,129,247,.25)', bottomColor: 'rgba(47,129,247,0)',
    lineWidth: 2, priceLineVisible: false,
  });
  const rz = () => { try { _secChart.resize(el.clientWidth || 600, 260); } catch {} };
  window.addEventListener('resize', rz);
  if (window.ResizeObserver) { try { new ResizeObserver(rz).observe(el); } catch {} }
  _secChart._rz = rz;
}

async function loadSectorChart(range) {
  const card = document.getElementById('sectorChartCard');
  if (!card) return;
  if (!_secTicker) { card.classList.add('hidden'); return; }   // 한국 업종 등 티커 없음 → 차트 없음
  if (range) _secRange = range;
  card.classList.remove('hidden');
  document.querySelectorAll('#sectorChartCard .sec-range').forEach(b =>
    b.classList.toggle('active', b.dataset.range === _secRange));
  _initSectorChart();
  const sym = _secMarket === 'us' ? _secTicker : _secTicker + '.KS';
  try {
    const d = await apiFetch(`/chart?symbol=${encodeURIComponent(sym)}&range=${_secRange}&interval=1d`);
    const times = _chartTimes(d);
    const data = [];
    for (let i = 0; i < (d.close || []).length; i++) {
      if (times[i] && d.close[i] != null) data.push({ time: times[i], value: d.close[i] });
    }
    _secLine.setData(data);
    if (_secChart._rz) _secChart._rz();
    let _t = 0;
    const fit = () => { try { _secChart.timeScale().fitContent(); const lr = _secChart.timeScale().getVisibleLogicalRange(); if ((!lr || lr.from > 2) && _t < 15) { _t++; setTimeout(fit, 80); } } catch { if (_t < 15) { _t++; setTimeout(fit, 80); } } };
    requestAnimationFrame(fit);
  } catch (e) { card.classList.add('hidden'); }
}

async function loadSectorDetail(name, market, ticker) {
  // 차트 카드
  _secTicker = ticker || null; _secMarket = market;
  document.getElementById('sectorChartTitle').textContent =
    `${market === 'us' ? '🇺🇸' : '🇰🇷'} ${name} 차트`;
  loadSectorChart(_secRange);   // 티커 있으면 차트 표시 (AI와 병행)

  // 전망+뉴스 카드
  const wrap = document.getElementById('sectorDetail');
  wrap.classList.remove('hidden');
  document.getElementById('sectorDetailTitle').textContent =
    `${market === 'us' ? '🇺🇸' : '🇰🇷'} ${name} 전망 · 뉴스`;
  const outEl = document.getElementById('sectorOutlook'), newsEl = document.getElementById('sectorNews');
  outEl.textContent = 'AI 전망 분석 중… (검색 포함, 10초 내외)';
  newsEl.innerHTML = '';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const r = await fetch(SERVER + '/ai/sector-detail', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, market }),
    });
    const j = await r.json();
    // Gemini 인용 표식([cite: 3, 18] 등) 제거
    outEl.textContent = (j.outlook ? j.outlook.replace(/\[cite[^\]]*\]/gi, '').replace(/[ \t]{2,}/g, ' ').trim() : '') || j.error || '응답 없음';
    if (j.news && j.news.length) {
      newsEl.innerHTML = j.news.map(n =>
        `<a href="${escHtml(n.url)}" target="_blank" rel="noopener" class="sector-news-link">🔗 ${escHtml(n.title)}</a>`).join('');
    } else {
      newsEl.innerHTML = '<span style="color:var(--muted);font-size:12px">관련 뉴스 링크를 찾지 못했습니다.</span>';
    }
  } catch (e) {
    outEl.textContent = '오류: ' + e.message;
  }
}

/* 섹터 AI 챗 */
let _sectorHist = [];
async function sendSectorChat() {
  const inp = document.getElementById('sectorChatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  const body = document.getElementById('sectorChatBody');
  body.insertAdjacentHTML('beforeend', `<div class="macro-chat-msg me">${escHtml(msg)}</div>`);
  const wait = document.createElement('div');
  wait.className = 'macro-chat-msg ai'; wait.textContent = '…';
  body.appendChild(wait); body.scrollTop = body.scrollHeight;
  try {
    const r = await fetch(SERVER + '/ai/sector-chat', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: _sectorHist.slice(-8) }),
    });
    const j = await r.json();
    wait.textContent = j.answer || j.error || '응답 없음';
    _sectorHist.push({ role: 'user', content: msg }, { role: 'assistant', content: j.answer || '' });
  } catch (e) {
    wait.textContent = '오류: ' + e.message;
  }
  body.scrollTop = body.scrollHeight;
}

/* ── 거시경제 (FRED/World Bank/yfinance via OpenBB 소스) ── */
let _macroData = null, _macroChart = null, _macroLine = null, _macroKey = null;

async function loadMacro() {
  const us = document.getElementById('macroUS'), kr = document.getElementById('macroKR');
  us.innerHTML = '<div style="color:var(--muted);padding:20px">거시지표 불러오는 중…</div>';
  kr.innerHTML = '';
  try {
    const d = await apiFetch('/api/macro');
    _macroData = d;
    document.getElementById('macroSource').textContent =
      `갱신 ${d.updated} · 출처 ${d.source}` + (d.has_fred ? ' (FRED 월별)' : ' (무료 폴백 — FRED 키 넣으면 월별 상세)');
    _renderMacroRegion(us, '🇺🇸 미국', 'us', d.us);
    _renderMacroRegion(kr, '🇰🇷 한국', 'kr', d.kr);
    const first = document.querySelector('#macroUS .macro-card');
    if (first) { first.classList.add('active'); _macroChartShow(first.dataset.region, first.dataset.key); }
  } catch (e) {
    us.innerHTML = `<div style="color:var(--red);padding:20px">거시지표 오류: ${escHtml(e.message)}</div>`;
  }
}

function _renderMacroRegion(el, title, region, items) {
  const cards = (items || []).map(it => {
    const chg = it.prev != null ? (it.latest - it.prev) : null;
    const cls = chg == null ? '' : (chg >= 0 ? 'up' : 'down');
    const arrow = chg == null ? '' : (chg >= 0 ? '▲' : '▼');
    const chgStr = chg == null ? '' : ` <span class="m-chg ${cls}">${arrow}${Math.abs(chg).toFixed(2)}</span>`;
    return `<div class="macro-card" data-region="${region}" data-key="${it.key}">
      <div class="m-label">${escHtml(it.label)}</div>
      <div class="m-value">${it.latest.toLocaleString()}<span class="m-unit">${escHtml(it.unit)}</span></div>
      <div class="m-meta">${it.date}${chgStr}</div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="macro-region-title">${title}</div><div class="macro-grid">${cards}</div>`;
  el.querySelectorAll('.macro-card').forEach(c =>
    c.addEventListener('click', () => {
      document.querySelectorAll('#tab-macro .macro-card').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      _macroChartShow(c.dataset.region, c.dataset.key);
    }));
}

function _initMacroChart() {
  if (_macroChart || typeof LightweightCharts === 'undefined') return;
  _macroChart = LightweightCharts.createChart(document.getElementById('macroChart'), {
    autoSize: true, layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 11 },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    rightPriceScale: { borderColor: '#30363d' }, timeScale: { borderColor: '#30363d' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal }, localization: { locale: 'ko-KR' },
  });
  _macroLine = _macroChart.addAreaSeries({
    lineColor: '#d29922', topColor: 'rgba(210,153,34,.25)', bottomColor: 'rgba(210,153,34,0)',
    lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
  });
}

function _macroChartShow(region, key) {
  if (!_macroData) return;
  const it = (_macroData[region] || []).find(x => x.key === key);
  if (!it) return;
  document.getElementById('macroChartWrap').classList.remove('hidden');
  document.getElementById('macroChartTitle').textContent =
    `${region === 'us' ? '🇺🇸' : '🇰🇷'} ${it.label} 추이`;
  _initMacroChart();
  const d = it.series;
  const data = [];
  for (let i = 0; i < d.values.length; i++) {
    let t = d.dates[i];
    if (t && t.length === 4) t = t + '-01-01';   // 연간 데이터
    if (t && d.values[i] != null) data.push({ time: t, value: d.values[i] });
  }
  _macroLine.setData(data);
  _macroChart.timeScale().fitContent();
}

/* 거시경제 AI 챗 */
let _macroHist = [];
async function sendMacroChat() {
  const inp = document.getElementById('macroChatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  const body = document.getElementById('macroChatBody');
  body.insertAdjacentHTML('beforeend', `<div class="macro-chat-msg me">${escHtml(msg)}</div>`);
  const wait = document.createElement('div');
  wait.className = 'macro-chat-msg ai'; wait.textContent = '…';
  body.appendChild(wait); body.scrollTop = body.scrollHeight;
  try {
    const r = await fetch(SERVER + '/ai/macro-chat', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: _macroHist.slice(-8) }),
    });
    const j = await r.json();
    wait.textContent = j.answer || j.error || '응답 없음';
    _macroHist.push({ role: 'user', content: msg }, { role: 'assistant', content: j.answer || '' });
  } catch (e) {
    wait.textContent = '오류: ' + e.message;
  }
  body.scrollTop = body.scrollHeight;
}

/* ── 세계 지수 ── */
let _idxChart = null, _idxLine = null, _idxRange = '6mo', _idxSymbol = null, _idxName = '';

async function loadIndices() {
  const list = document.getElementById('idxList');
  list.innerHTML = '<div style="color:var(--muted);padding:20px">지수 불러오는 중…</div>';
  try {
    const data = await apiFetch('/api/indices');
    list.innerHTML = data.map(d => {
      if (d.price == null)
        return `<div class="idx-card"><div class="idx-name">${escHtml(d.name)}</div><div class="idx-price">-</div></div>`;
      const up = d.change_pct >= 0;
      const col = up ? 'var(--red)' : 'var(--blue)';   // 한국식: 상승=빨강
      return `<div class="idx-card" data-symbol="${escHtml(d.symbol)}" data-name="${escHtml(d.name)}">
        <div class="idx-name">${escHtml(d.name)}</div>
        <div class="idx-price">${d.price.toLocaleString()}</div>
        <div class="idx-chg" style="color:${col}">${up?'+':''}${d.change_pct}% (${up?'+':''}${d.change.toLocaleString()})</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.idx-card[data-symbol]').forEach(c =>
      c.addEventListener('click', () => {
        list.querySelectorAll('.idx-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        loadIndexChart(c.dataset.symbol, c.dataset.name);
      }));
    const first = list.querySelector('.idx-card[data-symbol]');
    if (first) { first.classList.add('active'); loadIndexChart(first.dataset.symbol, first.dataset.name); }
  } catch (e) {
    list.innerHTML = `<div style="color:var(--red);padding:20px">지수 조회 오류: ${escHtml(e.message)}</div>`;
  }
}

function _initIdxChart() {
  if (_idxChart || typeof LightweightCharts === 'undefined') return;
  _idxChart = LightweightCharts.createChart(document.getElementById('idxChart'), {
    autoSize: true, layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 11 },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    rightPriceScale: { borderColor: '#30363d' }, timeScale: { borderColor: '#30363d' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal }, localization: { locale: 'ko-KR' },
  });
  _idxLine = _idxChart.addAreaSeries({
    lineColor: '#58a6ff', topColor: 'rgba(88,166,255,.25)', bottomColor: 'rgba(88,166,255,0)',
    lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
  });
}

async function loadIndexChart(symbol, name) {
  _idxSymbol = symbol; _idxName = name || symbol;
  document.getElementById('idxChartWrap').classList.remove('hidden');
  document.getElementById('idxChartTitle').textContent = _idxName + ' 추이';
  _initIdxChart();
  try {
    const d = await apiFetch(`/chart?symbol=${encodeURIComponent(symbol)}&range=${_idxRange}&interval=1d`);
    const times = _chartTimes(d);
    const data = [];
    for (let i = 0; i < (d.close || []).length; i++) {
      if (times[i] && d.close[i] != null) data.push({ time: times[i], value: d.close[i] });
    }
    _idxLine.setData(data);
    _idxChart.timeScale().fitContent();
  } catch (e) { console.error('지수 차트 오류:', e); }
}

/* ── 마켓 전환 ── */
function switchMarket(market) {
  currentMarket = market;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.market === market));
}

/* 종목코드로 시장 추론 (백엔드 _is_kr 와 동일 규칙): .KS/.KQ, 6자리 숫자,
   숫자로 시작하는 6자리 영숫자(국내 ETF 0117V0 등) → KR, 그 외 → US */
function inferMarket(code) {
  const c = String(code || '').trim();
  if (/\.(KS|KQ)$/i.test(c)) return 'kr';
  const base = c.replace(/\.(KS|KQ)$/i, '');
  if (/^\d{6}$/.test(base)) return 'kr';
  if (base.length === 6 && /^\d/.test(base) && /^[0-9A-Za-z]+$/.test(base)) return 'kr';
  return 'us';
}

/* ── 검색 ── */
let _searchSeq = 0;
async function doSearch(q) {
  const seq = ++_searchSeq;
  const box = document.getElementById('searchResults');
  box.innerHTML = '<div class="search-item"><div class="si-name">검색 중...</div></div>';
  box.classList.remove('hidden');
  try {
    const items = await fetchSearch(q);
    if (seq !== _searchSeq) return;   // 이미 새 검색어가 입력됨 — 늦게 온 응답 무시
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
    if (seq !== _searchSeq) return;
    box.innerHTML = `<div class="search-item"><div class="si-name">오류: ${escHtml(e.message)}</div></div>`;
  }
}

function hideSearch() { document.getElementById('searchResults').classList.add('hidden'); }

/* ── 종목 선택 ── */
async function selectStock(code, name) {
  currentSymbol = code;
  // 코드로 시장 자동 판별 — US 티커를 KR 토글 상태로 조회해 잘못된(추정) 재무가
  // 나오는 문제 방지 (전자공시 등 market 파라미터가 정확해지도록)
  const _mk = inferMarket(code);
  if (_mk !== currentMarket) switchMarket(_mk);
  document.getElementById('emptyState').classList.add('hidden');
  const detail = document.getElementById('stockDetail');
  detail.classList.remove('hidden');
  document.getElementById('stockName').textContent = name || code;
  document.getElementById('stockCode').textContent = code;
  document.getElementById('stockPrice').textContent = '조회 중...';
  document.getElementById('stockChange').textContent = '';
  ['mOpen','mHigh','mLow','mVolume'].forEach(id => document.getElementById(id).textContent = '-');
  _resetAiScore();   // 종목 바뀌면 종합점수 초기화

  // 시세·차트를 독립적으로 처리 — 하나가 실패해도 다른 하나는 표시 (전체 "오류" 방지)
  const [qRes, cRes] = await Promise.allSettled([fetchQuote(code), fetchChart(code)]);

  if (qRes.status === 'fulfilled' && qRes.value) {
    updateStockHeader(qRes.value);
  } else {
    // 시세 실패 → 1회 재시도 (일시적 yfinance/네트워크 오류 대응)
    try {
      await new Promise(r => setTimeout(r, 600));
      const q2 = await fetchQuote(code);
      if (q2) updateStockHeader(q2);
      else throw new Error('no data');
    } catch (e) {
      document.getElementById('stockPrice').textContent = '시세 조회 실패 (재시도 ↻)';
      document.getElementById('stockChange').textContent = '';
      console.error('quote 실패:', e);
    }
  }

  if (cRes.status === 'fulfilled' && cRes.value) {
    try { updateCharts(cRes.value); } catch (e) { console.error('chart 렌더 실패:', e); }
  } else {
    console.error('chart 조회 실패:', cRes.reason);  // 차트만 실패 — 가격/지표는 그대로 표시
  }

  _loadUpcoming(code);   // 다음 배당락·실적발표일
  const _bi = document.getElementById('btnInsider');   // 내부자·기관: 미국 종목만
  if (_bi) _bi.classList.toggle('hidden', inferMarket(code) === 'kr');
  document.getElementById('addWatchBtn').textContent = '⭐ 관심종목 추가';
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
}

let _curPrice = null;   // 현재 종목 현재가(분배금 수익률 계산 등에 사용)
function updateStockHeader(q) {
  if (!q) return;
  _curPrice = q.price || null;
  // 통화는 시장 토글이 아니라 quote의 currency로 판정 (KR 토글에서 미국 종목 봐도 $ 표시)
  const mkt = q.currency === 'USD' ? 'us' : (q.currency === 'KRW' ? 'kr' : currentMarket);
  const chg  = q.change || 0;
  const pct  = q.change_pct || 0;
  const sign = chg >= 0 ? '+' : '';
  document.getElementById('stockPrice').textContent = formatPrice(q.price, mkt, q.currency);
  const chgEl = document.getElementById('stockChange');
  chgEl.textContent = `${sign}${chg.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
  chgEl.className = 'change ' + (chg >= 0 ? 'up' : 'down');
  document.getElementById('mOpen').textContent    = formatPrice(q.open,   mkt, q.currency);
  document.getElementById('mHigh').textContent    = formatPrice(q.high,   mkt, q.currency);
  document.getElementById('mLow').textContent     = formatPrice(q.low,    mkt, q.currency);
  document.getElementById('mVolume').textContent  = fmtVol(q.volume);
  document.getElementById('mPer').textContent     = q.per   ? q.per.toFixed(1) + 'x'  : '-';
  document.getElementById('mFpe').textContent     = q.fpe   ? q.fpe.toFixed(1) + 'x'  : '-';
  document.getElementById('mPbr').textContent     = q.pbr   ? q.pbr.toFixed(2) + 'x'  : '-';
  document.getElementById('mEps').textContent     = q.eps   ? formatPrice(q.eps, mkt, q.currency) : '-';
  document.getElementById('mDiv').textContent     = q.dividend ? q.dividend.toFixed(2) + '%' : '-';
  document.getElementById('mMcap').textContent    = q.market_cap ? fmtMcap(q.market_cap, mkt) : '-';
  document.getElementById('m52H').textContent     = q.week52_high ? formatPrice(q.week52_high, mkt, q.currency) : '-';
  document.getElementById('m52L').textContent     = q.week52_low  ? formatPrice(q.week52_low,  mkt, q.currency) : '-';
  document.getElementById('mRoe').textContent     = q.roe        ? q.roe.toFixed(1) + '%'  : '-';
  document.getElementById('mSectorPer').textContent = q.sector_per ? q.sector_per.toFixed(1) + 'x' : '-';
  // 한국: DART 최신 연간 순이익이 적자면 PER(TTM) 옆에 참고불가 배지
  if (mkt === 'kr') _loadProfitFlag(q.symbol || currentSymbol);
}

async function _loadProfitFlag(symbol) {
  if (!symbol) return;
  try {
    const f = await apiFetch(`/api/profit-flag?symbol=${encodeURIComponent(symbol)}`);
    const el = document.getElementById('mPer');
    if (f && f.is_loss && el && el.textContent && el.textContent !== '-') {
      const amt = f.annual != null ? ` (연간순익 ${Math.round(f.annual/1e8).toLocaleString()}억)` : '';
      el.innerHTML = `${escHtml(el.textContent)} <span style="color:var(--red);font-size:10px;font-weight:700" title="최신 연간 순이익이 적자라 PER은 참고 곤란${amt}">⚠적자</span>`;
    }
  } catch {}
}

/* ── 차트 ── */
/* lightweight-charts (TradingView 오픈소스) — 캔들스틱 + 거래량 + 볼린저밴드 */
let _candleSeries = null, _volSeries = null, _bbU = null, _bbM = null, _bbL = null;
let _ma5 = null, _ma20 = null, _ma60 = null;
let _rsiChart = null, _rsiLine = null, _rsi30 = null, _rsi70 = null;
let _macdChart = null, _macdLine = null, _macdSig = null, _macdHist = null;
let _lastChartData = null;
// 지표 표시 상태 (localStorage)
let _ind = (() => {
  try { return { ...{ ma: true, bb: true, rsi: false, macd: false, pattern: false }, ...JSON.parse(localStorage.getItem('chartInd') || '{}') }; }
  catch { return { ma: true, bb: true, rsi: false, macd: false, pattern: false }; }
})();
function _saveInd() { try { localStorage.setItem('chartInd', JSON.stringify(_ind)); } catch {} }

function initCharts() {
  const el = document.getElementById('priceChart');
  if (!el || typeof LightweightCharts === 'undefined') return;

  // autoSize가 컨테이너 폭을 잘못(266px) 잡아 봉이 압축되던 문제 → 크기 명시 관리
  const _CH_H = 340;
  priceChart = LightweightCharts.createChart(el, {
    width: el.clientWidth || 600, height: _CH_H,
    layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 11 },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    rightPriceScale: { borderColor: '#30363d' },
    timeScale: { borderColor: '#30363d', timeVisible: false },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    localization: { locale: 'ko-KR' },
  });
  // 컨테이너 폭 변화 대응 (창 리사이즈 / 탭 표시 지연)
  const _resizeChart = () => { try { priceChart.resize(el.clientWidth || 600, _CH_H); } catch {} };
  window.addEventListener('resize', _resizeChart);
  if (window.ResizeObserver) { try { new ResizeObserver(_resizeChart).observe(el); } catch {} }
  priceChart._resizeFn = _resizeChart;

  // 캔들: 한국식 — 상승=빨강, 하락=파랑
  _candleSeries = priceChart.addCandlestickSeries({
    upColor: '#f85149', downColor: '#58a6ff',
    borderUpColor: '#f85149', borderDownColor: '#58a6ff',
    wickUpColor: '#f85149', wickDownColor: '#58a6ff',
  });

  // 거래량: 하단 오버레이 히스토그램
  _volSeries = priceChart.addHistogramSeries({
    priceScaleId: 'vol', priceFormat: { type: 'volume' },
    lastValueVisible: false, priceLineVisible: false,
  });
  priceChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

  // 볼린저밴드
  const lineOpts = c => ({
    color: c, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed,
    priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
  });
  _bbU = priceChart.addLineSeries(lineOpts('rgba(255,120,80,.7)'));
  _bbM = priceChart.addLineSeries(lineOpts('rgba(180,180,180,.5)'));
  _bbL = priceChart.addLineSeries(lineOpts('rgba(80,200,130,.7)'));

  // 이동평균선 (MA5/20/60)
  const maOpts = c => ({ color: c, lineWidth: 1.4, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  _ma5  = priceChart.addLineSeries(maOpts('#e3b341'));
  _ma20 = priceChart.addLineSeries(maOpts('#58a6ff'));
  _ma60 = priceChart.addLineSeries(maOpts('#bc8cff'));

  // RSI 서브차트
  const rsiEl = document.getElementById('rsiChart');
  if (rsiEl) {
    _rsiChart = LightweightCharts.createChart(rsiEl, {
      width: rsiEl.clientWidth || 600, height: 110,
      layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 10 },
      grid: { vertLines: { color: '#1b2027' }, horzLines: { color: '#1b2027' } },
      rightPriceScale: { borderColor: '#30363d' }, timeScale: { borderColor: '#30363d', timeVisible: false },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    });
    _rsiLine = _rsiChart.addLineSeries({ color: '#f0b400', lineWidth: 1.4, priceLineVisible: false, lastValueVisible: true });
    _rsi70 = _rsiChart.addLineSeries({ color: 'rgba(248,81,73,.5)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    _rsi30 = _rsiChart.addLineSeries({ color: 'rgba(63,185,80,.5)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    _rsiChart._resizeFn = () => { try { _rsiChart.resize(rsiEl.clientWidth || 600, 110); } catch {} };
    window.addEventListener('resize', _rsiChart._resizeFn);
  }

  // MACD 서브차트
  const macdEl = document.getElementById('macdChart');
  if (macdEl) {
    _macdChart = LightweightCharts.createChart(macdEl, {
      width: macdEl.clientWidth || 600, height: 120,
      layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 10 },
      grid: { vertLines: { color: '#1b2027' }, horzLines: { color: '#1b2027' } },
      rightPriceScale: { borderColor: '#30363d' }, timeScale: { borderColor: '#30363d', timeVisible: false },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    });
    _macdHist = _macdChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    _macdLine = _macdChart.addLineSeries({ color: '#58a6ff', lineWidth: 1.4, priceLineVisible: false, lastValueVisible: false });
    _macdSig  = _macdChart.addLineSeries({ color: '#f85149', lineWidth: 1.4, priceLineVisible: false, lastValueVisible: false });
    _macdChart._resizeFn = () => { try { _macdChart.resize(macdEl.clientWidth || 600, 120); } catch {} };
    window.addEventListener('resize', _macdChart._resizeFn);
  }
  _applyIndToggleUI();
}

function _applyIndToggleUI() {
  document.querySelectorAll('.ind-toggle').forEach(b => b.classList.toggle('active', !!_ind[b.dataset.ind]));
  const rw = document.getElementById('rsiWrap'), mw = document.getElementById('macdWrap');
  if (rw) rw.classList.toggle('hidden', !_ind.rsi);
  if (mw) mw.classList.toggle('hidden', !_ind.macd);
}

function _chartTimes(d) {
  // ISO 날짜 우선, 없으면 M/D에서 연도 추정 (월이 줄어들면 해 넘김)
  if (d.dates_iso && d.dates_iso.length === d.dates.length) return d.dates_iso;
  const out = [];
  let year = new Date().getFullYear();
  let prevM = null;
  const months = d.dates.map(s => parseInt(String(s).split('/')[0]) || 1);
  // 끝(최신)이 올해라고 가정하고 뒤에서 앞으로 연도 계산
  const years = new Array(d.dates.length);
  for (let i = d.dates.length - 1; i >= 0; i--) {
    if (prevM !== null && months[i] > prevM) year -= 1;
    years[i] = year; prevM = months[i];
  }
  for (let i = 0; i < d.dates.length; i++) {
    const [m, dd] = String(d.dates[i]).split('/').map(Number);
    out.push(`${years[i]}-${String(m).padStart(2,'0')}-${String(dd||1).padStart(2,'0')}`);
  }
  return out;
}

function updateCharts(d) {
  if (!d || !priceChart || !_candleSeries) return;
  _lastChartData = d;
  // 차트가 생성 시점에 좁게(266px) 잡혔을 수 있어 현재 컨테이너 폭으로 재동기화
  if (priceChart._resizeFn) priceChart._resizeFn();
  const times = _chartTimes(d);
  const candles = [], vols = [];
  for (let i = 0; i < (d.close || []).length; i++) {
    const c = d.close[i], t = times[i];
    if (!t || c == null) continue;
    const o = d.open?.[i] || c, h = d.high?.[i] || c, l = d.low?.[i] || c;
    candles.push({ time: t, open: o, high: Math.max(h, o, c), low: Math.min(l, o, c), close: c });
    vols.push({ time: t, value: d.volume?.[i] || 0,
                color: c >= o ? 'rgba(248,81,73,.35)' : 'rgba(88,166,255,.35)' });
  }
  _candleSeries.setData(candles);
  _volSeries.setData(vols);

  const closes = d.close || [];
  const bb = calcBBSeries(closes);
  const line = arr => arr.map((v, i) => v == null ? null : ({ time: times[i], value: v })).filter(Boolean);
  _bbU.setData(line(bb.upper));
  _bbM.setData(line(bb.mid));
  _bbL.setData(line(bb.lower));
  [_bbU, _bbM, _bbL].forEach(s => s && s.applyOptions({ visible: _ind.bb }));

  // 이동평균선
  if (_ma5)  _ma5.setData(line(maSeriesFull(closes, 5)));
  if (_ma20) _ma20.setData(line(maSeriesFull(closes, 20)));
  if (_ma60) _ma60.setData(line(maSeriesFull(closes, 60)));
  [_ma5, _ma20, _ma60].forEach(s => s && s.applyOptions({ visible: _ind.ma }));

  // 캔들 패턴 마커
  try {
    _candleSeries.setMarkers(_ind.pattern
      ? detectPatterns(d.open || [], d.high || [], d.low || [], closes, times) : []);
  } catch {}

  // RSI 서브차트
  if (_rsiChart && _ind.rsi) {
    _rsiLine.setData(line(rsiSeriesFull(closes)));
    _rsi70.setData(times.map(t => ({ time: t, value: 70 })));
    _rsi30.setData(times.map(t => ({ time: t, value: 30 })));
    if (_rsiChart._resizeFn) _rsiChart._resizeFn();
    requestAnimationFrame(() => { try { _rsiChart.timeScale().fitContent(); } catch {} });
  }
  // MACD 서브차트
  if (_macdChart && _ind.macd) {
    const md = macdSeriesFull(closes);
    _macdLine.setData(line(md.macd));
    _macdSig.setData(line(md.signal));
    _macdHist.setData(md.hist.map((v, i) => v == null ? null : ({
      time: times[i], value: v, color: v >= 0 ? 'rgba(248,81,73,.5)' : 'rgba(88,166,255,.5)' })).filter(Boolean));
    if (_macdChart._resizeFn) _macdChart._resizeFn();
    requestAnimationFrame(() => { try { _macdChart.timeScale().fitContent(); } catch {} });
  }
  // setData 직후엔 lightweight-charts가 바 범위를 아직 계산 안 해 fitContent가 무효
  // (즉시=최근봉만/지연=정상). 타이밍이 불안정하므로 '실제로 맞을 때까지' 재시도.
  // 기간 변경(특히 주봉 5년/10년) 시 최근봉만 오른쪽에 압축되던 문제 해결.
  let _tries = 0;
  const _fit = () => {
    try {
      const ts = priceChart.timeScale();
      ts.fitContent();
      const lr = ts.getVisibleLogicalRange();
      if ((!lr || lr.from > 2) && _tries < 15) { _tries++; setTimeout(_fit, 80); }
    } catch { if (_tries < 15) { _tries++; setTimeout(_fit, 80); } }
  };
  requestAnimationFrame(_fit);
}

/* ── 다가오는 배당락·실적 일정 ── */
function _ddayStr(iso) {
  try {
    const t = new Date(iso + 'T00:00:00'); const n = new Date(); n.setHours(0, 0, 0, 0);
    const d = Math.round((t - n) / 864e5);
    return d <= 0 ? '오늘' : ('D-' + d);
  } catch { return ''; }
}
function _fmtMD(iso) { const p = String(iso).split('-'); return p.length === 3 ? `${+p[1]}/${+p[2]}` : iso; }

async function _loadUpcoming(code) {
  const el = document.getElementById('upcomingLine');
  if (!el) return;
  el.textContent = '';
  try {
    const d = await apiFetch(`/api/upcoming?symbol=${encodeURIComponent(code)}`);
    const parts = [];
    if (d.ex_div) parts.push(`💰 배당락 ${_fmtMD(d.ex_div)} (${_ddayStr(d.ex_div)})`);
    if (d.earnings) parts.push(`📊 실적발표 ${_fmtMD(d.earnings)} (${_ddayStr(d.earnings)})`);
    el.textContent = parts.join('   ·   ');
  } catch {}
}

async function _renderWlCalendar(items, isKr) {
  const wrap = document.getElementById('wlCalendar'), body = document.getElementById('wlCalendarBody');
  if (!wrap || !body) return;
  const symOf = i => isKr ? (i.code.includes('.') ? i.code : i.code + '.KS') : i.code;
  const syms = items.map(symOf);
  if (!syms.length) { wrap.classList.add('hidden'); return; }
  try {
    const d = await fetch(SERVER + '/api/upcoming', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: syms }),
    }).then(r => r.json());
    const nameBy = {}; items.forEach(i => { nameBy[symOf(i)] = i.name; });
    const events = [];
    for (const [s, v] of Object.entries(d || {})) {
      if (v.ex_div) events.push({ date: v.ex_div, type: '배당락', name: nameBy[s] || s, icon: '💰' });
      if (v.earnings) events.push({ date: v.earnings, type: '실적', name: nameBy[s] || s, icon: '📊' });
    }
    if (!events.length) { wrap.classList.add('hidden'); return; }
    events.sort((a, b) => a.date < b.date ? -1 : 1);
    body.innerHTML = events.slice(0, 12).map(e =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span>${e.icon} ${escHtml(e.name)} <span style="color:var(--muted)">${e.type}</span></span>
        <span style="color:var(--gold)">${_fmtMD(e.date)} (${_ddayStr(e.date)})</span></div>`).join('');
    wrap.classList.remove('hidden');
  } catch { wrap.classList.add('hidden'); }
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
    const wc = document.getElementById('wlCalendar'); if (wc) wc.classList.add('hidden');
    return;
  }

  const isKr = watchMarket === 'kr';
  _renderWlCalendar(items, isKr);   // 다가오는 배당·실적 일정

  // 1단계: 즉시 렌더 (현재가 로딩 플레이스홀더)
  panel.innerHTML = items.map(item => {
    const src        = SOURCE_META[item.source];
    const entryPrice = Number(item.entryPrice) || 0;
    const entryStr   = entryPrice
      ? (isKr ? entryPrice.toLocaleString('ko-KR') + '원' : '$' + entryPrice.toFixed(2))
      : null;
    const qty        = item.quantity ? `×${item.quantity}주` : '';
    const hasEntry   = !!entryPrice;

    return `
    <div class="wl-card ${item.code === currentSymbol ? 'active' : ''}"
         data-code="${item.code}" data-name="${escHtml(item.name || item.code)}"
         data-entry="${entryPrice}">
      <div class="wl-info" style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
          <div class="wl-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(item.name || item.code)}</div>
          <div id="wl-price-${item.code}" style="text-align:right;flex-shrink:0;font-size:13px;color:var(--muted)">조회중…</div>
        </div>
        <div class="wl-code">${item.code}${item.addDate ? ' · ' + item.addDate : ''}</div>
        <div class="wl-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px">
          ${src ? `<span class="wl-src-badge ${src.cls}">${src.label}</span>` : ''}
          ${hasEntry
            ? `<span class="wl-entry-badge">📌 ${entryStr} ${qty}</span>`
            : `<button class="wl-set-entry" data-code="${item.code}" data-market="${watchMarket}" title="매수가 설정 시 카카오 알림 활성화">💰 매수가 입력</button>`}
          <span id="wl-pnl-${item.code}" style="font-size:12px"></span>
        </div>
        <div id="wl-risk-${item.code}" class="wl-risk"></div>
        ${hasEntry ? `
        <div style="display:flex;gap:6px;margin-top:5px">
          <button class="wl-set-entry" data-code="${item.code}" data-market="${watchMarket}" style="font-size:11px">✏️ 수정</button>
          <button class="wl-clr-entry" data-code="${item.code}" data-market="${watchMarket}" style="font-size:11px">🔕 알림해제</button>
        </div>` : ''}
      </div>
      <button class="wl-remove" data-code="${item.code}" data-market="${watchMarket}" title="관심 해제">×</button>
    </div>`;
  }).join('');

  // 이벤트 바인딩
  panel.querySelectorAll('.wl-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.wl-remove, .wl-set-entry, .wl-clr-entry')) return;
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
  panel.querySelectorAll('.wl-set-entry').forEach(btn => {
    btn.addEventListener('click', () => openEntryModal(btn.dataset.code, btn.dataset.market));
  });
  panel.querySelectorAll('.wl-clr-entry').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.code, mkt = btn.dataset.market;
      const item = watchlist[mkt]?.find(i => i.code === code);
      if (!item) return;
      delete item.entryPrice; delete item.quantity; delete item.purchasedAt;
      saveWatchlist(); _refreshOwnedMap();
      try { await fetch(SERVER + `/api/watchlist/${mkt}/${code}`, {
        method: 'PUT', headers: WL_HDR({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ entry_price: null }),
      }); } catch {}
      renderWatchlist();
    });
  });

  // 2단계: 현재가 병렬 조회
  const fetchPrice = async (item) => {
    const entryPrice = Number(item.entryPrice) || 0;
    const qty        = Number(item.quantity) || 0;
    const priceEl    = document.getElementById(`wl-price-${item.code}`);
    const pnlEl      = document.getElementById(`wl-pnl-${item.code}`);
    if (!priceEl) return;
    try {
      const url = isKr
        ? `${SERVER}/api/kr/quote/${item.code}`
        : `${SERVER}/api/us/quote/${item.code}`;
      const q   = await fetch(url, { headers: HDR }).then(r => r.json());
      const cur = Number(q.price || q.regularMarketPrice || q.currentPrice || 0);
      if (!cur) { priceEl.textContent = '-'; return; }

      // 현재가
      const curStr = isKr ? cur.toLocaleString('ko-KR') + '원' : '$' + cur.toFixed(2);
      const chg    = Number(q.change_pct || q.regularMarketChangePercent || 0);
      const chgCol = chg >= 0 ? 'var(--red)' : 'var(--blue)';   // 한국식: 상승=빨강, 하락=파랑
      const chgStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      priceEl.innerHTML = `<span style="font-weight:700;color:${chgCol}">${curStr}</span>
        <span style="font-size:10px;color:${chgCol};margin-left:3px">${chgStr}</span>`;

      // 매수가 대비 수익 (entryPrice 있을 때만)
      if (entryPrice > 0 && pnlEl) {
        const diff    = cur - entryPrice;
        const diffPct = diff / entryPrice * 100;
        const col     = diff >= 0 ? 'var(--red)' : 'var(--blue)';   // 수익=빨강, 손실=파랑
        const pctStr  = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
        const sign    = diff >= 0 ? '+' : '';
        const perStr  = isKr ? `${sign}${Math.round(diff).toLocaleString('ko-KR')}원` : `${sign}$${Math.abs(diff).toFixed(2)}`;
        const total   = diff * qty;
        const totStr  = qty > 1
          ? (isKr ? ` · 총 ${total >= 0 ? '+' : ''}${Math.round(total).toLocaleString('ko-KR')}원` : ` · 총 ${total >= 0 ? '+' : ''}$${Math.abs(total).toFixed(2)}`)
          : '';
        pnlEl.innerHTML = `<span style="color:${col};font-weight:600">${perStr} (${pctStr})${totStr}</span>`;
      }
    } catch {
      priceEl.textContent = '-';
    }
  };

  // 실패 신호 점검 (급등 후보 사후 모니터링)
  const fetchRisk = async (item) => {
    const el = document.getElementById(`wl-risk-${item.code}`);
    if (!el) return;
    try {
      const ep = Number(item.entryPrice) || '';
      const q = `symbol=${encodeURIComponent(item.code)}&market=${watchMarket}${ep ? '&entry=' + ep : ''}`;
      const r = await fetch(`${SERVER}/api/risk?${q}`, { headers: HDR }).then(r => r.json());
      const flags = (r.flags || []);
      if (!flags.length) return;
      el.innerHTML = flags.map(f =>
        `<span class="wl-risk-flag ${f.level === 'danger' ? 'danger' : 'warn'}">${f.level === 'danger' ? '🚨' : '⚠'} ${escHtml(f.text)}</span>`
      ).join('');
    } catch {}
  };

  // 동시에 최대 5개씩 조회 (현재가 + 실패신호)
  for (let i = 0; i < items.length; i += 5) {
    const chunk = items.slice(i, i + 5);
    await Promise.all(chunk.map(fetchPrice));
    Promise.all(chunk.map(fetchRisk));   // 실패신호는 논블로킹 (느려도 가격 표시 막지 않음)
  }
}

/* ── 유틸 ── */
function formatPrice(n, market, currency) {
  if (!n) return '-';
  // currency가 주어지면 통화 우선 (시장 토글보다 신뢰). USD→$, KRW→원.
  const krw = currency ? currency === 'KRW' : market === 'kr';
  if (krw) return Number(n).toLocaleString('ko-KR') + '원';
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
  // 상세화면 관심추가도 공용 경로로 — 서버(익명ID) 동기화 + 소스/현재가 기록 통일
  if (!watchlist[currentMarket].find(i => i.code === currentSymbol)) {
    addToWatchFromTab(currentSymbol, name, currentMarket, 'stock', _curPrice);
  }
  document.getElementById('addWatchBtn').textContent = '✅ 추가됨';
  setTimeout(() => { document.getElementById('addWatchBtn').textContent = '⭐ 관심종목 추가'; }, 1500);
});

// 관심 버튼(⭐) 위임 리스너 — data-* 로 안전하게 값 전달(이름 내 따옴표에도 안전)
document.addEventListener('click', e => {
  const b = e.target.closest('.wl-quick-btn');
  if (!b) return;
  e.stopPropagation();
  addToWatchFromTab(b.dataset.wlTicker, b.dataset.wlName, b.dataset.wlMarket,
                    b.dataset.wlSource || '', parseFloat(b.dataset.wlPrice) || 0);
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

// 1Q (3개월 유망주) 마켓 탭 + 실행
document.querySelectorAll('.oq-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.oq-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    oneqMarket = btn.dataset.m;
    ['oqList','oqSummary','oqEmpty'].forEach(id => document.getElementById(id).classList.add('hidden'));
  });
});
document.getElementById('oqRunBtn').addEventListener('click', () => runOneQScreener(false));
document.getElementById('oqRefreshBtn').addEventListener('click', () => runOneQScreener(true));
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

document.querySelectorAll('.div3-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.div3-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    div3Market = btn.dataset.m;
    ['div3List','div3Summary','div3Empty'].forEach(id => document.getElementById(id).classList.add('hidden'));
    runDiv3Screener(false);
  });
});
document.getElementById('div3RunBtn').addEventListener('click', () => runDiv3Screener(false));
document.getElementById('div3RefreshBtn').addEventListener('click', () => runDiv3Screener(true));

document.getElementById('spacRunBtn').addEventListener('click', () => runSpacScreener(false));
document.getElementById('spacRefreshBtn').addEventListener('click', () => runSpacScreener(true));

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
  _setAiProvider(null);   // 새 분석 시작 — 배지 초기화
  document.getElementById('aiModalContent').innerHTML =
    '<div class="ai-loading"><div class="spinner"></div><p>AI 분석 중...<br><small>검색 및 분석에 15~30초 소요됩니다</small></p></div>';
  document.getElementById('aiModal').classList.remove('hidden');
}

/* AI 응답 객체(d)에서 _ai_provider를 읽어 모달 헤더 배지 표시 */
function _setAiProvider(d) {
  const badge = document.getElementById('aiProviderBadge');
  if (!badge) return;
  const p = d && d._ai_provider;
  if (!p) { badge.className = 'ai-provider-badge hidden'; badge.textContent = ''; return; }
  const isGemini = /gemini/i.test(p);
  badge.className = 'ai-provider-badge ' + (isGemini ? 'gemini' : 'groq');
  badge.textContent = (isGemini ? '✦ Gemini' : '⚡ Groq');
  badge.title = d._ai_model ? `${p} · ${d._ai_model}` : p;
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

async function runAiNews(symOverride, nameOverride, marketOverride) {
  const sym = (typeof symOverride === 'string' && symOverride) ? symOverride : currentSymbol;
  if (!sym) return;
  const name = nameOverride || document.getElementById('stockName').textContent;
  const mkt = marketOverride || currentMarket;
  openAiModal('📰 뉴스·감성 — ' + name);
  try {
    const d = await fetch(SERVER + '/ai/news', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym, name, market: mkt }),
    }).then(r => r.json());
    _setAiProvider(d);

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

async function runInsider() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('🏛 내부자·기관 — ' + name);
  const box = document.getElementById('aiModalContent');
  box.innerHTML = '<div style="color:var(--muted);padding:10px">내부자 거래·기관 보유 조회 중…</div>';
  const f$ = v => v == null ? '-' : (Math.abs(v) >= 1e9 ? '$' + (v/1e9).toFixed(2) + 'B'
    : Math.abs(v) >= 1e6 ? '$' + (v/1e6).toFixed(1) + 'M' : '$' + Math.round(v).toLocaleString());
  try {
    const d = await apiFetch(`/api/insider?symbol=${encodeURIComponent(currentSymbol)}`);
    if (d.error) { box.innerHTML = `<p style="color:var(--red)">오류: ${escHtml(d.error)}</p>`; return; }
    const s = d.summary || {};
    let head = '';
    if (s.buys || s.sells) {
      const netPos = (s.net_value || 0) >= 0;
      head = `<div style="margin-bottom:8px;font-size:13px">최근 6개월 내부자:
        <b style="color:#f85149">매수 ${s.buys}건</b> / <b style="color:#58a6ff">매도 ${s.sells}건</b>
        · 순 <b style="color:${netPos ? 'var(--green)' : 'var(--red)'}">${f$(s.net_value)}</b> ${netPos ? '🟢' : '🔴'}</div>`;
    }
    const txns = (d.transactions || []).map(t => {
      const c = t.side === '매수' ? '#f85149' : t.side === '매도' ? '#58a6ff' : 'var(--muted)';
      return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span>${escHtml(t.date)} · ${escHtml(t.insider)} <span style="color:var(--muted)">${escHtml(t.position)}</span></span>
        <span style="color:${c};white-space:nowrap">${t.side} ${t.shares ? t.shares.toLocaleString() : ''}주${t.value ? ' (' + f$(t.value) + ')' : ''}</span></div>`;
    }).join('');
    const inst = (d.institutions || []).map(i =>
      `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span>${escHtml(i.holder)}</span>
        <span>${i.pct.toFixed(2)}% <span style="color:${i.pct_change >= 0 ? 'var(--green)' : 'var(--red)'}">${i.pct_change >= 0 ? '▲' : '▼'}${Math.abs(i.pct_change).toFixed(2)}%p</span></span></div>`).join('');
    box.innerHTML = `${head}
      ${txns ? `<div class="ai-section-title">📝 내부자 거래 (Form 4)</div><div style="max-height:300px;overflow-y:auto">${txns}</div>` : '<div style="color:var(--muted);padding:6px 0">내부자 거래 데이터가 없습니다.</div>'}
      ${inst ? `<div class="ai-section-title" style="margin-top:14px">🏦 기관 보유 상위</div>${inst}` : ''}
      <div class="ai-disclaimer" style="margin-top:12px;font-size:11px;color:var(--muted)">출처: yfinance(SEC Form4/13F 기반). 기관보유(13F)는 분기·최대 45일 지연. 투자 판단·책임은 본인.</div>`;
  } catch (e) { box.innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`; }
}

async function runAiDart() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  openAiModal('📋 전자공시요약 — ' + name);
  try {
    const d = await fetch(SERVER + '/ai/dart', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket, price: _curPrice }),
    }).then(r => r.json());
    _setAiProvider(d);

    if (d.error && !d.annual_report && !d.latest_quarter) {
      document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">${escHtml(d.raw || d.error)}</p>`; return;
    }

    const isDart = d._source === 'DART';  // 한국 실제 공시
    const isReal = isDart || d._source === 'YF' || d._source === 'SEC';  // 실제 재무(DART/SEC/yfinance)
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

    // 재무비율 + 다년 추이 (미국 SEC)
    let ratioHtml = '';
    const _rt = d.ratios || {};
    const _RL = [['op_margin', '영업이익률'], ['net_margin', '순이익률'], ['roe', 'ROE'], ['roa', 'ROA'], ['debt_ratio', '부채비율']];
    const _rcells = _RL.filter(([k]) => _rt[k] != null)
      .map(([k, lbl]) => `<div class="ai-metric"><span>${lbl}</span><strong>${_rt[k]}%</strong></div>`).join('');
    if (_rcells) ratioHtml += `<div class="ai-section-title" style="margin-top:16px">📐 주요 재무비율</div><div class="ai-metrics-row">${_rcells}</div>`;
    const _tr = d.annual_trend || [];
    if (_tr.length >= 2) {
      const rows = _tr.map(t => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="color:var(--muted)">${t.year}</span>
        <span>매출 <b>${escHtml(t.revenue)}</b> · 영업 <b>${escHtml(t.op)}</b> · 순익 <b>${escHtml(t.net)}</b>${t.op_margin != null ? ` <span style="color:var(--muted)">(영익률 ${t.op_margin}%)</span>` : ''}</span></div>`).join('');
      ratioHtml += `<div class="ai-section-title" style="margin-top:14px">📈 다년 추이 (연간)</div>${rows}`;
    }

    // 실제 분배금(배당) 내역 — yfinance (DART엔 ETF 분배금 없음)
    let distHtml = '';
    if (d.distributions && (d.distributions.items || []).length) {
      const dt = d.distributions;
      const rows = dt.items.map(x =>
        `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <span style="color:var(--muted)">${escHtml(x.date)}</span>
          <strong>${Number(x.amount).toLocaleString('ko-KR')}원</strong>
        </div>`).join('');
      distHtml = `<div class="ai-section-title" style="margin-top:16px">💰 실제 분배금(배당) 내역 <span style="font-size:10px;color:var(--muted)">(yfinance)</span></div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">
          최근 1년 합계 <strong style="color:var(--green)">${Number(dt.ttm_sum).toLocaleString('ko-KR')}원</strong>
          ${dt.ttm_yield != null ? ` · 현재가 대비 <strong style="color:var(--green)">${dt.ttm_yield.toFixed(2)}%</strong>` : ''}
          ${dt.count_ttm ? ` · 최근 1년 ${dt.count_ttm}회 지급` : ''}
        </div>
        <div style="max-height:230px;overflow-y:auto;padding-right:6px">${rows}</div>`;
    }

    // AI 추정값인 경우 기존 필드 처리
    const lqHighlights = (lq.highlights || []).map(k => `<li>${escHtml(k)}</li>`).join('');
    const keyPoints    = (ar.key_points  || []).map(k => `<li>${escHtml(k)}</li>`).join('');
    const risks        = (d.major_risks  || []).map(r => `<li style="color:var(--red)">${escHtml(r)}</li>`).join('');

    const sourceLabel = d._source === 'DART'
      ? `<span style="color:var(--green);font-weight:700">✅ DART 실제 공시 데이터</span>`
      : d._source === 'SEC'
      ? `<span style="color:var(--green);font-weight:700">✅ SEC EDGAR 원문 (미국·10-Q/10-K 보고값)</span>`
      : d._source === 'YF'
      ? `<span style="color:var(--green);font-weight:700">✅ yfinance 실제 재무 (미국·SEC 10-Q/10-K 보고값)</span>`
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
        ${lq.total_assets && lq.total_assets !== '-' ? `<div class="ai-metric"><span>자산총계</span><strong>${escHtml(lq.total_assets)}</strong></div>` : ''}
        ${lq.total_liabilities && lq.total_liabilities !== '-' ? `<div class="ai-metric"><span>부채총계</span><strong>${escHtml(lq.total_liabilities)}</strong></div>` : ''}
        ${lq.total_equity && lq.total_equity !== '-' ? `<div class="ai-metric"><span>자본총계</span><strong>${escHtml(lq.total_equity)}</strong></div>` : ''}
        ${lq.debt_ratio && lq.debt_ratio !== '-' ? `<div class="ai-metric"><span>부채비율</span><strong>${escHtml(lq.debt_ratio)}</strong></div>` : ''}
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
        ${ar.total_assets && ar.total_assets !== '-' ? `<div class="ai-metric"><span>자산총계</span><strong>${escHtml(ar.total_assets)}</strong></div>` : ''}
        ${ar.total_liabilities && ar.total_liabilities !== '-' ? `<div class="ai-metric"><span>부채총계</span><strong>${escHtml(ar.total_liabilities)}</strong></div>` : ''}
        ${ar.total_equity && ar.total_equity !== '-' ? `<div class="ai-metric"><span>자본총계</span><strong>${escHtml(ar.total_equity)}</strong></div>` : ''}
        ${ar.debt_ratio && ar.debt_ratio !== '-' ? `<div class="ai-metric"><span>부채비율</span><strong>${escHtml(ar.debt_ratio)}</strong></div>` : ''}
      </div>
      ${keyPoints ? `<ul class="ai-list">${keyPoints}</ul>` : ''}
      ${d.business_outlook ? `<div class="ai-section-title" style="margin-top:16px">🔭 사업 전망</div><div class="ai-impact">${escHtml(d.business_outlook)}</div>` : ''}
      ${risks ? `<ul class="ai-list ai-risk-list">${risks}</ul>` : ''}
      ${ratioHtml}
      ${distHtml}
      ${disclosures ? `<div class="ai-section-title" style="margin-top:16px">📄 최근 공시${isReal ? ' (실제)' : ''}</div>${disclosures}` : ''}
      ${d.ai_opinion ? `
      <div class="ai-section-title" style="margin-top:16px">🤖 AI 재무의견</div>
      <div class="ai-impact" style="border-left-color:var(--violet)">${escHtml(d.ai_opinion)}</div>` : ''}
      <div class="ai-source">출처: ${escHtml(d.source || '')}</div>
      ${!isReal ? `<div class="ai-disclaimer" style="border-color:rgba(248,81,73,.3);background:rgba(248,81,73,.05)">
        ⚠ AI 추정값입니다. 실제 DART 공시와 다를 수 있습니다. 투자 전 반드시 <a href="https://dart.fss.or.kr" target="_blank" style="color:var(--accent)">DART 원문</a>을 확인하세요.
      </div>` : ''}
      ${d._source === 'SEC' ? `<div class="ai-disclaimer" style="font-size:11px;color:var(--muted)">
        ✅ 회사가 SEC에 제출한 <b>10-Q/10-K 원문 XBRL 확정 보고값</b>입니다. 위 '최근 공시'에서 원문(10-Q/10-K)을 직접 확인할 수 있습니다.
      </div>` : ''}
      ${d._source === 'YF' ? `<div class="ai-disclaimer" style="font-size:11px;color:var(--muted)">
        yfinance가 취합한 SEC 보고값 기준입니다. 정확한 원문은 <a href="https://www.sec.gov/edgar/searchedgar/companysearch" target="_blank" style="color:var(--accent)">SEC EDGAR</a>에서 확인하세요.
      </div>` : ''}`;

    // ── 공시 데이터 기반 채팅 섹션 추가 ──
    const _bs = (o) => {
      const p = [];
      if (o.total_assets && o.total_assets !== '-')      p.push(`자산총계 ${o.total_assets}`);
      if (o.total_liabilities && o.total_liabilities !== '-') p.push(`부채총계 ${o.total_liabilities}`);
      if (o.total_equity && o.total_equity !== '-')      p.push(`자본총계 ${o.total_equity}`);
      if (o.debt_ratio && o.debt_ratio !== '-')          p.push(`부채비율 ${o.debt_ratio}`);
      return p.length ? ', ' + p.join(', ') : '';
    };
    _dartContext = [
      `종목: ${name} (${currentSymbol})`,
      lq.period ? `최근 분기 (${lq.period}): 매출 ${lq.revenue||'N/A'}, 영업이익 ${lq.operating_profit||'N/A'}, 순이익 ${lq.net_profit||'N/A'}, 영업이익률 ${lq.op_margin||'N/A'}${_bs(lq)}` : '',
      (lq.highlights||[]).length ? `분기 하이라이트: ${lq.highlights.join(' / ')}` : '',
      ar.year ? `연간 (${ar.year}): 매출 ${ar.revenue||'N/A'}, 영업이익 ${ar.operating_profit||'N/A'}, 순이익 ${ar.net_profit||'N/A'}${_bs(ar)}` : '',
      (ar.key_points||[]).length ? `연간 핵심: ${ar.key_points.join(' / ')}` : '',
      (d.major_risks||[]).length ? `주요 위험: ${d.major_risks.join(' / ')}` : '',
      d.business_outlook ? `사업 전망: ${d.business_outlook}` : '',
      (d.recent_disclosures||[]).length ? `최근 공시:\n${d.recent_disclosures.map(x=>`  - ${x.date} ${x.title}`).join('\n')}` : '',
      (d.distributions && (d.distributions.items||[]).length)
        ? `실제 분배금(배당) 내역 [yfinance, 배당락일 기준] — 최근1년 합계 ${d.distributions.ttm_sum}원${d.distributions.ttm_yield!=null?`(현재가 대비 ${d.distributions.ttm_yield}%)`:''}, 최근1년 ${d.distributions.count_ttm||''}회:\n${d.distributions.items.map(x=>`  - ${x.date}: ${x.amount}원`).join('\n')}`
        : '',
      d.ai_opinion ? `AI 재무의견: ${d.ai_opinion}` : '',
    ].filter(Boolean).join('\n');
    _dartChatHistory = [];
    _appendDartChat(name);

  } catch (e) {
    document.getElementById('aiModalContent').innerHTML = `<p style="color:var(--red)">오류: ${escHtml(e.message)}</p>`;
  }
}

/* ── AI 종합 매수점수 ── */
const _scoreColor = (n) => n >= 75 ? '#3fb950' : n >= 60 ? '#7bc043'
  : n >= 45 ? '#d29922' : n >= 30 ? '#e3892c' : '#f85149';
const _DIM_LABELS = { valuation: '밸류에이션', technical: '기술적', financial: '재무·실적',
                      sentiment: '뉴스·심리', consensus: '시장기대' };

function _resetAiScore() {
  const empty = document.getElementById('aiScoreEmpty');
  const res   = document.getElementById('aiScoreResult');
  if (empty) empty.classList.remove('hidden');
  if (res)  { res.classList.add('hidden'); res.innerHTML = ''; }
  const btn = document.getElementById('btnAiScore');
  if (btn) { btn.disabled = false; btn.textContent = '🎯 AI 종합 매수점수 분석'; }
}

async function runAiScore() {
  if (!currentSymbol) return;
  const name = document.getElementById('stockName').textContent;
  const btn  = document.getElementById('btnAiScore');
  const res  = document.getElementById('aiScoreResult');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 종합 분석 중... (15~30초)'; }
  const fundamentals = {
    per: document.getElementById('mPer')?.textContent, fpe: document.getElementById('mFpe')?.textContent,
    pbr: document.getElementById('mPbr')?.textContent, eps: document.getElementById('mEps')?.textContent,
    roe: document.getElementById('mRoe')?.textContent, dividend: document.getElementById('mDiv')?.textContent,
    market_cap: document.getElementById('mMcap')?.textContent,
  };
  try {
    const _priceNum = parseFloat((document.getElementById('stockPrice')?.textContent || '').replace(/[^0-9.]/g, '')) || null;
    const d = await fetch(SERVER + '/ai/score', {
      method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentSymbol, name, market: currentMarket, fundamentals, price: _priceNum }),
    }).then(r => r.json());

    if (d.error || d.total_score == null) {
      _resetAiScore();
      alert('종합점수 분석 실패: ' + (d.error || d.raw || '응답 오류'));
      return;
    }

    const total = Math.round(d.total_score);
    const col   = _scoreColor(total);
    const dims  = d.dimensions || {};
    const provider = d._ai_provider ? `<span class="ai-provider-badge ${/gemini/i.test(d._ai_provider)?'gemini':'groq'}" style="margin:0">${/gemini/i.test(d._ai_provider)?'✦ Gemini':'⚡ Groq'}</span>` : '';

    const w = d.weights || {};
    const dimRows = Object.keys(_DIM_LABELS).map(k => {
      const o = dims[k] || {}; const n = Math.round(o.score || 0);
      const wtag = w[k] != null ? `<span style="font-size:10px;color:var(--muted)"> ·${w[k]}%</span>` : '';
      return `<div class="ai-score-dim">
          <span class="d-name">${_DIM_LABELS[k]}${wtag}</span>
          <span class="d-bar-wrap"><span class="d-bar" style="width:${n}%;background:${_scoreColor(n)}"></span></span>
          <span class="d-val" style="color:${_scoreColor(n)}">${n}</span>
        </div>
        ${o.comment ? `<div class="ai-score-dim-comment">${escHtml(o.comment)}</div>` : ''}`;
    }).join('');

    res.innerHTML = `
      <div class="ai-score-head">
        <div class="ai-score-gauge" style="background:conic-gradient(${col} ${total*3.6}deg, var(--surface) 0)">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center">
            <span class="g-num" style="color:${col}">${total}</span><span class="g-of">/ 100</span>
          </div>
        </div>
        <div class="ai-score-verdict">
          <div class="ai-score-reco" style="color:${col}">${escHtml(d.recommendation || '-')}</div>
          <div class="ai-score-summary">${escHtml(d.summary || '')}</div>
        </div>
      </div>
      <div class="ai-score-dims">${dimRows}</div>
      <div class="ai-score-foot">${provider} · 항목 옆 %는 총점 가중치(기술적=백테스트 실증) · ⚠ 참고용, 투자 권유 아님</div>`;

    document.getElementById('aiScoreEmpty').classList.add('hidden');
    res.classList.remove('hidden');
  } catch (e) {
    _resetAiScore();
    alert('종합점수 분석 오류: ' + e.message);
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
    _setAiProvider(d);

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
    _setAiProvider(d);

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
    _setAiProvider(d);

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

    // 미니 차트 렌더링 (기존 차트 데이터 재활용)
    try {
      const miniCanvas = document.getElementById('chartAnalysisMini');
      if (miniCanvas && _lastChartData?.close?.length) {
        const labels60 = (_lastChartData.dates || []).slice(-60);
        const closes60 = _lastChartData.close.slice(-60);
        const minP = Math.min(...closes60.filter(v=>v!=null));
        const maxP = Math.max(...closes60.filter(v=>v!=null));
        new Chart(miniCanvas, {
          type: 'line',
          data: {
            labels: labels60,
            datasets: [{
              data: closes60,
              borderColor: d.trend === '상승' ? '#f85149' : d.trend === '하락' ? '#58a6ff' : '#8b949e',
              borderWidth: 1.5, fill: true,
              backgroundColor: d.trend === '상승' ? 'rgba(248,81,73,.08)' : d.trend === '하락' ? 'rgba(88,166,255,.08)' : 'rgba(139,148,158,.06)',
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

/* ── DART 공시 채팅 ── */
let _dartChatHistory = [];
let _dartContext     = '';

function _appendDartChat(name) {
  const contentEl = document.getElementById('aiModalContent');
  if (!contentEl) return;

  // 채팅 섹션 HTML 추가
  const sec = document.createElement('div');
  sec.id = 'dartChatSection';
  sec.style.cssText = 'margin-top:18px;border-top:1px solid var(--border);padding-top:14px;';
  sec.innerHTML = `
    <div class="ai-section-title" style="margin-bottom:10px">💬 공시 데이터에 대해 질문하세요</div>
    <div id="dartChatMsgs" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;min-height:0;"></div>
    <div style="display:flex;gap:8px;">
      <input id="dartChatInput" type="text" inputmode="text" enterkeyhint="send"
        placeholder="예) 최신 분기 영업이익을 설명해줘"
        style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:8px;
               padding:9px 12px;color:var(--text);font-size:13px;outline:none;">
      <button id="dartChatSend" style="background:#a78bfa;border:none;border-radius:8px;
               padding:9px 14px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">전송</button>
    </div>`;
  contentEl.appendChild(sec);

  const input   = document.getElementById('dartChatInput');
  const sendBtn = document.getElementById('dartChatSend');
  const msgBox  = document.getElementById('dartChatMsgs');

  const send = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    sendBtn.disabled = true;

    _appendChatBubble(msgBox, 'user', msg);
    _dartChatHistory.push({ role: 'user', content: msg });
    msgBox.scrollIntoView({ behavior: 'smooth', block: 'end' });

    const loadId = 'dload_' + Date.now();
    msgBox.insertAdjacentHTML('beforeend',
      `<div id="${loadId}" style="align-self:flex-start;background:var(--surface);border:1px solid var(--border);
         border-radius:10px 10px 10px 2px;padding:8px 12px;font-size:12px;color:var(--muted)">● 답변 생성 중...</div>`);
    msgBox.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });

    try {
      const res = await fetch(SERVER + '/ai/dart-chat', {
        method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: currentSymbol, name, market: currentMarket,
          dart_context: _dartContext,
          message: msg,
          history: _dartChatHistory.slice(0, -1),
        }),
      }).then(r => r.json());

      document.getElementById(loadId)?.remove();
      _setAiProvider(res);
      const answer = res.answer || res.error || '응답 없음';
      _appendChatBubble(msgBox, 'assistant', answer);
      _dartChatHistory.push({ role: 'assistant', content: answer });
    } catch(e) {
      document.getElementById(loadId)?.remove();
      _appendChatBubble(msgBox, 'assistant', '오류: ' + e.message);
    }

    sendBtn.disabled = false;
    msgBox.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
}

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

  // 채팅 전용 레이아웃 (고정 높이 없이 flex로 채움)
  contentEl.style.cssText = 'display:flex;flex-direction:column;padding:0;overflow:hidden;';
  contentEl.innerHTML = `
    <div id="chatMessages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:120px;"></div>
    <div style="display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border);background:var(--bg);flex-shrink:0;">
      <input id="chatInput" type="text" inputmode="text" enterkeyhint="send"
        placeholder="${name}에 대해 질문하세요..." autocomplete="off"
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
      _setAiProvider(res);
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
  // 모바일에서는 즉시 포커스 시 키보드가 모달을 가리므로 데스크탑에서만 자동 포커스
  if (window.innerWidth > 600) input.focus();
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
    _setAiProvider(d);

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
document.getElementById('btnInsider').addEventListener('click', runInsider);
document.getElementById('btRun').addEventListener('click', runBacktest);
document.getElementById('btSymbol').addEventListener('keydown', e => { if (e.key === 'Enter') runBacktest(); });
document.getElementById('srvSurgeBtn').addEventListener('click', () => runServerScreen('surge'));
document.getElementById('srvOqBtn').addEventListener('click', () => runServerScreen('oneq'));
document.getElementById('srvRevBtn').addEventListener('click', () => runServerScreen('reversal'));
document.getElementById('btnValuation').addEventListener('click', runAiValuation);
document.getElementById('btnChart').addEventListener('click', runChartAnalysis);
document.getElementById('btnLegends').addEventListener('click', runLegendAnalysis);
document.getElementById('btnAiChat').addEventListener('click', openAiChat);
document.getElementById('btnAiScore').addEventListener('click', runAiScore);
document.querySelectorAll('.chart-range').forEach(b =>
  b.addEventListener('click', () => loadChartRange(b.dataset.range)));
// 차트 지표 토글
document.querySelectorAll('.ind-toggle').forEach(b =>
  b.addEventListener('click', () => {
    const k = b.dataset.ind;
    _ind[k] = !_ind[k];
    _saveInd();
    _applyIndToggleUI();
    if (_lastChartData) updateCharts(_lastChartData);   // 재적용
  }));
document.querySelectorAll('.idx-range').forEach(b =>
  b.addEventListener('click', () => {
    _idxRange = b.dataset.range;
    document.querySelectorAll('.idx-range').forEach(x => x.classList.toggle('active', x.dataset.range === _idxRange));
    if (_idxSymbol) loadIndexChart(_idxSymbol, _idxName);
  }));
document.getElementById('idxRefreshBtn').addEventListener('click', loadIndices);

// 거시경제
const _mRefresh = document.getElementById('macroRefreshBtn');
if (_mRefresh) _mRefresh.addEventListener('click', () => { document.getElementById('macroUS').innerHTML = ''; loadMacro(); });
const _mSend = document.getElementById('macroChatSend');
if (_mSend) _mSend.addEventListener('click', sendMacroChat);
const _mInput = document.getElementById('macroChatInput');
if (_mInput) _mInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMacroChat(); });

// 섹터
const _secRefresh = document.getElementById('sectorRefreshBtn');
if (_secRefresh) _secRefresh.addEventListener('click', () => { document.getElementById('sectorUS').innerHTML = ''; loadSectors(); });
document.querySelectorAll('#sectorChartCard .sec-range').forEach(b =>
  b.addEventListener('click', () => loadSectorChart(b.dataset.range)));
const _secSend = document.getElementById('sectorChatSend');
if (_secSend) _secSend.addEventListener('click', sendSectorChat);
const _secInput = document.getElementById('sectorChatInput');
if (_secInput) _secInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendSectorChat(); });

document.getElementById('fortuneRunBtn').addEventListener('click', runFortune);

/* ── 초기화 ── */
loadWatchlistData();
_refreshOwnedMap();
initCharts();
_renderScreenerVersions();
