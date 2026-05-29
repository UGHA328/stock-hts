/* ── 설정 ── */
let API = localStorage.getItem("stockApiUrl") || "";

function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { "ngrok-skip-browser-warning": "1", ...(opts.headers || {}) },
  });
}
let market = "us";
let scMarket = "us";
let perMkt   = "us";
let wlMarket = "us";
let priceChart = null;
let currentCode = null;
let currentName = null;
let searchTimer = null;
const watchlist = JSON.parse(localStorage.getItem("watchlist") || '{"us":[],"kr":[]}');

/* ── 초기화 ── */
window.addEventListener("DOMContentLoaded", () => {
  if (!API) { show("setupModal"); hide("mainApp"); }
  else       { show("mainApp");   hide("setupModal"); initApp(); }

  document.getElementById("saveServerBtn").addEventListener("click", () => {
    const v = document.getElementById("serverUrlInput").value.trim().replace(/\/$/, "");
    if (!v) return alert("URL을 입력하세요");
    API = v; localStorage.setItem("stockApiUrl", API);
    hide("setupModal"); show("mainApp"); initApp();
  });
  document.getElementById("useLocalBtn").addEventListener("click", () => {
    API = "http://localhost:5000";
    localStorage.setItem("stockApiUrl", API);
    hide("setupModal"); show("mainApp"); initApp();
  });
});

function initApp() {
  initNav();
  initMarketToggle();
  initSearch();
  initScreener();
  initPerScreener();
  initWatchlist();
  checkConn();
  setInterval(checkConn, 30000);
}

/* ── 서버 연결 확인 ── */
async function checkConn() {
  const dot = document.getElementById("connDot");
  try {
    await apiFetch(`${API}/api/kr/status`, { signal: AbortSignal.timeout(3000) });
    dot.className = "conn-dot online";
  } catch { dot.className = "conn-dot offline"; }
}

/* ── 설정 열기 ── */
function openSettings() {
  document.getElementById("serverUrlInput").value = API;
  show("setupModal");
}

/* ── 탭 네비 ── */
function initNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
      document.getElementById(`tab-${tab}`).classList.remove("hidden");
      if (tab === "watchlist") renderWatchlist();
    });
  });
}

/* ── 마켓 토글 ── */
function initMarketToggle() {
  document.querySelectorAll(".mkt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mkt-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      market = btn.dataset.m;
      currentCode = null;
      hide("stockCard"); show("homeEmpty");
    });
  });
  document.querySelectorAll(".mkt-btn-sm").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mkt-btn-sm").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      scMarket = btn.dataset.m;
      hide("scList"); hide("scEmpty");
    });
  });
  document.querySelectorAll(".per-btn-sm").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".per-btn-sm").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      perMkt = btn.dataset.m;
      hide("perList"); hide("perEmpty");
    });
  });
  document.querySelectorAll(".wl-mkt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".wl-mkt-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      wlMarket = btn.dataset.m;
      renderWatchlist();
    });
  });
}

/* ── 검색 ── */
function initSearch() {
  const inp = document.getElementById("searchInput");
  inp.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = inp.value.trim();
    if (!q) { hide("searchResults"); return; }
    searchTimer = setTimeout(() => doSearch(q), 400);
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrap")) hide("searchResults");
  });
}

async function doSearch(q) {
  const box = document.getElementById("searchResults");
  box.innerHTML = '<div class="drop-item">검색 중...</div>';
  show("searchResults");
  const url = market === "us"
    ? `${API}/api/us/search?q=${encodeURIComponent(q)}`
    : `${API}/api/kr/search?q=${encodeURIComponent(q)}`;
  try {
    const res  = await apiFetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const items = Array.isArray(data) ? data.filter(d => !d.error && (d.name || d.symbol)) : [];
    if (!items.length) { box.innerHTML = '<div class="drop-item">결과 없음</div>'; return; }
    box.innerHTML = items.map(d => {
      const name = d.name || d.description || "", code = d.symbol || d.code || "";
      return `<div class="drop-item" data-code="${code}" data-name="${name}">
        <div class="di-name">${name}</div><div class="di-code">${code}</div>
      </div>`;
    }).join("");
    box.querySelectorAll(".drop-item").forEach(el => {
      el.addEventListener("click", () => {
        selectStock(el.dataset.code, el.dataset.name);
        hide("searchResults");
        document.getElementById("searchInput").value = "";
      });
    });
  } catch (e) {
    box.innerHTML = `<div class="drop-item">오류: ${e.message}</div>`;
  }
}

/* ── 종목 선택 ── */
let chartInst = null;
async function selectStock(code, name) {
  currentCode = code; currentName = name;
  document.getElementById("scName").textContent = name;
  document.getElementById("scCode").textContent = code;
  hide("homeEmpty"); show("stockCard");

  const qUrl = market === "us" ? `${API}/api/us/quote/${code}` : `${API}/api/kr/quote/${code}`;
  const cUrl = market === "us" ? `${API}/api/us/chart/${code}` : `${API}/api/kr/chart/${code}`;
  const [q, c] = await Promise.all([
    apiFetch(qUrl, { signal: AbortSignal.timeout(10000) }).then(r => r.json()),
    apiFetch(cUrl, { signal: AbortSignal.timeout(10000) }).then(r => r.json()),
  ]);

  // 주가 헤더
  const price = q.price || 0;
  const chg   = parseFloat(q.change || 0);
  const pct   = parseFloat(q.change_pct || 0);
  document.getElementById("scPrice").textContent  = fmtPrice(price, market);
  const chgEl = document.getElementById("scChange");
  chgEl.textContent = `${chg >= 0 ? "+" : ""}${chg.toFixed(2)} (${chg >= 0 ? "+" : ""}${pct.toFixed(2)}%)`;
  chgEl.className   = "sc-change " + (chg >= 0 ? "up" : "down");
  document.getElementById("mOpen").textContent = fmtPrice(q.open || 0, market);
  document.getElementById("mHigh").textContent = fmtPrice(q.high || 0, market);
  document.getElementById("mLow").textContent  = fmtPrice(q.low  || 0, market);
  document.getElementById("mVol").textContent  = fmtVol(q.volume || 0);

  // 펀더멘털
  const na = '<span class="f-na">-</span>';
  const fmtX = v => v != null ? `${v.toFixed(1)}x` : na;
  const fmtPct = v => v != null ? `${v.toFixed(2)}%` : na;
  document.getElementById("fPer").innerHTML     = fmtX(q.per);
  document.getElementById("fFwdPer").innerHTML  = fmtX(q.forward_per);
  document.getElementById("fSectPer").innerHTML = fmtX(q.sector_per);
  document.getElementById("fPbr").innerHTML     = fmtX(q.pbr);
  document.getElementById("fRoe").innerHTML     = fmtPct(q.roe);
  document.getElementById("fDiv").innerHTML     = fmtPct(q.div_yield);
  const indEl = document.getElementById("fIndustry");
  indEl.textContent = q.industry ? `📊 ${q.industry}` : "";

  // 차트
  if (chartInst) { chartInst.destroy(); chartInst = null; }
  if (c && !c.error) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    chartInst = new Chart(ctx, {
      type: "line",
      data: {
        labels: c.dates || [],
        datasets: [{
          data: c.close || c.closes || [],
          borderColor: "#58a6ff", backgroundColor: "rgba(88,166,255,.1)",
          fill: true, tension: 0.3, pointRadius: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8b949e", maxTicksLimit: 6 }, grid: { color: "#21262d" } },
          y: { ticks: { color: "#8b949e" }, grid: { color: "#21262d" }, position: "right" },
        },
      },
    });
  }

  // 관심종목 버튼
  document.getElementById("addWlBtn").onclick = () => {
    const m = market;
    if (!watchlist[m]) watchlist[m] = [];
    if (!watchlist[m].find(i => i.code === code)) {
      watchlist[m].push({ code, name });
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
      alert(`${name} 관심종목에 추가됨`);
    } else { alert("이미 관심종목에 있습니다"); }
  };
}

/* ── 급등 스크리너 ── */
function initScreener() {
  document.getElementById("scRunBtn").addEventListener("click", () => runScreener(false));
  document.getElementById("scRefBtn").addEventListener("click", () => runScreener(true));
}

async function runScreener(refresh) {
  const btn = document.getElementById("scRunBtn");
  btn.disabled = true; btn.textContent = "⏳";
  show("scLoading"); hide("scList"); hide("scEmpty");
  const url = `${API}/api/screener/${scMarket}${refresh ? "?refresh=true" : ""}`;
  try {
    const res  = await apiFetch(url, { signal: AbortSignal.timeout(120000) });
    const data = await res.json();
    renderScList(data.results || []);
  } catch (e) { alert("오류: " + e.message); }
  finally { btn.disabled = false; btn.textContent = "▶ 실행"; hide("scLoading"); }
}

function renderScList(items) {
  const el = document.getElementById("scList");
  if (!items.length) { show("scEmpty"); return; }
  el.innerHTML = items.map(item => {
    const chgCls  = item.change_pct >= 0 ? "up" : "down";
    const scoreCls = item.score >= 9 ? "gold" : "";
    const price   = scMarket === "us" ? `$${item.price?.toFixed(2) ?? "-"}` : `${item.price?.toLocaleString("ko-KR") ?? "-"}원`;
    const sigs    = item.signals.slice(0, 3).map(s => `<span class="tag tag-sig">${s}</span>`).join("");
    return `<div class="result-card" data-code="${item.ticker}" data-name="${item.name}" data-mkt="${scMarket}">
      <div class="rc-top">
        <div><div class="rc-name">${item.name}</div><div class="rc-code">${item.ticker}</div></div>
        <div><div class="rc-price">${price}</div><div class="rc-chg ${chgCls}">${item.change_pct >= 0 ? "+" : ""}${item.change_pct}%</div></div>
      </div>
      <div class="rc-bottom">
        <span class="tag tag-score ${scoreCls}">종합 ${item.score}점</span>
        <span class="tag tag-vol">거래량 ${item.vol_ratio}x</span>
        <span class="tag tag-rsi">RSI ${item.rsi}</span>
        ${sigs}
      </div>
    </div>`;
  }).join("");
  el.querySelectorAll(".result-card").forEach(c => c.addEventListener("click", () => {
    market = c.dataset.mkt;
    document.querySelectorAll(".mkt-btn").forEach(b => b.classList.toggle("active", b.dataset.m === market));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === "home"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById("tab-home").classList.remove("hidden");
    selectStock(c.dataset.code, c.dataset.name);
  }));
  show("scList");
}

/* ── 저PER 스크리너 ── */
function initPerScreener() {
  document.getElementById("perRunBtn").addEventListener("click", () => runPerScreener(false));
  document.getElementById("perRefBtn").addEventListener("click", () => runPerScreener(true));
}

async function runPerScreener(refresh) {
  const btn = document.getElementById("perRunBtn");
  btn.disabled = true; btn.textContent = "⏳";
  show("perLoading"); hide("perList"); hide("perEmpty");
  const url = `${API}/api/per/${perMkt}${refresh ? "?refresh=true" : ""}`;
  try {
    const res  = await apiFetch(url, { signal: AbortSignal.timeout(150000) });
    const data = await res.json();
    renderPerList(data.results || []);
  } catch (e) { alert("오류: " + e.message); }
  finally { btn.disabled = false; btn.textContent = "▶ 실행"; hide("perLoading"); }
}

function renderPerList(items) {
  const el = document.getElementById("perList");
  if (!items.length) { show("perEmpty"); return; }
  el.innerHTML = items.map((item, i) => {
    const fpe   = item.forward_pe;
    const pCls  = fpe < 10 ? "per-vlow" : fpe < 15 ? "per-low" : fpe < 20 ? "per-mid" : "per-high";
    const price = perMkt === "us" ? `$${item.price?.toFixed(2) ?? "-"}` : `${item.price?.toLocaleString("ko-KR") ?? "-"}원`;
    const chgCls = item.change_pct >= 0 ? "up" : "down";
    return `<div class="result-card" data-code="${item.ticker}" data-name="${item.name}" data-mkt="${perMkt}">
      <div class="rc-top">
        <div>
          <div class="rc-name">${i + 1}. ${item.name}</div>
          <div class="rc-code">${item.ticker} · ${item.sector}</div>
        </div>
        <div>
          <div class="rc-price">${price}</div>
          <div class="rc-chg ${chgCls}">${item.change_pct >= 0 ? "+" : ""}${item.change_pct}%</div>
        </div>
      </div>
      <div class="rc-meta">
        <span>포워드 PER: <strong class="${pCls.replace("per-","")}">${fpe.toFixed(1)}</strong></span>
        <span>트레일링: ${item.trailing_pe?.toFixed(1) ?? "-"}</span>
        <span>시총: ${fmtCap(item.market_cap, perMkt)}</span>
      </div>
    </div>`;
  }).join("");
  el.querySelectorAll(".result-card").forEach(c => c.addEventListener("click", () => {
    market = c.dataset.mkt;
    document.querySelectorAll(".mkt-btn").forEach(b => b.classList.toggle("active", b.dataset.m === market));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === "home"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById("tab-home").classList.remove("hidden");
    selectStock(c.dataset.code, c.dataset.name);
  }));
  show("perList");
}

/* ── 관심종목 ── */
function initWatchlist() {}

function renderWatchlist() {
  const el    = document.getElementById("wlList");
  const empty = document.getElementById("wlEmpty");
  const items = watchlist[wlMarket] || [];
  if (!items.length) { el.innerHTML = ""; show("wlEmpty"); return; }
  hide("wlEmpty");
  el.innerHTML = items.map(item => `
    <div class="result-card" data-code="${item.code}" data-name="${item.name}" data-mkt="${wlMarket}" style="flex-direction:row;align-items:center;justify-content:space-between">
      <div><div class="rc-name">${item.name}</div><div class="rc-code">${item.code}</div></div>
      <button onclick="removeWl('${item.code}','${wlMarket}',event)" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">×</button>
    </div>`).join("");
  el.querySelectorAll(".result-card").forEach(c => c.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") return;
    market = c.dataset.mkt;
    document.querySelectorAll(".mkt-btn").forEach(b => b.classList.toggle("active", b.dataset.m === market));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === "home"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById("tab-home").classList.remove("hidden");
    selectStock(c.dataset.code, c.dataset.name);
  }));
}

function removeWl(code, mkt, e) {
  e.stopPropagation();
  watchlist[mkt] = (watchlist[mkt] || []).filter(i => i.code !== code);
  localStorage.setItem("watchlist", JSON.stringify(watchlist));
  renderWatchlist();
}

/* ── 유틸 ── */
function fmtPrice(n, m) {
  if (!n) return "-";
  return m === "us"
    ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString("ko-KR") + "원";
}
function fmtVol(n) {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(1) + "만";
  return n.toLocaleString();
}
function fmtCap(n, m) {
  if (!n) return "-";
  return m === "us"
    ? (n >= 1e12 ? (n/1e12).toFixed(1)+"T" : n >= 1e9 ? (n/1e9).toFixed(1)+"B" : (n/1e6).toFixed(0)+"M")
    : (n >= 1e12 ? (n/1e12).toFixed(1)+"조" : n >= 1e8 ? (n/1e8).toFixed(0)+"억" : "-");
}
function show(id) { document.getElementById(id)?.classList.remove("hidden"); }
function hide(id) { document.getElementById(id)?.classList.add("hidden"); }
