'use strict';
/* ========== util ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'ht.data', CFG = 'ht.cfg', TMR = 'ht.timer';
const FILE = 'habit-tracker.json', DESC = 'habit-tracker-sync';
const WD = '일월화수목금토';
const WDO = [0, 1, 2, 3, 4, 5, 6]; // 주 시작: 일요일
const PAL = ['#B5C7DE', '#D4C5E2', '#B8D4C2', '#EBCFB8', '#E6C3C8', '#C3D8D6', '#E2DCB5', '#C9C4BD'];
const THEMES = [
  ['블루그레이', '#8FA0AE', '#5F6F80', '#BAC2C9'], ['슬레이트 세이지', '#97A596', '#8E9AAB', '#C3C8BE'],
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
const DEF_P = { font: 'pretendard', size: 13, weight: 300, mode: 'auto', life: '#8FA0AE', study: '#5F6F80', accent: '#BAC2C9', heat: 'life' };
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
const hhmm = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;
const hh2 = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const toMin = x => { const [H, M] = x.split(':').map(Number); return H * 60 + M; };
const dayDiff = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const md = d => `${+d.slice(5, 7)}.${+d.slice(8)}`;
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
      H('기상', 'life', 'check', 1, 1), H('운동', 'life', 'check', 1, 2, { freq: 'week', per: 3 }),
      H('물 마시기', 'life', 'count', 56, 3, { freq: 'week' }), H('독서', 'life', 'time', 20, 4),
      H('공부', 'study', 'time', 120, 5), H('복습', 'study', 'check', 1, 6),
    ],
    subjects: [],
    sessions: [], logs: {}, u,
  };
}
let S = ls(KEY) || seed();
// 이전 기본 샌드색 → 슬레이트로 이전
if (S.prefs?.study === '#B5A88C') { S.prefs.study = '#5F6F80'; S.prefs.u = Date.now(); }
// 횟수 습관은 주간 합계만 사용: 하루 목표였던 습관은 '하루 목표 × 요일 수'로 이전
(S.habits || []).forEach(h => { if (h.type === 'count' && h.freq !== 'week') { h.target = h.target * (h.days?.length || 7); h.freq = 'week'; h.days = [0, 1, 2, 3, 4, 5, 6]; h.u = Date.now(); } });
let cfg = ls(CFG) || {};
let memo = null;

const habits = () => S.habits.filter(h => !h.del).sort((a, b) => a.o - b.o);
const subjects = () => S.subjects.filter(s => !s.del).sort((a, b) => a.o - b.o);
const subj = id => S.subjects.find(s => s.id === id);
function val(h, d) {
  return S.logs[d]?.v?.[h.id]?.[0] || 0;
}
const goal = h => h.type === 'check' ? 1 : h.target;
// 시각(clock) 습관: 값 = 분+1 (0은 미기록), 목표 시각 이전이면 달성
// 주간 합계형: 주 n회 + 횟수/시간 습관은 하루 목표 없이 주간 합계(h.target)로 판정
const wkAmt = h => h.freq === 'week' && (h.type === 'count' || h.type === 'time');
const unitOf = h => h.type === 'time' ? '분' : '회';
const fmtAmt = (h, v) => h.type === 'time' ? (v >= 60 ? fmtMin(v) : `${Math.round(v)}분`) : `${Math.round(v)}회`;
const wkText = h => wkAmt(h) ? `주 ${fmtAmt(h, h.target)}` : `주 ${h.per}회`;
const done = (h, d) => { const v = val(h, d); return h.type === 'clock' ? v > 0 && v - 1 <= h.target : wkAmt(h) ? v > 0 : v >= goal(h); };
function fmtVal(h, d) {
  const v = val(h, d);
  if (h.type === 'check') return done(h, d) ? '완료' : '미완료';
  if (h.type === 'clock') return v > 1 ? hhmm(v - 1) : v === 1 ? '완료' : '미기록';
  if (wkAmt(h)) return `${Math.round(v)}${unitOf(h)}`;
  return `${Math.round(v)}/${h.target}${unitOf(h)}`;
}
const isRest = d => S.rest?.[d]?.[0] === 1;
function setRest(d, on) { S.rest = S.rest || {}; S.rest[d] = [on ? 1 : 0, now()]; commit(); }
const ddays = () => (S.dday || []).filter(x => !x.del).sort((a, b) => a.date < b.date ? -1 : 1);
const nextDday = () => ddays().find(x => x.date >= today());
const ddLabel = date => { const n = dayDiff(today(), date); return n === 0 ? 'D-DAY' : `D-${n}`; };
const weekly = h => h.freq === 'week';
// 보관 기간(off: [[시작, 끝|null]])을 제외한 활성 여부
const alive = (h, d) => d >= h.c && !(h.off || []).some(([a, b]) => d >= a && (!b || d < b));
const archived = h => (h.off || []).some(r => !r[1]);
// 일일 달성률 대상 (주 n회 습관 제외)
const sched = (h, d) => !weekly(h) && alive(h, d) && h.days.includes(pd(d).getDay()) && !isRest(d);
// 오늘 목록 표시 대상
const shown = (h, d) => alive(h, d) && (weekly(h) || h.days.includes(pd(d).getDay()));
// 달성 횟수 집계 대상 (주 n회 습관은 한 날도 포함)
const counts = (h, d) => sched(h, d) || (weekly(h) && alive(h, d));
const wkStart = d => addD(d, -pd(d).getDay());
// 주간 진행: 합계형은 값의 합, 그 외는 달성한 날 수
function wkDone(h, d) { const s = wkStart(d); let n = 0; for (let i = 0; i < 7; i++) { const x = addD(s, i); if (alive(h, x)) n += wkAmt(h) ? val(h, x) : done(h, x) ? 1 : 0; } return n; }
const wkGoal = h => wkAmt(h) ? h.target : (h.per || 1);
const wkMet = (h, d) => wkDone(h, d) >= wkGoal(h);
const wkProg = (h, d) => wkAmt(h) ? `${fmtAmt(h, wkDone(h, d))} / ${fmtAmt(h, h.target)}` : `${wkDone(h, d)}/${h.per}`;
const inRange = (h, D) => D.some(d => alive(h, d));
const sunit = h => weekly(h) ? '주' : '일';
// 기간 D의 [달성, 대상, 단위]: 일일 습관은 날짜, 주 n회 습관은 주 단위 (진행 중인 주는 달성했을 때만 포함)
function hStat(h, D) {
  const t = today();
  if (!weekly(h)) { const sc = D.filter(d => d <= t && sched(h, d)); return [sc.filter(d => done(h, d)).length, sc.length, '일']; }
  let k = 0, n = 0;
  [...new Set(D.filter(d => d <= t && alive(h, d)).map(wkStart))].forEach(w => { const m = wkMet(h, w); if (m) k++; if (m || addD(w, 6) < t) n++; });
  return [k, n, '주'];
}
function dayRate(d) {
  const hs = habits().filter(h => sched(h, d));
  return hs.length ? hs.filter(h => done(h, d)).length / hs.length : null;
}
function streak(h) {
  if (weekly(h)) {
    let w = wkStart(today()), n = 0;
    if (!wkMet(h, w)) w = addD(w, -7);
    for (let i = 0; i < 300 && addD(w, 6) >= h.c; i++, w = addD(w, -7)) { if (wkMet(h, w)) n++; else break; }
    return n;
  }
  let d = today(), n = 0;
  if (sched(h, d) && !done(h, d)) d = addD(d, -1);
  for (let i = 0; i < 1000 && d >= h.c; i++, d = addD(d, -1)) {
    if (!sched(h, d)) continue;
    if (done(h, d)) n++; else break;
  }
  return n;
}
function longest(h) {
  const t = today(); let best = 0, run = 0;
  if (weekly(h)) {
    for (let w = wkStart(h.c); w <= t; w = addD(w, 7)) { if (wkMet(h, w)) best = Math.max(best, ++run); else if (addD(w, 6) < t) run = 0; }
    return best;
  }
  for (let d = h.c; d <= t; d = addD(d, 1)) { if (!sched(h, d)) continue; if (done(h, d)) best = Math.max(best, ++run); else if (d < t) run = 0; }
  return best;
}
function setVal(h, d, v) {
  const L = S.logs[d] || (S.logs[d] = { v: {}, n: ['', 0] });
  L.v[h.id] = [Math.max(0, v), now()];
  commit();
}
let undoFn = null;
function offerUndo(msg, fn) { undoFn = fn; toast(msg, true); }
function setValU(h, d, v) {
  const prev = S.logs[d]?.v?.[h.id]?.[0] || 0;
  setVal(h, d, v);
  offerUndo(`${h.name} · ${fmtVal(h, d)}`, () => setVal(h, d, prev));
}
function habitU(h, msg, mut) {
  const i = S.habits.indexOf(h), prev = JSON.stringify(h);
  mut();
  offerUndo(msg, () => { S.habits[i] = { ...JSON.parse(prev), u: now() }; commit(); });
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
  const rest = { ...(a.rest || {}) };
  for (const k in b.rest || {}) if (!rest[k] || b.rest[k][1] > rest[k][1]) rest[k] = b.rest[k];
  return {
    habits: mergeArr(a.habits, b.habits), subjects: mergeArr(a.subjects, b.subjects), dday: mergeArr(a.dday, b.dday), rest,
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
let view = 'today', hid = null;
function parseHash() { const x = location.hash.slice(1) || 'today'; if (x.startsWith('h=')) { view = 'habit'; hid = x.slice(2); } else view = x; }
parseHash();
let cur = today(), lastToday = today();
let ym = today().slice(0, 7);
let wkCur = wkStart(today());

function row(h, d) {
  const v = val(h, d), t = goal(h), ok = done(h, d), st = streak(h);
  const unit = h.type === 'time' ? '분' : h.type === 'count' ? '회' : '';
  const meta = [];
  if (h.type === 'clock') meta.push(`목표 ${hhmm(h.target)} 이전`);
  else if (h.type !== 'check' && !wkAmt(h)) meta.push(`목표 ${t}${unit}`);
  if (weekly(h)) meta.push(`이번 주 ${wkProg(h, d)}${wkMet(h, d) ? ' 달성' : ''}`);
  else if (h.days.length < 7) meta.push(WDO.filter(i => h.days.includes(i)).map(i => WD[i]).join(''));
  if (st) meta.push(`${st}${sunit(h)} 연속`);
  const w7 = [...Array(7)].map((_, i) => addD(d, i - 6)).map(x => `<i class="${weekly(h) ? (!alive(h, x) ? 'n' : done(h, x) ? 'y' : val(h, x) > 0 ? 'p' : '') : !sched(h, x) ? 'n' : done(h, x) ? 'y' : val(h, x) > 0 ? 'p' : ''}"></i>`).join('');
  let ctl;
  if (h.type === 'check') ctl = `<button class="chk ${ok ? 'on' : ''}" data-act="tog" data-id="${h.id}" aria-label="완료">${I.check}</button>`;
  else if (h.type === 'clock') ctl = `<div class="step">${v > 1 ? '' : `<button class="btn sm" data-act="clnow" data-id="${h.id}">지금</button>`}<input type="time" class="tin" data-clock="${h.id}" value="${v > 1 ? hh2(v - 1) : ''}" aria-label="시각"></div>`;
  else ctl = `<div class="step"><button class="ib" data-act="inc" data-id="${h.id}" data-n="-1">${I.minus}</button><button class="val" data-act="vedit" data-id="${h.id}" data-d="${d}">${v}<small>${wkAmt(h) ? unit : `/${t}${unit}`}</small></button><button class="ib" data-act="inc" data-id="${h.id}" data-n="1">${I.plus}</button></div>`;
  return `<div class="hrow ${h.cat} ${ok ? 'ok' : ''}"><div class="hinfo" data-act="hopen" data-id="${h.id}"><div class="hname">${esc(h.name)}</div><div class="hmeta"><span class="wd7">${w7}</span><span>${meta.join(' · ') || '매일'}</span></div></div>${ctl}${h.type === 'count' || h.type === 'time' ? `<i class="pbar" style="width:${Math.min(1, wkAmt(h) ? wkDone(h, d) / h.target : v / t) * 100}%"></i>` : ''}</div>`;
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
    const hs = d <= t ? habits().filter(h => sched(h, d) || (weekly(h) && alive(h, d) && done(h, d))) : [], o = { n: hs.length };
    C.forEach(c => o[c] = hs.filter(h => h.cat === c && done(h, d)).length); return o;
  });
  const mx = Math.max(1, ...data.map(o => o.n));
  const bars = D.map((d, i) => {
    const o = data[i], s = o.life + o.study;
    return `<div data-tip="${tipDate(d)} · ${isRest(d) ? '휴식일' : o.n ? `${s}/${o.n} 달성\n일상 ${o.life} · 공부 ${o.study}` : '-'}"><div class="st" style="height:${o.n / mx * 100}%">${C.filter(c => o[c]).map(c => `<i class="${c}" style="flex:${o[c]} 1 0"></i>`).join('')}${o.n - s ? `<i style="flex:${o.n - s} 1 0;--c:var(--h0)"></i>` : ''}</div></div>`;
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
  const rows = habits().filter(h => inRange(h, D)).map(h => {
    const [dn, n, u] = hStat(h, D);
    return { h, r: n ? dn / n : null, dn, n, u, st: streak(h) };
  }).sort((a, b) => (b.r ?? -1) - (a.r ?? -1));
  if (!rows.length) return '<p class="empty">습관이 없습니다.</p>';
  return `<table class="tb"><thead><tr><th>습관</th><th class="bc wide">달성률</th><th class="num"></th><th class="num">연속</th></tr></thead><tbody>${rows.map(x => `<tr class="${x.h.cat}" data-act="hopen" data-id="${x.h.id}" data-tip="${esc(x.h.name)} · ${x.dn}/${x.n}${x.u}${weekly(x.h) ? ` (${wkText(x.h)} 목표)` : ''}"><td>${esc(x.h.name)}${archived(x.h) ? ' <small>보관</small>' : ''}</td><td class="bc wide"><div class="ibar"><i style="width:${(x.r || 0) * 100}%"></i></div></td><td class="num">${x.r == null ? '-' : pct(x.r)}</td><td class="num sub">${x.st}${x.u}</td></tr>`).join('')}</tbody></table>`;
}

/* 습관 × 날짜 매트릭스 */
function matrix(D) {
  const t = today(), hs = habits().filter(h => inRange(h, D));
  if (!hs.length) return '<p class="empty">습관이 없습니다.</p>';
  const head = D.map((d, i) => `<th>${i % 7 === 0 ? +d.slice(8) : ''}</th>`).join('');
  const rows = hs.map(h => {
    const [dn, n] = hStat(h, D);
    return `<tr class="${h.cat}"><td class="nm" data-act="hopen" data-id="${h.id}">${esc(h.name)}${weekly(h) ? ` <small>${wkText(h)}</small>` : ''}</td>${D.map(d => {
      if (!weekly(h) && isRest(d) && alive(h, d) && h.days.includes(pd(d).getDay())) return `<td><i class="rs" data-tip="${tipDate(d)} · 휴식일"></i></td>`;
      if (weekly(h) ? !alive(h, d) : !sched(h, d)) return '<td><i class="n"></i></td>';
      if (d > t) return '<td><i class="f"></i></td>';
      const v = val(h, d), ok = done(h, d);
      return `<td><i class="${ok ? 'y' : v > 0 ? 'p' : ''}" data-tip="${esc(h.name)} · ${tipDate(d)}\n${fmtVal(h, d)}"></i></td>`;
    }).join('')}<td class="rt">${n ? Math.round(dn / n * 100) + '%' : '-'}</td></tr>`;
  }).join('');
  return `<table class="mx"><thead><tr><th class="nm"></th>${head}<th class="rt">달성</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="legend"><span><i style="--c:var(--life)"></i>일상</span><span><i style="--c:var(--study)"></i>공부</span><span><i style="--c:color-mix(in srgb,var(--life) 45%,var(--h0))"></i>부분 달성</span></div>`;
}

/* 최근 1년 잔디: fn(d) → [class, tip] */
function dayCell(d) {
  if (isRest(d)) return ['rs', `${tipDate(d)} · 휴식일`];
  const r = rateOf(d);
  return [r ? lvl(r[0] / r[1]) : '', `${tipDate(d)} · ${r ? `${pct(r[0] / r[1])} (${r[0]}/${r[1]})` : '기록 없음'}`];
}
function yearHeat(fn = dayCell, legend = true) {
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
      const [c, tip] = fn(d);
      cells += `<i class="${old} ${c}" data-tip="${esc(tip)}"></i>`;
    }
  }
  return `<div class="yhw"><div></div><div class="yhm">${mons}</div><div class="yhd">${['', '월', '', '수', '', '금', ''].map(x => `<span>${x}</span>`).join('')}</div><div class="yh">${cells}</div></div>
  ${legend ? '<div class="seq">적음 <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> 많음 <i class="rs" style="margin-left:.6rem"></i> 휴식</div>' : '<div class="seq"><i class="l4"></i> 달성 <i class="l2" style="margin-left:.5rem"></i> 부분 <i class="rs" style="margin-left:.5rem"></i> 휴식</div>'}`;
}

/* 요일 패턴 (최근 8주) */
function weekdayTable() {
  const t = today(), D = [...Array(56)].map((_, i) => addD(t, i - 55)), hs = habits();
  const rate = (dd, cat) => { let n = 0, k = 0; dd.forEach(d => hs.forEach(h => { if ((!cat || h.cat === cat) && sched(h, d)) { n++; if (done(h, d)) k++; } })); return n ? k / n : null; };
  const rows = WDO.map(w => { const dd = D.filter(d => pd(d).getDay() === w); return { w, a: rate(dd), l: rate(dd, 'life'), s: rate(dd, 'study') }; });
  const br = Math.max(...rows.map(r => r.a || 0)), f = r => r == null ? '-' : pct(r);
  return `<table class="tb"><thead><tr><th>요일</th><th class="bc wide">전체</th><th class="num"></th><th class="num">일상</th><th class="num">공부</th></tr></thead><tbody>${rows.map(r => `<tr><td${r.a && r.a === br ? ' class="hi"' : ''}>${WD[r.w]}</td><td class="bc wide"><div class="ibar" style="--c:var(--heat)"><i style="width:${(r.a || 0) * 100}%"></i></div></td><td class="num">${f(r.a)}</td><td class="num sub">${f(r.l)}</td><td class="num sub">${f(r.s)}</td></tr>`).join('')}</tbody></table>`;
}

function heat(m) {
  const [y, mo] = m.split('-').map(Number), n = new Date(y, mo, 0).getDate(), off = new Date(y, mo - 1, 1).getDay(), t = today();
  let h = [...WD].map(w => `<div class="wd">${w}</div>`).join('') + '<div></div>'.repeat(off);
  for (let i = 1; i <= n; i++) {
    const d = `${m}-${pad(i)}`;
    const c = d > t ? 'fu' : isRest(d) ? 'rs' : lvl(dayRate(d));
    h += `<button class="d ${c} ${d === t ? 'td' : ''}" data-act="goto" data-d="${d}">${i}</button>`;
  }
  return `<div class="cal">${h}</div>`;
}

function vToday() {
  const d = cur, dt = pd(d), hs = habits().filter(h => shown(h, d)), dl = hs.filter(h => !weekly(h));
  const dn = dl.filter(h => done(h, d)).length, r = dl.length ? dn / dl.length : 0;
  const diff = Math.round((pd(today()) - dt) / 864e5);
  const rel = diff === 0 ? '오늘' : diff === 1 ? '어제' : diff === -1 ? '내일' : diff > 0 ? `${diff}일 전` : `${-diff}일 후`;
  const grp = c => { const l = hs.filter(h => h.cat === c); return l.length ? `<h2>${c === 'life' ? '일상' : '공부'}</h2><div class="card list">${l.map(h => row(h, d)).join('')}</div>` : ''; };
  const dd = nextDday(), rest = isRest(d);
  return `${dd ? `<div class="ddbar"><span>${esc(dd.name)}</span><b>${ddLabel(dd.date)}</b><span class="sub">${md(dd.date)}</span></div>` : ''}
  <header class="top"><div><div class="sub">${rel}</div><h1>${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WD[dt.getDay()]}요일</h1>
    <div class="datenav"><button class="btn" data-act="day" data-n="-1">이전</button>${diff ? '<button class="btn" data-act="day" data-n="0">오늘</button>' : ''}<button class="btn" data-act="day" data-n="1">다음</button><button class="btn ${rest ? 'on' : ''}" data-act="rest" data-d="${d}">휴식일</button></div></div>
    ${rest ? '<div class="score"><b>휴식</b><span class="sub">통계에서 제외</span></div>' : `<div class="score"><b>${pct(r)}</b><span class="sub">${dn}/${dl.length} 완료</span></div>`}</header>
  <div class="prog"><i style="width:${r * 100}%"></i></div>
  <div class="cols"><section>
    ${hs.length ? grp('life') + grp('study') : '<p class="empty">이 날 예정된 습관이 없습니다.</p>'}
  </section><aside>
    <h2>최근 7일</h2><div class="card">${catBars([...Array(7)].map((_, i) => addD(d, i - 6)), x => WD[pd(x).getDay()])}</div>
    <h2>${+d.slice(5, 7)}월 달성</h2><div class="card">${heat(d.slice(0, 7))}</div>
  </aside></div>`;
}

function vWeek() {
  const t = today(), D = [...Array(7)].map((_, i) => addD(wkCur, i)), hs = habits().filter(h => inRange(h, D));
  const rows = ['life', 'study'].flatMap(c => hs.filter(h => h.cat === c));
  const head = D.map(d => `<th class="${d === t ? 'td' : ''} ${isRest(d) ? 'rsd' : ''}"><button data-act="wday" data-d="${d}">${WD[pd(d).getDay()]}<b>${+d.slice(8)}</b></button></th>`).join('');
  const cell = (h, d) => {
    if (!alive(h, d) || (!weekly(h) && !h.days.includes(pd(d).getDay()))) return '<td><span class="wc n"></span></td>';
    const ok = done(h, d), v = val(h, d);
    const txt = h.type === 'check' ? (ok ? I.check : '') : h.type === 'clock' ? (v > 1 ? hhmm(v - 1) : v === 1 ? I.check : '') : (v ? (h.type === 'time' ? short(v) : Math.round(v)) : '');
    return `<td><button class="wc ${ok ? 'y' : v > 0 ? 'p' : ''} ${isRest(d) ? 'rs' : ''}" data-act="wcell" data-id="${h.id}" data-d="${d}"${d > t ? ' disabled' : ''}>${txt}</button></td>`;
  };
  const sum = h => {
    if (weekly(h)) return wkAmt(h) ? (f => `${f(wkDone(h, wkCur))}<small>/${f(h.target)}</small>`)(h.type === 'time' ? short : Math.round) : `${wkDone(h, wkCur)}/${h.per}`;
    const sc = D.filter(d => d <= t && sched(h, d)); return sc.length ? `${sc.filter(d => done(h, d)).length}/${sc.length}` : '-';
  };
  const foot = D.map(d => { const r = d <= t ? dayRate(d) : null; return `<td>${isRest(d) ? '휴식' : r == null ? '' : pct(r)}</td>`; }).join('');
  return `<header class="top"><h1>주간</h1><div class="mnav">${wkCur !== wkStart(t) ? '<button class="btn sm" data-act="wk" data-n="0">이번 주</button>' : ''}<button class="ib" data-act="wk" data-n="-1">${I.l}</button><span>${md(D[0])} – ${md(D[6])}</span><button class="ib" data-act="wk" data-n="1">${I.r}</button></div></header>
  <div class="card list" style="margin-top:.6rem">${rows.length ? `<table class="wt"><thead><tr><th class="nm"></th>${head}<th class="sm"></th></tr></thead>
    <tbody>${rows.map(h => `<tr class="${h.cat}"><td class="nm" data-act="hopen" data-id="${h.id}">${esc(h.name)}${weekly(h) ? `<small>${wkText(h)}</small>` : ''}</td>${D.map(d => cell(h, d)).join('')}<td class="sm">${sum(h)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td class="nm">달성률</td>${foot}<td class="sm"></td></tr></tfoot></table>` : '<p class="empty">이 주에 해당하는 습관이 없습니다.</p>'}</div>
  <p class="sub" style="margin:.8rem 2px 0">칸을 눌러 기록 · 날짜를 눌러 휴식일 지정 · 이름을 눌러 상세 보기</p>`;
}

/* ---------- 습관 상세 ---------- */
function monthBars(h) {
  const t = today(), ms = [...Array(12)].map((_, i) => { const x = pd(t.slice(0, 7) + '-01'); x.setMonth(x.getMonth() - 11 + i); return ds(x).slice(0, 7); });
  const bars = ms.map(m => {
    const D = monthDays(m), st = inRange(h, D) ? hStat(h, D) : null, r = st && st[1] ? st[0] / st[1] : null;
    return `<div data-tip="${m.replace('-', '.')} · ${r == null ? '기록 없음' : `${pct(r)} (${st[0]}/${st[1]}${st[2]})`}"><div class="st" style="height:${(r || 0) * 100}%"><i style="flex:1 1 0"></i></div></div>`;
  }).join('');
  return `<div class="plot ${h.cat}"><div class="gl" style="top:0"><span>100</span></div><div class="gl" style="top:50%"><span>50</span></div><div class="gl base" style="top:100%"></div><div class="bars">${bars}</div></div>
  <div class="xax">${ms.map(m => `<span>${+m.slice(5)}</span>`).join('')}</div>`;
}
function hWeekday(h) {
  const t = today(), all = []; for (let d = h.c; d <= t; d = addD(d, 1)) all.push(d);
  if (weekly(h)) {
    const c = WDO.map(w => all.filter(d => pd(d).getDay() === w && alive(h, d) && done(h, d)).length), mx = Math.max(1, ...c);
    return `<table class="tb"><thead><tr><th>요일</th><th class="bc wide">실행 횟수</th><th class="num"></th></tr></thead><tbody>${WDO.map((w, i) => `<tr class="${h.cat}"><td>${WD[w]}</td><td class="bc wide"><div class="ibar"><i style="width:${c[i] / mx * 100}%"></i></div></td><td class="num">${c[i]}회</td></tr>`).join('')}</tbody></table>`;
  }
  const rs = WDO.map(w => { const sc = all.filter(d => pd(d).getDay() === w && sched(h, d)); return sc.length ? [sc.filter(d => done(h, d)).length, sc.length] : null; });
  return `<table class="tb"><thead><tr><th>요일</th><th class="bc wide">달성률</th><th class="num"></th></tr></thead><tbody>${WDO.map((w, i) => `<tr class="${h.cat}"><td>${WD[w]}</td><td class="bc wide"><div class="ibar"><i style="width:${rs[i] ? rs[i][0] / rs[i][1] * 100 : 0}%"></i></div></td><td class="num">${rs[i] ? `${pct(rs[i][0] / rs[i][1])} <small>${rs[i][0]}/${rs[i][1]}</small>` : '-'}</td></tr>`).join('')}</tbody></table>`;
}
function clockChart(h) {
  const t = today(), D = [...Array(30)].map((_, i) => addD(t, i - 29));
  const pts = D.map((d, i) => [i, val(h, d) > 1 ? val(h, d) - 1 : null, d]).filter(p => p[1] != null);
  if (!pts.length) return '<p class="empty">최근 30일 시각 기록이 없습니다.</p>';
  const vs = pts.map(p => p[1]).concat(h.target), lo = Math.floor((Math.min(...vs) - 10) / 30) * 30, hi = Math.ceil((Math.max(...vs) + 10) / 30) * 30;
  const X = i => (i + .5) / 30 * 100, Y = m => 6 + (m - lo) / (hi - lo) * 88;
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${X(p[0]).toFixed(2)} ${Y(p[1]).toFixed(2)}`).join('');
  const avg = Math.round(pts.reduce((a, p) => a + p[1], 0) / pts.length), ok = pts.filter(p => p[1] <= h.target).length;
  return `<div class="sub">평균 <span style="color:var(--text)">${hhmm(avg)}</span> · 목표 이전 ${ok}/${pts.length}일</div>
  <div class="plot"><div class="gl" style="top:${Y(lo)}%"><span>${hhmm(lo)}</span></div><div class="gl goal" style="top:${Y(h.target)}%"><span>목표 ${hhmm(h.target)}</span></div><div class="gl base" style="top:${Y(hi)}%"><span>${hhmm(hi)}</span></div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${line}" style="fill:none;stroke:var(--h3);stroke-width:1.2" vector-effect="non-scaling-stroke"/></svg>
    ${pts.map(p => `<i class="pt s ${p[1] > h.target ? 'late' : ''}" style="left:${X(p[0])}%;top:${Y(p[1])}%"></i>`).join('')}
    <div class="hits">${D.map(d => `<div data-tip="${tipDate(d)} · ${fmtVal(h, d)}"></div>`).join('')}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${i % 7 === 1 ? md(d) : ''}</span>`).join('')}</div>`;
}
function weekBars(h) {
  const t = today(), W = [...Array(12)].map((_, i) => addD(wkStart(t), 7 * (i - 11))), vs = W.map(w => wkDone(h, w)), mx = Math.max(h.target * 1.2, ...vs);
  return `<div class="plot ${h.cat}"><div class="gl goal" style="top:${(1 - h.target / mx) * 100}%"><span>목표 ${fmtAmt(h, h.target)}</span></div><div class="gl base" style="top:100%"></div>
    <div class="bars">${W.map((w, i) => `<div data-tip="${md(w)} – ${md(addD(w, 6))} · ${fmtAmt(h, vs[i])}"><div class="st" style="height:${vs[i] / mx * 100}%"><i class="${vs[i] >= h.target ? '' : 'p'}" style="flex:1 1 0"></i></div></div>`).join('')}</div></div>
  <div class="xax">${W.map((w, i) => `<span>${i % 3 === 0 ? md(w) : ''}</span>`).join('')}</div>`;
}
function valBars(h) {
  const t = today(), D = [...Array(30)].map((_, i) => addD(t, i - 29)), vs = D.map(d => val(h, d)), mx = Math.max(h.target * 1.2, ...vs), u = h.type === 'time' ? '분' : '회';
  return `<div class="plot ${h.cat}"><div class="gl goal" style="top:${(1 - h.target / mx) * 100}%"><span>목표 ${h.target}${u}</span></div><div class="gl base" style="top:100%"></div>
    <div class="bars">${D.map((d, i) => `<div data-tip="${tipDate(d)} · ${Math.round(vs[i])}${u}"><div class="st" style="height:${vs[i] / mx * 100}%"><i class="${vs[i] >= h.target ? '' : 'p'}" style="flex:1 1 0"></i></div></div>`).join('')}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${i % 7 === 1 ? md(d) : ''}</span>`).join('')}</div>`;
}
function vHabit() {
  const h = S.habits.find(x => x.id === hid && !x.del);
  if (!h) return '<p class="empty">습관을 찾을 수 없습니다.</p>';
  const t = today(), all = []; for (let d = h.c; d <= t; d = addD(d, 1)) all.push(d);
  const [k, n, u] = hStat(h, all), [mk, mn] = hStat(h, monthDays(t.slice(0, 7)));
  const hc = d => {
    if (!alive(h, d)) return ['', `${tipDate(d)} · -`];
    if (!weekly(h) && isRest(d)) return ['rs', `${tipDate(d)} · 휴식일`];
    if (!weekly(h) && !sched(h, d)) return ['', `${tipDate(d)} · 예정 없음`];
    return [done(h, d) ? 'l4' : val(h, d) > 0 ? 'l2' : '', `${tipDate(d)} · ${fmtVal(h, d)}`];
  };
  return `<header class="top"><div><button class="btn sm" data-act="back">${I.l.replace('<svg', '<svg style="width:.9rem;height:.9rem;vertical-align:-2px"')} 뒤로</button>
    <h1 style="margin-top:.6rem">${esc(h.name)}</h1><div class="sub">${hDesc(h)}${archived(h) ? ' · 보관됨' : ''} · ${h.c.slice(2).replace(/-/g, '.')} 시작</div></div>
    <button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></header>
  <div class="tiles" style="margin-top:.8rem">
    <div class="tile"><span class="sub">현재 연속</span><b>${streak(h)}${u}</b></div>
    <div class="tile"><span class="sub">최장 연속</span><b>${longest(h)}${u}</b></div>
    <div class="tile"><span class="sub">전체 달성률</span><b>${n ? pct(k / n) : '-'}</b><small>${k}/${n}${u}</small></div>
    <div class="tile"><span class="sub">이번 달</span><b>${mn ? pct(mk / mn) : '-'}</b><small>${mk}/${mn}${u}</small></div>
  </div>
  ${h.type === 'clock' ? `<h2>시각 · 최근 30일</h2><div class="card">${clockChart(h)}</div>` : wkAmt(h) ? `<h2>주간 합계 · 최근 12주</h2><div class="card">${weekBars(h)}</div>` : h.type !== 'check' ? `<h2>${h.type === 'time' ? '시간' : '횟수'} · 최근 30일</h2><div class="card">${valBars(h)}</div>` : ''}
  <div class="grid2"><div><h2>월별 달성률 · 최근 12개월</h2><div class="card">${monthBars(h)}</div></div>
  <div><h2>요일별</h2><div class="card">${hWeekday(h)}</div></div></div>
  <h2>최근 1년</h2><div class="card ${h.cat}">${yearHeat(hc, false)}</div>`;
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
  const total = past.reduce((a, d) => a + habits().filter(h => counts(h, d) && done(h, d)).length, 0);
  const best = habits().filter(h => !archived(h)).map(h => [h, streak(h)]).sort((a, b) => b[1] - a[1])[0];
  return `<header class="top"><h1>통계</h1><div class="mnav"><button class="ib" data-act="mon" data-n="-1">${I.l}</button><span>${y}. ${pad(mo)}</span><button class="ib" data-act="mon" data-n="1">${I.r}</button></div></header>
  <div class="tiles" style="margin-top:.6rem">
    <div class="tile"><span class="sub">평균 달성률</span><b>${avg == null ? '-' : pct(avg)}</b><small>${delta == null ? '지난달 기록 없음' : `지난달 대비 ${delta >= 0 ? '+' : ''}${delta}%p`}</small></div>
    <div class="tile"><span class="sub">완벽한 날</span><b>${perfect}일</b><small>${past.length}일 중</small></div>
    <div class="tile"><span class="sub">총 달성</span><b>${total}회</b><small>하루 평균 ${past.length ? (total / past.length).toFixed(1) : 0}회</small></div>
    <div class="tile"><span class="sub">최고 연속</span><b>${best ? best[1] : 0}${best ? sunit(best[0]) : '일'}</b><small>${best && best[1] ? esc(best[0].name) : '-'}</small></div>
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
function ddCard() {
  const t = today();
  return `<h2>D-day</h2><div class="card list">${ddays().map(x => `<div class="srow"><div class="grow"><div class="${x.date < t ? 'sub' : ''}">${esc(x.name)}</div><div class="hmeta">${x.date.replace(/-/g, '.')} · ${x.date < t ? '지남' : ddLabel(x.date)}</div></div><button class="ib" data-act="ddedit" data-id="${x.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">등록된 D-day가 없습니다.</p>'}</div>
  <button class="btn add" data-act="ddedit">D-day 추가</button>`;
}
function hDesc(h) {
  const TY = { check: '완료', count: '횟수', time: '시간', clock: '시각' };
  return `${h.cat === 'life' ? '일상' : '공부'} · ${TY[h.type]}${h.type === 'clock' ? ` ${hhmm(h.target)} 이전` : h.type !== 'check' && !wkAmt(h) ? ' ' + h.target + unitOf(h) : ''}${weekly(h) ? ` · ${wkText(h)}` : h.days.length < 7 ? ' · ' + WDO.filter(x => h.days.includes(x)).map(x => WD[x]).join('') : ''}`;
}
function vSet() {
  return `<header class="top"><h1>설정</h1></header>
  <div class="grid2"><div>
  <h2>습관</h2><div class="card list">${habits().filter(h => !archived(h)).map((h, i, a) => `<div class="srow"><span class="dot" style="--c:var(--${h.cat})"></span><div class="grow"><div>${esc(h.name)}</div><div class="hmeta">${hDesc(h)}</div></div>
    ${i ? `<button class="ib" data-act="hup" data-id="${h.id}" aria-label="위로">${I.up}</button>` : ''}${i < a.length - 1 ? `<button class="ib" data-act="hdn" data-id="${h.id}" aria-label="아래로">${I.down}</button>` : ''}<button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">습관이 없습니다.</p>'}</div>
  <button class="btn add" data-act="hedit">습관 추가</button>
  ${habits().some(archived) ? `<h2>보관된 습관</h2><div class="card list">${habits().filter(archived).map(h => `<div class="srow"><span class="dot" style="--c:var(--${h.cat})"></span><div class="grow"><div class="sub">${esc(h.name)}</div><div class="hmeta">${hDesc(h)} · ${h.off.find(r => !r[1])[0].slice(2).replace(/-/g, '.')} 보관</div></div><button class="btn" data-act="hrest" data-id="${h.id}">복원</button><button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></div>`).join('')}</div>` : ''}
  ${ddCard()}
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
  <p class="sub" style="text-align:center;margin-top:28px">습관 트래커 v1.7</p>
  </div></div>`;
}

/* ========== report (A4) ========== */
function report(m) {
  const D = monthDays(m), t = today(), past = D.filter(d => d <= t), hs = habits().filter(h => inRange(h, D));
  const [y, mo] = m.split('-').map(Number);
  const rates = past.map(dayRate).filter(r => r != null);
  const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0;
  const total = past.reduce((a, d) => a + hs.filter(h => counts(h, d) && done(h, d)).length, 0);
  const head = D.map((d, i) => { const w = pd(d).getDay(); return `<th class="${w === 0 ? 'sun' : ''}">${i + 1}<br>${WD[w]}</th>`; }).join('');
  const body = hs.map(h => {
    const [dn, n] = hStat(h, past);
    const cell = d => isRest(d) && alive(h, d) && !weekly(h) && h.days.includes(pd(d).getDay()) ? '<span class="c r"></span>' : weekly(h) ? (alive(h, d) && d <= t && done(h, d) ? `<span class="c ${h.cat}"></span>` : '') : !sched(h, d) ? '' : `<span class="c ${d <= t && done(h, d) ? h.cat : 's'}"></span>`;
    return `<tr><td class="nm">${esc(h.name)}${weekly(h) ? ` (${wkText(h)})` : ''}</td>${D.map(d => `<td>${cell(d)}</td>`).join('')}<td class="rt">${n ? Math.round(dn / n * 100) + '%' : '-'}</td></tr>`;
  }).join('');
  const rrow = `<tr><td class="nm">달성률</td>${D.map(d => { const r = d <= t ? dayRate(d) : null; return `<td class="mn">${isRest(d) ? '휴' : r == null ? '' : Math.round(r * 100)}</td>`; }).join('')}<td class="rt">${avg}%</td></tr>`;
  const hr = hs.map(h => { const [dn, n, u] = hStat(h, past); return { h, r: n ? dn / n : 0, dn, n, u }; }).sort((a, b) => b.r - a.r);
  return `<div class="page rp">
    <div class="rp-h"><h1>${y}년 ${mo}월 습관 리포트</h1><span>${nextDday() ? `${esc(nextDday().name)} ${ddLabel(nextDday().date)} · ` : ''}${t} 출력</span></div>
    <div class="rp-t"><div>평균 달성률<b>${avg}%</b></div><div>완벽한 날<b>${rates.filter(r => r === 1).length}일</b></div><div>총 달성<b>${total}회</b></div><div>기록한 날<b>${rates.length}일</b></div></div>
    <h4>습관 달성표</h4>
    <table class="hg"><colgroup><col style="width:26mm">${D.map(() => '<col>').join('')}<col style="width:10mm"></colgroup>
      <thead><tr><th class="nm"></th>${head}<th>달성</th></tr></thead><tbody>${body}${rrow}</tbody></table>
    <h4>습관별 달성률</h4>
    <div class="rp-s">${hr.map(x => `<div class="r"><span>${esc(x.h.name)}</span><i style="width:${x.r * 40}mm;background:var(--u-${x.h.cat})"></i><em>${x.dn}/${x.n}${x.u} · ${Math.round(x.r * 100)}%</em></div>`).join('') || '<div style="color:#999">기록 없음</div>'}</div>
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
  h = h || { name: '', cat: 'life', type: 'check', target: 1, days: [0, 1, 2, 3, 4, 5, 6], freq: 'days', per: 3 };
  openDlg(`<h3>${n ? '습관 추가' : '습관 편집'}</h3>
    <div class="fld"><span>이름</span><input id="f-name" value="${esc(h.name)}" maxlength="30" placeholder="예: 스트레칭"></div>
    <div class="fld"><span>분류</span>${seg('cat', [['life', '일상'], ['study', '공부']], h.cat)}</div>
    <div class="fld"><span>기록 방식</span>${seg('type', [['check', '완료'], ['count', '횟수'], ['time', '시간'], ['clock', '시각']], h.type)}</div>
    <div class="fld" id="f-tg"><span>하루 목표</span><div class="inl"><input id="f-target" type="number" inputmode="numeric" min="1" value="${h.type === 'check' || h.type === 'clock' ? '' : h.target}" placeholder="${h.type === 'time' ? 30 : 1}"><span id="f-unit"></span></div></div>
    <div class="fld" id="f-tt"><span>목표 시각 (이 시각 이전이면 달성)</span><input id="f-ttime" type="time" value="${hh2(h.type === 'clock' ? h.target : 390)}"></div>
    <div class="fld" id="f-freq"><span>빈도</span>${seg('freq', [['days', '요일 지정'], ['week', '주 n회']], weekly(h) ? 'week' : 'days')}</div>
    <div class="fld" id="f-per"><span>주간 목표</span><div class="inl"><input id="f-pern" type="number" inputmode="numeric" min="1" max="7" value="${h.per || 3}"><span id="f-perunit">회 / 주 (일~토)</span></div></div>
    <div class="fld" id="f-wt"><span>주간 목표 (일~토 합계)</span><div class="inl"><input id="f-wtn" type="number" inputmode="numeric" min="1" value="${wkAmt(h) ? h.target : h.type === 'count' || h.type === 'time' ? h.target * 5 : ''}" placeholder="${h.type === 'time' ? 600 : 10}"><span id="f-wtunit"></span></div><small style="display:block;margin-top:.35rem">하루 목표 없이 이번 주 합계로 판정합니다. 하루에 몰아서 해도 인정됩니다.</small></div>
    <div class="fld" id="f-days"><span>요일</span><div class="days">${WDO.map(i => `<button type="button" data-act="dtog" data-d="${i}" class="${h.days.includes(i) ? 'on' : ''}">${WD[i]}</button>`).join('')}</div></div>
    <div class="dbtns">${n ? '' : `<button class="btn danger" data-act="hdel" data-id="${h.id}">삭제</button>${archived(h) ? `<button class="btn" data-act="hrest" data-id="${h.id}">복원</button>` : `<button class="btn" data-act="harch" data-id="${h.id}">보관</button>`}`}<span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="hsave" data-id="${n ? '' : h.id}">저장</button></div>`);
  updForm();
}
function valDlg(h, d) {
  const v = val(h, d), clk = h.type === 'clock';
  openDlg(`<h3>${esc(h.name)}</h3><p class="sub" style="margin:-.6rem 0 1rem">${tipDate(d)} · ${clk ? `목표 ${hhmm(h.target)} 이전` : wkAmt(h) ? `이번 주 ${wkProg(h, d)}` : `목표 ${h.target}${unitOf(h)}`}</p>
    <div class="fld">${clk ? `<input id="f-v" type="time" value="${v > 1 ? hh2(v - 1) : ''}">` : `<input id="f-v" type="number" inputmode="numeric" min="0" value="${v || ''}" placeholder="0">`}</div>
    <div class="dbtns"><button class="btn danger" data-act="vclear" data-id="${h.id}" data-d="${d}">지우기</button><span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="vsave" data-id="${h.id}" data-d="${d}">저장</button></div>`);
}
function dayDlg(d) {
  openDlg(`<h3>${tipDate(d)}</h3><p class="sub" style="margin:-.6rem 0 1rem">휴식일은 달성률과 연속 기록에서 제외됩니다.</p>
    <div class="dbtns" style="margin-top:0"><button class="btn" data-act="rest" data-d="${d}">${isRest(d) ? '휴식일 해제' : '휴식일 지정'}</button><button class="btn" data-act="goto" data-d="${d}">이 날 보기</button><span></span><button class="btn" data-act="dclose">닫기</button></div>`);
}
function ddDlg(x) {
  const n = !x;
  x = x || { name: '', date: addD(today(), 30) };
  openDlg(`<h3>${n ? 'D-day 추가' : 'D-day 편집'}</h3>
    <div class="fld"><span>이름</span><input id="f-name" value="${esc(x.name)}" maxlength="20" placeholder="예: 수능"></div>
    <div class="fld"><span>날짜</span><input id="f-date" type="date" value="${x.date}"></div>
    <div class="dbtns">${n ? '' : `<button class="btn danger" data-act="dddel" data-id="${x.id}">삭제</button>`}<span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="ddsave" data-id="${n ? '' : x.id}">저장</button></div>`);
}
function updForm() {
  const ty = segVal('type'), cnt = ty === 'count', wk = cnt || segVal('freq') === 'week', amt = ty === 'count' || ty === 'time';
  $('#f-freq').hidden = cnt;
  $('#f-tg').hidden = !amt || wk;
  $('#f-tt').hidden = ty !== 'clock';
  $('#f-unit').textContent = $('#f-wtunit').textContent = ty === 'time' ? '분' : '회';
  $('#f-per').hidden = !wk || amt; $('#f-wt').hidden = !wk || !amt; $('#f-days').hidden = wk;
  $('#f-perunit').textContent = ty === 'clock' ? '일 / 주 (목표 시각 이전에 한 날)' : '회 / 주 (일~토)';
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
  $('#main').innerHTML = ({ today: vToday, week: vWeek, stats: vStats, set: vSet, habit: vHabit }[view] || vToday)();
}
function softRender() {
  const a = document.activeElement;
  if (a && a.closest('main') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  if (dlg.open) return;
  render();
}
let toastT;
function toast(m, undo) {
  const t = $('#toast');
  t.innerHTML = esc(m) + (undo ? '<button data-act="undo">되돌리기</button>' : '');
  t.classList.toggle('act', !!undo); t.classList.add('on');
  if (!undo) undoFn = null;
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('on'); undoFn = null; }, undo ? 5000 : 2000);
}

/* ========== events ========== */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  const h = id && S.habits.find(x => x.id === id);
  switch (a) {
    case 'tog': setValU(h, cur, done(h, cur) ? 0 : 1); break;
    case 'inc': {
      const st = h.type === 'time' ? (h.target >= 30 ? 10 : 5) : 1;
      setValU(h, cur, Math.max(0, val(h, cur) + st * +b.dataset.n)); break;
    }
    case 'clnow': { const n = new Date(); setValU(h, cur, n.getHours() * 60 + n.getMinutes() + 1); break; }
    case 'vedit': valDlg(h, b.dataset.d); break;
    case 'wcell': { const d = b.dataset.d; if (h.type === 'check') setValU(h, d, done(h, d) ? 0 : 1); else valDlg(h, d); break; }
    case 'vsave': {
      const x = $('#f-v').value, nv = h.type === 'clock' ? (x ? toMin(x) + 1 : 0) : Math.max(0, Math.round(+x || 0));
      dlg.close(); setValU(h, b.dataset.d, nv); break;
    }
    case 'vclear': dlg.close(); setValU(h, b.dataset.d, 0); break;
    case 'wday': dayDlg(b.dataset.d); break;
    case 'wk': wkCur = +b.dataset.n ? addD(wkCur, 7 * +b.dataset.n) : wkStart(today()); render(); break;
    case 'rest': {
      const d = b.dataset.d, prev = isRest(d);
      if (dlg.open) dlg.close();
      setRest(d, !prev);
      offerUndo(prev ? `${tipDate(d)} 휴식일 해제` : `${tipDate(d)} 휴식일 · 통계에서 제외`, () => setRest(d, prev));
      break;
    }
    case 'undo': if (undoFn) { const f = undoFn; undoFn = null; f(); toast('되돌렸습니다'); } break;
    case 'hopen': location.hash = 'h=' + id; break;
    case 'back': if (history.length > 1) history.back(); else location.hash = 'today'; break;
    case 'ddedit': ddDlg((S.dday || []).find(x => x.id === id)); break;
    case 'ddsave': {
      const name = $('#f-name').value.trim(), date = $('#f-date').value;
      if (!name || !date) return toast('이름과 날짜를 입력하세요');
      S.dday = S.dday || [];
      const x = S.dday.find(y => y.id === id);
      if (x) Object.assign(x, { name, date, u: now() }); else S.dday.push({ id: uid(), name, date, u: now() });
      dlg.close(); commit(); break;
    }
    case 'dddel': {
      const x = S.dday.find(y => y.id === id);
      if (confirm(`'${x.name}' D-day를 삭제할까요?`)) { x.del = true; x.u = now(); dlg.close(); commit(); }
      break;
    }
    case 'day': cur = +b.dataset.n ? addD(cur, +b.dataset.n) : today(); render(); break;
    case 'goto': cur = b.dataset.d; if (dlg.open) dlg.close(); if (view === 'today') render(); else location.hash = 'today'; break;
    case 'mon': { const d = pd(ym + '-01'); d.setMonth(d.getMonth() + +b.dataset.n); ym = ds(d).slice(0, 7); render(); break; }
    case 'seg': {
      const p = b.parentElement;
      if (p.dataset.f.startsWith('pref:')) { const k = p.dataset.f.slice(5); setPref({ [k]: k === 'weight' ? +b.dataset.v : b.dataset.v }); break; }
      $$('button', p).forEach(x => x.classList.toggle('on', x === b));
      if (p.dataset.f === 'type' || p.dataset.f === 'freq') updForm();
      break;
    }
    case 'hedit': habitDlg(h); break;
    case 'dtog': b.classList.toggle('on'); break;
    case 'dclose': dlg.close(); break;
    case 'hsave': {
      const name = $('#f-name').value.trim(), type = segVal('type');
      const days = $$('#dlg .days .on').map(x => +x.dataset.d);
      const freq = type === 'count' ? 'week' : segVal('freq'), amt = (type === 'count' || type === 'time') && freq === 'week';
      const target = type === 'check' ? 1 : type === 'clock' ? toMin($('#f-ttime').value || '06:30')
        : amt ? Math.max(1, Math.round(+$('#f-wtn').value || (type === 'time' ? 600 : 10))) : Math.max(1, Math.round(+$('#f-target').value || (type === 'time' ? 30 : 1)));
      if (!name) return toast('이름을 입력하세요');
      const per = Math.max(1, Math.min(7, Math.round(+$('#f-pern').value || 1)));
      if (freq === 'days' && !days.length) return toast('요일을 하나 이상 고르세요');
      const o = { name, cat: segVal('cat'), type, target, days: freq === 'week' ? [0, 1, 2, 3, 4, 5, 6] : days, freq, per, link: '', u: now() };
      if (h) Object.assign(h, o);
      else S.habits.push({ id: uid(), c: today(), o: Math.max(0, ...S.habits.map(x => x.o)) + 1, ...o });
      dlg.close(); commit(); break;
    }
    case 'hdel': if (confirm(`'${h.name}' 습관을 삭제할까요?\n지난 기록도 통계에서 사라집니다. 기록을 남기려면 '보관'을 사용하세요.`)) habitU(h, `'${h.name}' 삭제됨`, () => { h.del = true; h.u = now(); dlg.close(); commit(); }); break;
    case 'harch': habitU(h, `'${h.name}' 보관됨 · 지난 기록은 통계에 남습니다`, () => { h.off = [...(h.off || []), [today(), null]]; h.u = now(); dlg.close(); commit(); }); break;
    case 'hrest': habitU(h, `'${h.name}' 복원됨`, () => {
      const r = h.off.find(x => !x[1]); r[1] = today();
      h.off = h.off.filter(x => x[0] !== x[1]); h.u = now();
      if (dlg.open) dlg.close(); commit();
    }); break;
    case 'hup': case 'hdn': {
      const l = habits().filter(x => !archived(x)), i = l.indexOf(h), j = a === 'hup' ? i - 1 : i + 1;
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
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.pref) { setPref({ [t.dataset.pref]: prefVal(t) }); return; }
  if (t.dataset.clock) { const h = S.habits.find(x => x.id === t.dataset.clock); setValU(h, cur, t.value ? toMin(t.value) + 1 : 0); return; }
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
addEventListener('hashchange', () => { parseHash(); render(); scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { softRender(); sync(); }
  else if (syncT) sync();
});
addEventListener('online', () => sync());

render();
loadCustomFont();
sync();
// 새 버전이 배포되면 받아서 한 번 다시 불러옴
if ('serviceWorker' in navigator) {
  const hadCtl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => {
    r.update();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') r.update(); });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtl && !reloaded) { reloaded = true; location.reload(); } });
}
