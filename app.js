'use strict';
/* ========== util ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'ht.data', CFG = 'ht.cfg', TMR = 'ht.timer';
const FILE = 'habit-tracker.json', DESC = 'habit-tracker-sync';
const WD = '일월화수목금토';
const PAL = ['#B5C7DE', '#D4C5E2', '#B8D4C2', '#EBCFB8', '#E6C3C8', '#C3D8D6', '#E2DCB5', '#C9C4BD'];
const THEMES = [
  ['블루그레이', '#8FA0AE', '#B5A88C', '#BAC2C9'], ['슬레이트 세이지', '#97A596', '#8E9AAB', '#C3C8BE'],
  ['더스티 로즈', '#B49C98', '#8E9DAC', '#CDC0BC'], ['머스타드', '#B7A87F', '#8697A6', '#CFC8B4'],
  ['네이비', '#6F8094', '#A7967E', '#B5BDC7'], ['그레이', '#9A9C9E', '#B4AFA6', '#C9C9C6'],
];
const FONTS = {
  pretendard: ['Pretendard', '"Pretendard Variable",Pretendard'],
  system: ['시스템 (SF)', '-apple-system,"SF Pro Text","Apple SD Gothic Neo"'],
  noto: ['Noto Sans KR', '"Noto Sans KR"', 'Noto+Sans+KR:wght@100..900'],
  plex: ['IBM Plex Sans KR', '"IBM Plex Sans KR"', 'IBM+Plex+Sans+KR:wght@100;200;300;400;500'],
  serif: ['Noto Serif KR', '"Noto Serif KR"', 'Noto+Serif+KR:wght@200..900'],
  gowun: ['고운돋움', '"Gowun Dodum"', 'Gowun+Dodum'],
  custom: ['내 폰트', '"HTCustom"'],
};
const DEF_P = { font: 'pretendard', size: 13, weight: 300, mode: 'auto', life: '#8FA0AE', study: '#B5A88C', accent: '#BAC2C9', heat: 'life' };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const now = () => Date.now();
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const today = () => ds(new Date());
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtMin = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}시간 ${r}분` : `${h}시간`) : `${r}분`; };
const short = m => m >= 60 ? `${(m / 60).toFixed(1).replace(/\.0$/, '')}h` : `${Math.round(m)}m`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function ls(k, v) {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k));
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) { return null; }
}
const I = {
  check: '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  l: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  r: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M5 19h4L19 9l-4-4L5 15v4z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
};

/* ========== data ========== */
function seed() {
  const t = today(), u = now(), all = [0, 1, 2, 3, 4, 5, 6];
  const H = (name, cat, type, target, o, x = {}) => ({ id: uid(), name, cat, type, target, days: all, o, c: t, u, ...x });
  return {
    seed: true,
    habits: [
      H('기상', 'life', 'check', 1, 1), H('운동', 'life', 'check', 1, 2),
      H('물 마시기', 'life', 'count', 8, 3), H('독서', 'life', 'time', 20, 4),
      H('공부', 'study', 'time', 120, 5), H('복습', 'study', 'check', 1, 6),
    ],
    subjects: [],
    sessions: [], logs: {}, u,
  };
}
let S = ls(KEY) || seed();
let cfg = ls(CFG) || {};
let memo = null;

const habits = () => S.habits.filter(h => !h.del).sort((a, b) => a.o - b.o);
const subjects = () => S.subjects.filter(s => !s.del).sort((a, b) => a.o - b.o);
const subj = id => S.subjects.find(s => s.id === id);
function val(h, d) {
  return S.logs[d]?.v?.[h.id]?.[0] || 0;
}
const goal = h => h.type === 'check' ? 1 : h.target;
const done = (h, d) => val(h, d) >= goal(h);
const sched = (h, d) => d >= h.c && h.days.includes(pd(d).getDay());
function dayRate(d) {
  const hs = habits().filter(h => sched(h, d));
  return hs.length ? hs.filter(h => done(h, d)).length / hs.length : null;
}
function streak(h) {
  let d = today(), n = 0;
  if (sched(h, d) && !done(h, d)) d = addD(d, -1);
  for (let i = 0; i < 1000 && d >= h.c; i++, d = addD(d, -1)) {
    if (!sched(h, d)) continue;
    if (done(h, d)) n++; else break;
  }
  return n;
}
function setVal(h, d, v) {
  const L = S.logs[d] || (S.logs[d] = { v: {}, n: ['', 0] });
  L.v[h.id] = [Math.max(0, v), now()];
  commit();
}
function commit(noRender) {
  delete S.seed; S.u = now(); memo = null;
  ls(KEY, S);
  if (!noRender) render();
  schedSync();
}

/* ========== merge / sync ========== */
function mergeArr(a = [], b = []) {
  const m = new Map();
  for (const x of [...a, ...b]) { const o = m.get(x.id); if (!o || (x.u || 0) > (o.u || 0)) m.set(x.id, x); }
  return [...m.values()];
}
function merge(a, b) {
  const logs = {}, E = { v: {}, n: ['', 0] };
  for (const d of new Set([...Object.keys(a.logs || {}), ...Object.keys(b.logs || {})])) {
    const x = a.logs?.[d] || E, y = b.logs?.[d] || E, v = { ...x.v };
    for (const k in y.v) if (!v[k] || y.v[k][1] > v[k][1]) v[k] = y.v[k];
    logs[d] = { v, n: (y.n?.[1] || 0) > (x.n?.[1] || 0) ? y.n : (x.n || ['', 0]) };
  }
  return {
    habits: mergeArr(a.habits, b.habits), subjects: mergeArr(a.subjects, b.subjects),
    sessions: mergeArr(a.sessions, b.sessions), logs, u: Math.max(a.u || 0, b.u || 0),
    prefs: (b.prefs?.u || 0) > (a.prefs?.u || 0) ? b.prefs : a.prefs,
  };
}
let syncing = false, syncT = null, syncMsg = '';
function schedSync() { if (!cfg.token) return; clearTimeout(syncT); syncT = setTimeout(sync, 3000); }
function setSync(m) { syncMsg = m; const e = $('#syncmsg'); if (e) e.textContent = m; }
async function gh(path, opt = {}) {
  const r = await fetch('https://api.github.com' + path, {
    ...opt, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (!r.ok) throw new Error(r.status === 401 ? '토큰이 유효하지 않습니다' : r.status === 404 ? '404' : 'GitHub ' + r.status);
  return r.json();
}
async function readGist(id) {
  const g = await gh('/gists/' + id), f = g.files?.[FILE];
  if (!f) return null;
  const c = f.truncated ? await (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content;
  return JSON.parse(c);
}
async function sync() {
  if (!cfg.token || syncing) return;
  if (!navigator.onLine) return setSync('오프라인 · 연결되면 동기화합니다');
  syncing = true; clearTimeout(syncT); setSync('동기화 중…');
  try {
    let remote = null;
    if (!cfg.gist) {
      const list = await gh('/gists?per_page=100');
      const f = list.find(g => g.files && g.files[FILE]);
      if (f) { cfg.gist = f.id; ls(CFG, cfg); }
    }
    if (cfg.gist) {
      try { remote = await readGist(cfg.gist); }
      catch (e) { if (e.message === '404') { cfg.gist = null; ls(CFG, cfg); } else throw e; }
    }
    const merged = remote ? (S.seed ? remote : merge(S, remote)) : merge(S, {});
    const out = JSON.stringify(merged);
    if (!cfg.gist) {
      const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files: { [FILE]: { content: out } } }) });
      cfg.gist = g.id;
    } else if (out !== JSON.stringify(remote)) {
      await gh('/gists/' + cfg.gist, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: out } } }) });
    }
    S = S.seed ? merged : merge(S, merged); memo = null;
    ls(KEY, S);
    cfg.last = now(); ls(CFG, cfg);
    setSync('동기화 완료 · ' + hm(new Date()));
    softRender();
  } catch (e) {
    setSync('동기화 실패 · ' + e.message);
  }
  syncing = false;
}

/* ========== views ========== */
let view = location.hash.slice(1) || 'today';
let cur = today(), lastToday = today();
let ym = today().slice(0, 7);

function row(h, d) {
  const v = val(h, d), t = goal(h), ok = v >= t, st = streak(h);
  const unit = h.type === 'time' ? '분' : h.type === 'count' ? '회' : '';
  const meta = [];
  if (h.type !== 'check') meta.push(`목표 ${t}${unit}`);
  if (h.days.length < 7) meta.push([1, 2, 3, 4, 5, 6, 0].filter(i => h.days.includes(i)).map(i => WD[i]).join(''));
  if (st) meta.push(`${st}일 연속`);
  const w7 = [...Array(7)].map((_, i) => addD(d, i - 6)).map(x => `<i class="${!sched(h, x) ? 'n' : done(h, x) ? 'y' : val(h, x) > 0 ? 'p' : ''}"></i>`).join('');
  let ctl;
  if (h.type === 'check') ctl = `<button class="chk ${ok ? 'on' : ''}" data-act="tog" data-id="${h.id}" aria-label="완료">${I.check}</button>`;
  else ctl = `<div class="step"><button class="ib" data-act="inc" data-id="${h.id}" data-n="-1">${I.minus}</button><span class="val">${v}<small>/${t}${unit}</small></span><button class="ib" data-act="inc" data-id="${h.id}" data-n="1">${I.plus}</button></div>`;
  return `<div class="hrow ${h.cat} ${ok ? 'ok' : ''}"><div class="hinfo"><div class="hname">${esc(h.name)}</div><div class="hmeta"><span class="wd7">${w7}</span><span>${meta.join(' · ') || '매일'}</span></div></div>${ctl}${h.type !== 'check' ? `<i class="pbar" style="width:${Math.min(1, v / t) * 100}%"></i>` : ''}</div>`;
}
const lvl = r => r == null ? 'na' : r === 0 ? '' : r < .34 ? 'l1' : r < .67 ? 'l2' : r < 1 ? 'l3' : 'l4';
const tipDate = d => `${+d.slice(5, 7)}/${+d.slice(8)} (${WD[pd(d).getDay()]})`;
const niceMin = m => m <= 60 ? 60 : m <= 120 ? Math.ceil(m / 30) * 30 : Math.ceil(m / 60) * 60;
const pct = r => Math.round(r * 100) + '%';
function rateOf(d) { const hs = habits().filter(h => sched(h, d)); return hs.length ? [hs.filter(h => done(h, d)).length, hs.length] : null; }

/* 일별 달성 개수 (일상/공부 누적, 회색 = 미달성) */
function catBars(D, lab) {
  const t = today(), C = ['life', 'study'];
  const data = D.map(d => {
    const hs = d <= t ? habits().filter(h => sched(h, d)) : [], o = { n: hs.length };
    C.forEach(c => o[c] = hs.filter(h => h.cat === c && done(h, d)).length); return o;
  });
  const mx = Math.max(1, ...data.map(o => o.n));
  const bars = D.map((d, i) => {
    const o = data[i], s = o.life + o.study;
    return `<div data-tip="${tipDate(d)} · ${o.n ? `${s}/${o.n} 달성\n일상 ${o.life} · 공부 ${o.study}` : '-'}"><div class="st" style="height:${o.n / mx * 100}%">${C.filter(c => o[c]).map(c => `<i class="${c}" style="flex:${o[c]} 1 0"></i>`).join('')}${o.n - s ? `<i style="flex:${o.n - s} 1 0;--c:var(--h0)"></i>` : ''}</div></div>`;
  }).join('');
  return `<div class="plot"><div class="gl" style="top:0"><span>${mx}</span></div><div class="gl base" style="top:100%"></div><div class="bars">${bars}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${lab(d, i)}</span>`).join('')}</div>
  <div class="legend"><span><i style="--c:var(--life)"></i>일상</span><span><i style="--c:var(--study)"></i>공부</span><span><i style="--c:var(--h0)"></i>미달성</span></div>`;
}

/* 일별 달성률 영역 그래프 */
function rateLine(D) {
  const t = today(), n = D.length, X = i => (i + .5) / n * 100, Y = r => 6 + (1 - r) * 88;
  const pts = D.map((d, i) => [i, d <= t ? dayRate(d) : null]).filter(p => p[1] != null);
  if (!pts.length) return '<p class="empty">아직 기록이 없습니다.</p>';
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${X(p[0]).toFixed(2)} ${Y(p[1]).toFixed(2)}`).join('');
  const L = pts[pts.length - 1], lx = X(L[0]), ly = Y(L[1]);
  return `<div class="plot">${[1, .5, 0].map(r => `<div class="gl ${r ? '' : 'base'}" style="top:${Y(r)}%"><span>${r * 100}</span></div>`).join('')}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--heat);stop-opacity:.65"/><stop offset="1" style="stop-color:var(--heat);stop-opacity:0"/></linearGradient></defs>
    <path d="${line}L${lx.toFixed(2)} ${Y(0)}L${X(pts[0][0]).toFixed(2)} ${Y(0)}Z" style="fill:url(#ga);stroke:none"/>
    <path d="${line}" style="fill:none;stroke:var(--h4);stroke-width:1.5" vector-effect="non-scaling-stroke"/></svg>
    <i class="pt" style="left:${lx}%;top:${ly}%"></i><span class="pt-l" style="left:${lx}%;top:${ly}%;${lx < 20 ? 'transform:translate(10%,-160%)' : ''}">${pct(L[1])}</span>
    <div class="hits">${D.map(d => { const r = d <= t ? rateOf(d) : null; return `<div data-tip="${tipDate(d)} · ${r ? `${pct(r[0] / r[1])} (${r[0]}/${r[1]})` : '-'}"></div>`; }).join('')}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${i % 7 === 0 ? +d.slice(8) : ''}</span>`).join('')}</div>`;
}

/* 습관별 달성률 순위 */
function habitRank(D) {
  const t = today(), rows = habits().map(h => {
    const sc = D.filter(d => d <= t && sched(h, d)), dn = sc.filter(d => done(h, d)).length;
    return { h, r: sc.length ? dn / sc.length : null, dn, n: sc.length, st: streak(h) };
  }).sort((a, b) => (b.r ?? -1) - (a.r ?? -1));
  if (!rows.length) return '<p class="empty">습관이 없습니다.</p>';
  return `<table class="tb"><thead><tr><th>습관</th><th class="bc wide">달성률</th><th class="num"></th><th class="num">연속</th></tr></thead><tbody>${rows.map(x => `<tr class="${x.h.cat}" data-tip="${esc(x.h.name)} · ${x.dn}/${x.n}일"><td>${esc(x.h.name)}</td><td class="bc wide"><div class="ibar"><i style="width:${(x.r || 0) * 100}%"></i></div></td><td class="num">${x.r == null ? '-' : pct(x.r)}</td><td class="num sub">${x.st}일</td></tr>`).join('')}</tbody></table>`;
}

/* 습관 × 날짜 매트릭스 */
function matrix(D) {
  const t = today(), hs = habits();
  if (!hs.length) return '<p class="empty">습관이 없습니다.</p>';
  const head = D.map((d, i) => `<th>${i % 7 === 0 ? +d.slice(8) : ''}</th>`).join('');
  const rows = hs.map(h => {
    const sc = D.filter(d => d <= t && sched(h, d)), dn = sc.filter(d => done(h, d)).length;
    return `<tr class="${h.cat}"><td class="nm">${esc(h.name)}</td>${D.map(d => {
      if (!sched(h, d)) return '<td><i class="n"></i></td>';
      if (d > t) return '<td><i class="f"></i></td>';
      const v = val(h, d), ok = v >= goal(h);
      const st = h.type === 'check' ? (ok ? '완료' : '미완료') : `${Math.round(v)}/${goal(h)}${h.type === 'time' ? '분' : '회'}`;
      return `<td><i class="${ok ? 'y' : v > 0 ? 'p' : ''}" data-tip="${esc(h.name)} · ${tipDate(d)}\n${st}"></i></td>`;
    }).join('')}<td class="rt">${sc.length ? Math.round(dn / sc.length * 100) + '%' : '-'}</td></tr>`;
  }).join('');
  return `<table class="mx"><thead><tr><th class="nm"></th>${head}<th class="rt">달성</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="legend"><span><i style="--c:var(--life)"></i>일상</span><span><i style="--c:var(--study)"></i>공부</span><span><i style="--c:color-mix(in srgb,var(--life) 45%,var(--h0))"></i>부분 달성</span></div>`;
}

/* 최근 1년 잔디 */
function yearHeat() {
  const t = today(), start = addD(t, -(52 * 7 + pd(t).getDay()));
  let cells = '', mons = '';
  for (let w = 0; w < 53; w++) {
    const old = w < 27 ? 'old' : '', ws = addD(start, w * 7);
    let lab = '';
    for (let k = 0; k < 7; k++) { const d = addD(ws, k); if (d.slice(8) === '01' && d <= t) lab = `${+d.slice(5, 7)}월`; }
    mons += `<span class="${old}">${lab}</span>`;
    for (let k = 0; k < 7; k++) {
      const d = addD(ws, k);
      if (d > t) { cells += `<i class="fu ${old}"></i>`; continue; }
      const r = rateOf(d);
      cells += `<i class="${old} ${r ? lvl(r[0] / r[1]) : ''}" data-tip="${tipDate(d)} · ${r ? `${pct(r[0] / r[1])} (${r[0]}/${r[1]})` : '기록 없음'}"></i>`;
    }
  }
  return `<div class="yhw"><div></div><div class="yhm">${mons}</div><div class="yhd">${['', '월', '', '수', '', '금', ''].map(x => `<span>${x}</span>`).join('')}</div><div class="yh">${cells}</div></div>
  <div class="seq">적음 <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> 많음</div>`;
}

/* 요일 패턴 (최근 8주) */
function weekdayTable() {
  const t = today(), D = [...Array(56)].map((_, i) => addD(t, i - 55)), hs = habits();
  const rate = (dd, cat) => { let n = 0, k = 0; dd.forEach(d => hs.forEach(h => { if ((!cat || h.cat === cat) && sched(h, d)) { n++; if (done(h, d)) k++; } })); return n ? k / n : null; };
  const rows = [1, 2, 3, 4, 5, 6, 0].map(w => { const dd = D.filter(d => pd(d).getDay() === w); return { w, a: rate(dd), l: rate(dd, 'life'), s: rate(dd, 'study') }; });
  const br = Math.max(...rows.map(r => r.a || 0)), f = r => r == null ? '-' : pct(r);
  return `<table class="tb"><thead><tr><th>요일</th><th class="bc wide">전체</th><th class="num"></th><th class="num">일상</th><th class="num">공부</th></tr></thead><tbody>${rows.map(r => `<tr><td${r.a && r.a === br ? ' class="hi"' : ''}>${WD[r.w]}</td><td class="bc wide"><div class="ibar" style="--c:var(--heat)"><i style="width:${(r.a || 0) * 100}%"></i></div></td><td class="num">${f(r.a)}</td><td class="num sub">${f(r.l)}</td><td class="num sub">${f(r.s)}</td></tr>`).join('')}</tbody></table>`;
}

function heat(m) {
  const [y, mo] = m.split('-').map(Number), n = new Date(y, mo, 0).getDate(), off = new Date(y, mo - 1, 1).getDay(), t = today();
  let h = [...WD].map(w => `<div class="wd">${w}</div>`).join('') + '<div></div>'.repeat(off);
  for (let i = 1; i <= n; i++) {
    const d = `${m}-${pad(i)}`;
    const c = d > t ? 'fu' : lvl(dayRate(d));
    h += `<button class="d ${c} ${d === t ? 'td' : ''}" data-act="goto" data-d="${d}">${i}</button>`;
  }
  return `<div class="cal">${h}</div>`;
}

function vToday() {
  const d = cur, dt = pd(d), hs = habits().filter(h => sched(h, d));
  const dn = hs.filter(h => done(h, d)).length, r = hs.length ? dn / hs.length : 0;
  const diff = Math.round((pd(today()) - dt) / 864e5);
  const rel = diff === 0 ? '오늘' : diff === 1 ? '어제' : diff === -1 ? '내일' : diff > 0 ? `${diff}일 전` : `${-diff}일 후`;
  const grp = c => { const l = hs.filter(h => h.cat === c); return l.length ? `<h2>${c === 'life' ? '일상' : '공부'}</h2><div class="card list">${l.map(h => row(h, d)).join('')}</div>` : ''; };
  return `<header class="top"><div><div class="sub">${rel}</div><h1>${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WD[dt.getDay()]}요일</h1>
    <div class="datenav"><button class="btn" data-act="day" data-n="-1">이전</button>${diff ? '<button class="btn" data-act="day" data-n="0">오늘</button>' : ''}<button class="btn" data-act="day" data-n="1">다음</button></div></div>
    <div class="score"><b>${pct(r)}</b><span class="sub">${dn}/${hs.length} 완료</span></div></header>
  <div class="prog"><i style="width:${r * 100}%"></i></div>
  <div class="cols"><section>
    ${hs.length ? grp('life') + grp('study') : '<p class="empty">이 날 예정된 습관이 없습니다.</p>'}
    <h2>한 줄 회고</h2><textarea class="note" id="note" rows="2" placeholder="오늘 하루를 한 줄로">${esc(S.logs[d]?.n?.[0] || '')}</textarea>
  </section><aside>
    <h2>최근 7일</h2><div class="card">${catBars([...Array(7)].map((_, i) => addD(d, i - 6)), x => WD[pd(x).getDay()])}</div>
    <h2>${+d.slice(5, 7)}월 달성</h2><div class="card">${heat(d.slice(0, 7))}</div>
  </aside></div>`;
}

function monthDays(m) {
  const [y, mo] = m.split('-').map(Number);
  return [...Array(new Date(y, mo, 0).getDate())].map((_, i) => `${m}-${pad(i + 1)}`);
}
function vStats() {
  const D = monthDays(ym), t = today(), past = D.filter(d => d <= t), [y, mo] = ym.split('-').map(Number);
  const avgOf = days => { const r = days.map(dayRate).filter(x => x != null); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; };
  const pmD = pd(ym + '-01'); pmD.setMonth(pmD.getMonth() - 1);
  const avg = avgOf(past), pavg = avgOf(monthDays(ds(pmD).slice(0, 7)).filter(d => d <= t));
  const delta = avg != null && pavg != null ? Math.round((avg - pavg) * 100) : null;
  const perfect = past.filter(d => dayRate(d) === 1).length;
  const total = past.reduce((a, d) => a + habits().filter(h => sched(h, d) && done(h, d)).length, 0);
  const best = habits().map(h => [h, streak(h)]).sort((a, b) => b[1] - a[1])[0];
  return `<header class="top"><h1>통계</h1><div class="mnav"><button class="ib" data-act="mon" data-n="-1">${I.l}</button><span>${y}. ${pad(mo)}</span><button class="ib" data-act="mon" data-n="1">${I.r}</button></div></header>
  <div class="tiles" style="margin-top:.6rem">
    <div class="tile"><span class="sub">평균 달성률</span><b>${avg == null ? '-' : pct(avg)}</b><small>${delta == null ? '지난달 기록 없음' : `지난달 대비 ${delta >= 0 ? '+' : ''}${delta}%p`}</small></div>
    <div class="tile"><span class="sub">완벽한 날</span><b>${perfect}일</b><small>${past.length}일 중</small></div>
    <div class="tile"><span class="sub">총 달성</span><b>${total}회</b><small>하루 평균 ${past.length ? (total / past.length).toFixed(1) : 0}회</small></div>
    <div class="tile"><span class="sub">최고 연속</span><b>${best ? best[1] : 0}일</b><small>${best && best[1] ? esc(best[0].name) : '-'}</small></div>
  </div>
  <div class="grid2"><div>
    <h2>일별 달성률</h2><div class="card">${rateLine(D)}</div>
    <h2>일별 달성 개수</h2><div class="card">${catBars(D, (d, i) => i % 7 === 0 ? +d.slice(8) : '')}</div>
  </div><div>
    <h2>습관별 달성률 · ${mo}월</h2><div class="card">${habitRank(past)}</div>
    <h2>요일 패턴 · 최근 8주</h2><div class="card">${weekdayTable()}</div>
  </div></div>
  <h2>습관 매트릭스</h2><div class="card">${matrix(D)}</div>
  <h2>최근 1년</h2><div class="card">${yearHeat()}</div>
  <button class="btn" style="width:100%;margin-top:1.2rem" data-act="report">A4 월간 리포트</button>`;
}

function designCard() {
  const p = P();
  return `<h2>디자인</h2><div class="card">
    <div class="preview"><div class="big">오늘도 꾸준히</div><div>작고 얇은 글씨 · 0123456789</div><div class="sub">글꼴과 색상이 바로 적용됩니다</div></div>
    <div class="fld"><span>색상 테마</span><div class="pre">${THEMES.map((t, i) => `<button data-act="theme" data-i="${i}" class="${p.life === t[1] && p.study === t[2] && p.accent === t[3] ? 'on' : ''}"><span class="tri">${t.slice(1).map(c => `<i style="--c:${c}"></i>`).join('')}</span>${t[0]}</button>`).join('')}</div></div>
    <div class="fld"><span>직접 고르기</span><div class="crow">${[['life', '일상'], ['study', '공부'], ['accent', '강조']].map(([k, l]) => `<label class="cp"><input type="color" data-pref="${k}" value="${p[k]}">${l}</label>`).join('')}</div></div>
    <div class="fld"><span>잔디·달성 색</span>${seg('pref:heat', [['life', '일상'], ['study', '공부'], ['accent', '강조']], p.heat)}</div>
    <div class="fld"><span>글꼴</span><select data-pref="font">${Object.entries(FONTS).map(([k, f]) => `<option value="${k}"${k === p.font ? ' selected' : ''}>${k === 'custom' && customMeta ? '내 폰트 · ' + esc(customMeta.name) : f[0]}</option>`).join('')}</select></div>
    <div class="fld"><span>내 폰트 파일</span><div class="inl"><span class="grow sub">${customMeta ? `${esc(customMeta.name)} · ${(customMeta.size / 1048576).toFixed(1)}MB` : p.font === 'custom' ? '이 기기에 폰트 파일이 없습니다' : 'TTF · OTF · WOFF'}</span><button class="btn" data-act="fontpick">파일 선택</button>${customMeta ? '<button class="btn danger" data-act="fontdel">삭제</button>' : ''}</div>
      <small style="display:block;margin-top:.35rem">파일은 이 기기에만 저장됩니다. 다른 기기에서도 한 번씩 선택하세요.</small><input type="file" id="fontfile" hidden></div>
    <div class="fld"><span>글자 크기 <em id="fsv">${p.size}px</em></span><input type="range" min="11" max="16" step="0.5" data-pref="size" value="${p.size}"></div>
    <div class="fld"><span>굵기</span>${seg('pref:weight', [['200', '가늘게'], ['300', '얇게'], ['400', '보통']], String(p.weight))}</div>
    <div class="fld"><span>화면</span>${seg('pref:mode', [['auto', '자동'], ['light', '라이트'], ['dark', '다크']], p.mode)}</div>
    <button class="btn" data-act="preset-reset">기본값으로</button>
  </div>`;
}
function vSet() {
  const TY = { check: '완료', count: '횟수', time: '시간' };
  return `<header class="top"><h1>설정</h1></header>
  <div class="grid2"><div>
  <h2>습관</h2><div class="card list">${habits().map((h, i, a) => `<div class="srow"><span class="dot" style="--c:var(--${h.cat})"></span><div class="grow"><div>${esc(h.name)}</div><div class="hmeta">${h.cat === 'life' ? '일상' : '공부'} · ${TY[h.type]}${h.type !== 'check' ? ' ' + h.target + (h.type === 'time' ? '분' : '회') : ''}${h.days.length < 7 ? ' · ' + [1, 2, 3, 4, 5, 6, 0].filter(x => h.days.includes(x)).map(x => WD[x]).join('') : ''}</div></div>
    ${i ? `<button class="ib" data-act="hup" data-id="${h.id}" aria-label="위로">${I.up}</button>` : ''}${i < a.length - 1 ? `<button class="ib" data-act="hdn" data-id="${h.id}" aria-label="아래로">${I.down}</button>` : ''}<button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">습관이 없습니다.</p>'}</div>
  <button class="btn add" data-act="hedit">습관 추가</button>
  </div><div>
  ${designCard()}
  <h2>동기화 · GitHub Gist</h2><div class="card">${cfg.token ? `
    <div class="kv"><span>상태</span><span id="syncmsg">${esc(syncMsg || '연결됨')}</span></div>
    <div class="kv"><span>Gist</span><span>${cfg.gist ? cfg.gist.slice(0, 10) + '…' : '-'}</span></div>
    <div class="kv"><span>마지막 동기화</span><span>${cfg.last ? new Date(cfg.last).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
    <div class="btns"><button class="btn pri" data-act="sync">지금 동기화</button><button class="btn danger" data-act="untok">연결 해제</button></div>` : `
    <p class="sub" style="margin:0 0 10px">gist 권한이 있는 GitHub 토큰을 입력하세요. 아이폰과 아이패드에 같은 토큰을 넣으면 자동으로 같은 비공개 Gist를 사용합니다.</p>
    <input type="password" id="tok" placeholder="ghp_… 또는 github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="btns"><button class="btn pri" data-act="tok">연결</button></div>`}</div>
  <h2>백업</h2><div class="card"><p class="sub" style="margin:0">JSON 파일로 저장하거나, 저장한 파일을 현재 데이터에 병합합니다.</p>
    <div class="btns"><button class="btn" data-act="export">내보내기</button><button class="btn" data-act="import">가져오기</button></div>
    <input type="file" id="file" accept="application/json,.json" hidden></div>
  <h2>리포트</h2><div class="card"><div class="btns" style="margin:0"><button class="btn" data-act="report">이번 달 A4 리포트</button></div></div>
  <p class="sub" style="text-align:center;margin-top:28px">습관 트래커 v1</p>
  </div></div>`;
}

/* ========== report (A4) ========== */
function report(m) {
  const D = monthDays(m), t = today(), past = D.filter(d => d <= t), hs = habits();
  const [y, mo] = m.split('-').map(Number);
  const rates = past.map(dayRate).filter(r => r != null);
  const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0;
  const total = past.reduce((a, d) => a + hs.filter(h => sched(h, d) && done(h, d)).length, 0);
  const notes = D.filter(d => S.logs[d]?.n?.[0]);
  const head = D.map((d, i) => { const w = pd(d).getDay(); return `<th class="${w === 0 ? 'sun' : ''}">${i + 1}<br>${WD[w]}</th>`; }).join('');
  const body = hs.map(h => {
    const sc = past.filter(d => sched(h, d)), dn = sc.filter(d => done(h, d)).length;
    return `<tr><td class="nm">${esc(h.name)}</td>${D.map(d => `<td>${!sched(h, d) ? '' : `<span class="c ${d <= t && done(h, d) ? h.cat : 's'}"></span>`}</td>`).join('')}<td class="rt">${sc.length ? Math.round(dn / sc.length * 100) + '%' : '-'}</td></tr>`;
  }).join('');
  const rrow = `<tr><td class="nm">달성률</td>${D.map(d => { const r = d <= t ? dayRate(d) : null; return `<td class="mn">${r == null ? '' : Math.round(r * 100)}</td>`; }).join('')}<td class="rt">${avg}%</td></tr>`;
  const hr = hs.map(h => { const sc = past.filter(d => sched(h, d)), dn = sc.filter(d => done(h, d)).length; return { h, r: sc.length ? dn / sc.length : 0, dn, n: sc.length }; }).sort((a, b) => b.r - a.r);
  return `<div class="page rp">
    <div class="rp-h"><h1>${y}년 ${mo}월 습관 리포트</h1><span>${t} 출력</span></div>
    <div class="rp-t"><div>평균 달성률<b>${avg}%</b></div><div>완벽한 날<b>${rates.filter(r => r === 1).length}일</b></div><div>총 달성<b>${total}회</b></div><div>기록한 날<b>${rates.length}일</b></div></div>
    <h4>습관 달성표</h4>
    <table class="hg"><colgroup><col style="width:26mm">${D.map(() => '<col>').join('')}<col style="width:10mm"></colgroup>
      <thead><tr><th class="nm"></th>${head}<th>달성</th></tr></thead><tbody>${body}${rrow}</tbody></table>
    <h4>습관별 달성률</h4>
    <div class="rp-s">${hr.map(x => `<div class="r"><span>${esc(x.h.name)}</span><i style="width:${x.r * 40}mm;background:var(--u-${x.h.cat})"></i><em>${x.dn}/${x.n}일 · ${Math.round(x.r * 100)}%</em></div>`).join('') || '<div style="color:#999">기록 없음</div>'}</div>
    <h4>한 줄 회고</h4>
    <div class="rp-n">${notes.map(d => `<p><b>${+d.slice(8)}일</b>${esc(S.logs[d].n[0])}</p>`).join('') || '<p style="color:#999">기록 없음</p>'}</div>
  </div>`;
}
function openReport(m) {
  const p = $('#print');
  p.innerHTML = `<div class="pbar-top"><button class="btn" data-act="pclose">닫기</button><button class="btn pri" data-act="pprint">인쇄</button></div>${report(m)}`;
  p.classList.add('show'); fitReport();
}
function fitReport() {
  const pg = $('#print.show .page'); if (!pg) return;
  pg.style.zoom = 1;
  pg.style.zoom = Math.min(1, (innerWidth - 24) / pg.offsetWidth);
}
addEventListener('resize', fitReport);

/* ========== dialogs ========== */
const dlg = $('#dlg');
function openDlg(html) { dlg.innerHTML = html; dlg.showModal(); }
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
const seg = (f, opts, v) => `<div class="seg" data-f="${f}">${opts.map(([k, l]) => `<button type="button" data-act="seg" data-v="${k}" class="${k === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const segVal = f => $(`#dlg [data-f="${f}"] .on`)?.dataset.v;

function habitDlg(h) {
  const n = !h;
  h = h || { name: '', cat: 'life', type: 'check', target: 1, days: [0, 1, 2, 3, 4, 5, 6], link: '' };
  openDlg(`<h3>${n ? '습관 추가' : '습관 편집'}</h3>
    <div class="fld"><span>이름</span><input id="f-name" value="${esc(h.name)}" maxlength="30" placeholder="예: 스트레칭"></div>
    <div class="fld"><span>분류</span>${seg('cat', [['life', '일상'], ['study', '공부']], h.cat)}</div>
    <div class="fld"><span>기록 방식</span>${seg('type', [['check', '완료'], ['count', '횟수'], ['time', '시간']], h.type)}</div>
    <div class="fld" id="f-tg"><span>하루 목표</span><div class="inl"><input id="f-target" type="number" inputmode="numeric" min="1" value="${h.type === 'check' ? '' : h.target}" placeholder="${h.type === 'time' ? 30 : 1}"><span id="f-unit"></span></div></div>
    <div class="fld"><span>요일</span><div class="days">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" data-act="dtog" data-d="${i}" class="${h.days.includes(i) ? 'on' : ''}">${WD[i]}</button>`).join('')}</div></div>
    <div class="dbtns">${n ? '' : `<button class="btn danger" data-act="hdel" data-id="${h.id}">삭제</button>`}<span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="hsave" data-id="${n ? '' : h.id}">저장</button></div>`);
  updForm();
}
function updForm() {
  const ty = segVal('type');
  $('#f-tg').hidden = ty === 'check';
  $('#f-unit').textContent = ty === 'time' ? '분' : '회';
}
/* ========== prefs ========== */
const P = () => ({ ...DEF_P, ...(S.prefs || {}) });
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyPrefs() {
  const p = P(), R = document.documentElement, st = R.style, f = FONTS[p.font] || FONTS.pretendard;
  st.setProperty('--u-life', p.life); st.setProperty('--u-study', p.study); st.setProperty('--u-accent', p.accent);
  st.setProperty('--u-heat', `var(--u-${p.heat})`);
  st.setProperty('--fs', p.size + 'px'); st.setProperty('--fw', p.weight);
  st.setProperty('--ff', f[1] + ',-apple-system,BlinkMacSystemFont,system-ui,sans-serif');
  if (f[2] && !document.getElementById('gf-' + p.font)) {
    const l = document.createElement('link');
    l.id = 'gf-' + p.font; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f[2]}&display=swap`;
    document.head.appendChild(l);
  }
  R.dataset.theme = p.mode === 'dark' || (p.mode === 'auto' && mq.matches) ? 'dark' : 'light';
  $('#tc').content = getComputedStyle(R).getPropertyValue('--bg').trim();
}
mq.addEventListener?.('change', applyPrefs);
function setPref(o, live) {
  S.prefs = { ...P(), ...o, u: now() };
  applyPrefs();
  if (live) ls(KEY, S); else commit();
}

/* ========== 내 폰트 (기기별 IndexedDB 저장) ========== */
let customMeta = null, customFace = null;
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('ht', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fonts');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('fonts', mode), q = fn(tx.objectStore('fonts'));
    tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error);
  });
}
function useFace(buf) {
  const face = new FontFace('HTCustom', buf.slice(0), { weight: '1 1000' });
  return face.load().then(f => { if (customFace) document.fonts.delete(customFace); document.fonts.add(f); customFace = f; });
}
async function loadCustomFont() {
  try {
    const rec = await idbDo('readonly', st => st.get('custom'));
    if (!rec) return;
    await useFace(rec.buf);
    customMeta = { name: rec.name, size: rec.size };
  } catch (e) { customMeta = null; }
  softRender();
}
async function setCustomFont(file) {
  if (file.size > 30 * 1048576) return toast('30MB 이하 파일만 사용할 수 있습니다');
  try {
    const buf = await file.arrayBuffer();
    await useFace(buf);
    const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, '');
    await idbDo('readwrite', st => st.put({ name, size: file.size, buf }, 'custom'));
    customMeta = { name, size: file.size };
    setPref({ font: 'custom' });
    toast('내 폰트를 적용했습니다');
  } catch (e) { toast('폰트 파일을 읽을 수 없습니다'); }
}
async function delCustomFont() {
  try { await idbDo('readwrite', st => st.delete('custom')); } catch (e) {}
  if (customFace) document.fonts.delete(customFace);
  customFace = null; customMeta = null;
  if (P().font === 'custom') setPref({ font: 'pretendard' }); else render();
  toast('내 폰트를 삭제했습니다');
}

/* ========== tooltip ========== */
let tipT;
function showTip(el) {
  const tip = $('#tip');
  tip.textContent = el.dataset.tip; tip.classList.add('on');
  $$('.on-tip').forEach(e => e.classList.remove('on-tip')); el.classList.add('on-tip');
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
  tip.style.transform = `translate(${x}px,${y}px)`;
}
function hideTip() { $('#tip')?.classList.remove('on'); $$('.on-tip').forEach(e => e.classList.remove('on-tip')); }
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch') return;
  const el = e.target.closest?.('[data-tip]'); el ? showTip(el) : hideTip();
});
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const el = e.target.closest?.('[data-tip]');
  clearTimeout(tipT);
  if (el) { showTip(el); tipT = setTimeout(hideTip, 2500); } else hideTip();
});
addEventListener('scroll', hideTip, { passive: true });

/* ========== render ========== */
function render() {
  memo = null;
  applyPrefs(); hideTip();
  if (today() !== lastToday) { if (cur === lastToday) cur = today(); lastToday = today(); }
  $$('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
  $('#main').innerHTML = ({ today: vToday, stats: vStats, set: vSet }[view] || vToday)();
}
function softRender() {
  const a = document.activeElement;
  if (a && a.closest('main') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  if (dlg.open) return;
  render();
}
let toastT;
function toast(m) {
  const t = $('#toast'); t.textContent = m; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2000);
}

/* ========== events ========== */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  const h = id && S.habits.find(x => x.id === id);
  switch (a) {
    case 'tog': setVal(h, cur, done(h, cur) ? 0 : 1); break;
    case 'inc': {
      const st = h.type === 'time' ? (h.target >= 30 ? 10 : 5) : 1;
      setVal(h, cur, val(h, cur) + st * +b.dataset.n); break;
    }
    case 'day': cur = +b.dataset.n ? addD(cur, +b.dataset.n) : today(); render(); break;
    case 'goto': cur = b.dataset.d; if (view === 'today') render(); else location.hash = 'today'; break;
    case 'mon': { const d = pd(ym + '-01'); d.setMonth(d.getMonth() + +b.dataset.n); ym = ds(d).slice(0, 7); render(); break; }
    case 'seg': {
      const p = b.parentElement;
      if (p.dataset.f.startsWith('pref:')) { const k = p.dataset.f.slice(5); setPref({ [k]: k === 'weight' ? +b.dataset.v : b.dataset.v }); break; }
      $$('button', p).forEach(x => x.classList.toggle('on', x === b));
      if (p.dataset.f === 'type') updForm();
      break;
    }
    case 'hedit': habitDlg(h); break;
    case 'dtog': b.classList.toggle('on'); break;
    case 'dclose': dlg.close(); break;
    case 'hsave': {
      const name = $('#f-name').value.trim(), type = segVal('type');
      const days = $$('#dlg .days .on').map(x => +x.dataset.d);
      const target = type === 'check' ? 1 : Math.max(1, Math.round(+$('#f-target').value || (type === 'time' ? 30 : 1)));
      if (!name) return toast('이름을 입력하세요');
      if (!days.length) return toast('요일을 하나 이상 고르세요');
      const o = { name, cat: segVal('cat'), type, target, days, link: '', u: now() };
      if (h) Object.assign(h, o);
      else S.habits.push({ id: uid(), c: today(), o: Math.max(0, ...S.habits.map(x => x.o)) + 1, ...o });
      dlg.close(); commit(); break;
    }
    case 'hdel': if (confirm(`'${h.name}' 습관을 삭제할까요?`)) { h.del = true; h.u = now(); dlg.close(); commit(); } break;
    case 'hup': case 'hdn': {
      const l = habits(), i = l.indexOf(h), j = a === 'hup' ? i - 1 : i + 1;
      if (l[j]) { [h.o, l[j].o] = [l[j].o, h.o]; h.u = l[j].u = now(); commit(); }
      break;
    }
    case 'tok': {
      const v = $('#tok').value.trim(); if (!v) return toast('토큰을 입력하세요');
      cfg = { token: v }; ls(CFG, cfg); render(); sync(); break;
    }
    case 'untok': if (confirm('동기화를 해제할까요? 이 기기의 데이터는 유지됩니다.')) { cfg = {}; syncMsg = ''; ls(CFG, cfg); render(); } break;
    case 'sync': sync(); break;
    case 'fontpick': $('#fontfile').click(); break;
    case 'fontdel': if (confirm('내 폰트 파일을 삭제할까요?')) delCustomFont(); break;
    case 'theme': { const th = THEMES[+b.dataset.i]; setPref({ life: th[1], study: th[2], accent: th[3] }); break; }
    case 'preset-reset': if (confirm('디자인 설정을 기본값으로 되돌릴까요?')) { S.prefs = { ...DEF_P, u: now() }; commit(); } break;
    case 'export': exportData(); break;
    case 'import': $('#file').click(); break;
    case 'report': openReport(view === 'stats' ? ym : today().slice(0, 7)); break;
    case 'pclose': $('#print').classList.remove('show'); break;
    case 'pprint': window.print(); break;
  }
});
const prefVal = t => t.dataset.pref === 'size' ? +t.value : t.value;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.pref) { setPref({ [t.dataset.pref]: prefVal(t) }, true); if (t.dataset.pref === 'size') $('#fsv').textContent = t.value + 'px'; return; }
  if (e.target.id === 'note') {
    const L = S.logs[cur] || (S.logs[cur] = { v: {}, n: ['', 0] });
    L.n = [e.target.value, now()]; commit(true);
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.pref) { setPref({ [t.dataset.pref]: prefVal(t) }); return; }
  if (t.id === 'fontfile' && t.files[0]) { setCustomFont(t.files[0]); t.value = ''; return; }
  if (t.id === 'file' && t.files[0]) {
    t.files[0].text().then(txt => {
      const d = JSON.parse(txt);
      if (!Array.isArray(d.habits) || !d.logs) throw 0;
      if (!confirm('가져온 데이터를 현재 데이터와 병합할까요?')) return;
      S = merge(S, d); commit(); toast('가져오기 완료');
    }).catch(() => toast('올바른 백업 파일이 아닙니다'));
    t.value = '';
  }
});
async function exportData() {
  const name = `habit-tracker-${today().replace(/-/g, '')}.json`;
  const blob = new Blob([JSON.stringify(merge(S, {}), null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
addEventListener('hashchange', () => { view = location.hash.slice(1) || 'today'; render(); scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { softRender(); sync(); }
  else if (syncT) sync();
});
addEventListener('online', () => sync());

render();
loadCustomFont();
sync();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
