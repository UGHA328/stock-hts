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

/* ── Yahoo Finance API (CORS 프록시 경유) ── */
const YF = 'https://query2.finance.yahoo.com';
const PROXY = 'https://corsproxy.io/?url=';

async function yfFetch(path) {
  const url = PROXY + encodeURIComponent(YF + path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchQuote(symbol) {
  const data = await yfFetch(`/v8/finance/chart/${symbol}?interval=1d&range=5d`);
  const result = data.chart?.result?.[0];
  if (!result) throw new Error('데이터 없음');
  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prev  = meta.chartPreviousClose || meta.previousClose || price;
  const chg   = price - prev;
  const chgPct = prev ? (chg / prev * 100) : 0;
  return {
    price,
    change:     chg,
    change_pct: chgPct,
    open:   meta.regularMarketOpen      || 0,
    high:   meta.regularMarketDayHigh   || 0,
    low:    meta.regularMarketDayLow    || 0,
    volume: meta.regularMarketVolume    || 0,
    name:   meta.shortName || meta.longName || symbol,
    currency: meta.currency || 'USD',
  };
}

async function fetchChart(symbol) {
  const data = await yfFetch(`/v8/finance/chart/${symbol}?interval=1d&range=6mo`);
  const result = data.chart?.result?.[0];
  if (!result) throw new Error('차트 데이터 없음');
  const ts  = result.timestamp || [];
  const q   = result.indicators.quote[0];
  const dates = ts.map(t => {
    const d = new Date(t * 1000);
    return `${d.getMonth()+1}/${d.getDate()}`;
  });
  return { dates, close: q.close, volume: q.volume };
}

async function fetchSearch(query) {
  const q = query.trim();
  if (currentMarket === 'kr') {
    // 6자리 코드 직접 조회
    if (/^\d{6}$/.test(q)) {
      const sym = q + '.KS';
      try {
        const qt = await fetchQuote(sym);
        return [{ symbol: sym, name: qt.name, display: q }];
      } catch { return []; }
    }
    // 한글/영문 이름으로 내장 테이블 검색
    const lower = q.toLowerCase();
    const matches = KR_STOCKS.filter(s =>
      s.name.includes(q) || s.code.startsWith(q) || s.name.toLowerCase().includes(lower)
    ).slice(0, 10);
    return matches.map(s => ({ symbol: s.code + '.KS', name: s.name, display: s.code }));
  }
  // 미국: 야후 파이낸스 검색
  const data = await yfFetch(`/v1/finance/search?q=${q}&newsCount=0&enableFuzzyQuery=false`);
  const quotes = data.quotes || [];
  return quotes
    .filter(qt => qt.quoteType === 'EQUITY' && !qt.symbol.includes('.'))
    .slice(0, 10)
    .map(qt => ({ symbol: qt.symbol, name: qt.shortname || qt.longname || qt.symbol, display: qt.symbol }));
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
    const data = await yfFetch(`/v8/finance/chart/${symbol}?interval=1d&range=6mo`);
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const q    = result.indicators.quote[0];
    const closes  = clean(q.close);
    const volumes = (q.volume || []).map(v => v ?? 0);
    const highs   = clean(q.high);
    if (closes.length < 30) return null;

    const price   = meta.regularMarketPrice || closes[closes.length-1];
    const prev    = meta.chartPreviousClose  || closes[closes.length-2];
    const chgPct  = prev ? ((price - prev) / prev * 100) : 0;
    const rsi     = calcRSI(closes);
    const macd    = calcMACD(closes);
    const ma5     = calcMA(closes, 5);
    const ma20    = calcMA(closes, 20);
    const ma60    = calcMA(closes, Math.min(60, closes.length));
    const vr      = volRatio(volumes);
    const high52  = is52WkHigh(highs);

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

    if (chgPct >= 3)     score += 2;
    else if (chgPct >= 1) score += 1;

    if (score < 4) return null;

    const ticker = symbol.replace(/\.(KS|KQ)$/, '');
    return {
      ticker,
      name:       meta.shortName || meta.longName || ticker,
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
async function batchScreen(list) {
  const results = [];
  for (let i = 0; i < list.length; i += 5) {
    const chunk = list.slice(i, i + 5);
    const settled = await Promise.allSettled(chunk.map(s => screenOne(s)));
    settled.forEach(r => { if (r.status === 'fulfilled' && r.value) results.push(r.value); });
    if (i + 5 < list.length) await new Promise(r => setTimeout(r, 300));
  }
  return results.sort((a, b) => b.score - a.score);
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
    const results = await batchScreen(stockList);
    scCacheSet(cacheKey, results);
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
    // 배치로 v7 quote API 호출 (20개씩)
    const all = [];
    for (let i = 0; i < stockList.length; i += 20) {
      const chunk = stockList.slice(i, i + 20).join(',');
      try {
        const data = await yfFetch(`/v7/finance/quote?symbols=${chunk}&fields=symbol,shortName,regularMarketPrice,regularMarketChangePercent,forwardPE,trailingPE,sector`);
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
  document.getElementById('mOpen').textContent   = formatPrice(q.open,   currentMarket, q.currency);
  document.getElementById('mHigh').textContent   = formatPrice(q.high,   currentMarket, q.currency);
  document.getElementById('mLow').textContent    = formatPrice(q.low,    currentMarket, q.currency);
  document.getElementById('mVolume').textContent = fmtVol(q.volume);
}

/* ── 차트 ── */
function initCharts() {
  const base = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#8b949e', maxTicksLimit: 6 }, grid: { color: '#21262d' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' }, position: 'right' },
    },
  };
  priceChart = new Chart(document.getElementById('priceChart'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,.1)', fill: true, tension: 0.3, pointRadius: 0 }] },
    options: { ...base, plugins: { ...base.plugins, tooltip: { mode: 'index', intersect: false } } },
  });
  volumeChart = new Chart(document.getElementById('volumeChart'), {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: 'rgba(88,166,255,.4)' }] },
    options: { ...base, scales: { ...base.scales, y: { ...base.scales.y, ticks: { color: '#8b949e', callback: v => fmtVol(v) } } } },
  });
}

function updateCharts(d) {
  if (!d) return;
  priceChart.data.labels = d.dates;
  priceChart.data.datasets[0].data = d.close;
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
