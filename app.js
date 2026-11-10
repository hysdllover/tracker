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
const DEF_P = { font: 'pretendard', size: 13, weight: 300, mode: 'auto', life: '#8FA0AE', study: '#5F6F80', accent: '#BAC2C9', heat: 'life', chart: 'bar', partial: false, style: 'card', heatSt: 'plain', mark: 'box', flip: true, ink: true, sketch: true };
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
// 기록 화면 손그림을 한 번 켜 둠 (이후 사용자가 끄면 그대로 유지)
if (S.prefs && !S.prefs.skv) { S.prefs.sketch = true; S.prefs.skv = 1; S.prefs.u = Date.now(); }
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
const unitOf = h => h.type === 'time' ? '분' : (h.unit || '회');
const hmS = m => `${Math.floor(Math.round(m) / 60)}:${pad(Math.round(m) % 60)}`; // 시:분 (4:30)
const fmtAmt = (h, v) => h.type === 'time' ? hmS(v) : `${Math.round(v)}${unitOf(h)}`;
const fmtGoal = (h, v) => h.type === 'time' ? fmtMin(v) : `${v}${unitOf(h)}`;
const wkText = h => wkAmt(h) ? `주 ${fmtGoal(h, h.target)}` : `주 ${h.per}회`;
const fk = k => Number.isInteger(k) ? k : k.toFixed(1);
// 수면(sleep) 습관: 값 = 1 + 취침분*1440 + 기상분, 목표 = 수면 시간(h.target분) 이상 + 선택 취침 시각(h.bt) 이전
const slEnc = (b, w) => 1 + b * 1440 + w;
const slDec = v => v > 0 ? { b: Math.floor((v - 1) / 1440), w: (v - 1) % 1440, dur: ((v - 1) % 1440 - Math.floor((v - 1) / 1440) + 1440) % 1440 } : null;
const nightN = m => m < 720 ? m + 1440 : m; // 정오 이전 시각은 다음날로 보고 비교
const slOk = (h, x) => !!x && x.dur >= h.target && (h.bt == null || nightN(x.b) <= nightN(h.bt));
const done = (h, d) => { const v = val(h, d); return h.type === 'sleep' ? slOk(h, slDec(v)) : h.type === 'clock' ? v > 0 && v - 1 <= h.target : wkAmt(h) ? v > 0 : v >= goal(h); };
function fmtVal(h, d) {
  const v = val(h, d);
  if (h.type === 'check') return done(h, d) ? '완료' : '미완료';
  if (h.type === 'clock') return v > 1 ? hhmm(v - 1) : v === 1 ? '완료' : '미기록';
  if (h.type === 'sleep') { const x = slDec(v); return x ? `${hhmm(x.b)} → ${hhmm(x.w)} · ${fmtMin(x.dur)}` : '미기록'; }
  if (wkAmt(h)) return fmtAmt(h, v);
  return h.type === 'time' ? `${hmS(v)} / ${hmS(h.target)}` : `${Math.round(v)}/${h.target}${unitOf(h)}`;
}
const isRest = d => S.rest?.[d]?.[0] === 1;
function setRest(d, on) { S.rest = S.rest || {}; S.rest[d] = [on ? 1 : 0, now()]; commit(); }
const ddays = () => (S.dday || []).filter(x => !x.del).sort((a, b) => a.date < b.date ? -1 : 1);
const nextDday = () => ddays().find(x => x.date >= today());
const ddLabel = date => { const n = dayDiff(today(), date); return n === 0 ? 'D-DAY' : `D-${n}`; };
const weekly = h => h.freq === 'week';
// 보관 기간(off: [[시작, 끝|null]])을 제외한 활성 여부
const alive = (h, d) => d >= h.c && (!h.end || d <= h.end) && !(h.off || []).some(([a, b]) => d >= a && (!b || d < b));
const ended = h => !!h.end && h.end < today();
const archived = h => ended(h) || (h.off || []).some(r => !r[1]);
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
// 도전 목표(h.stretch): 최소 목표(h.target)만 채우면 달성, 도전까지 채우면 진하게
const amtType = h => h.type === 'count' || h.type === 'time';
const greatD = (h, d) => !!h.stretch && amtType(h) && !wkAmt(h) && val(h, d) >= h.stretch;
const greatW = (h, d) => !!h.stretch && wkAmt(h) && wkDone(h, d) >= h.stretch;
const cls = (h, d) => done(h, d) ? (h.stretch && amtType(h) && !wkAmt(h) && !greatD(h, d) ? 'y m' : 'y') : val(h, d) > 0 ? 'p' : '';
// 부분 점수: 설정에서 켜면 시간·수면 습관을 채운 비율만큼 점수로 계산
const partialOn = () => !!(S.prefs && S.prefs.partial);
function scoreD(h, d) {
  if (done(h, d)) return 1;
  if (!partialOn()) return 0;
  if (h.type === 'time' && !wkAmt(h)) return Math.min(1, val(h, d) / h.target);
  if (h.type === 'sleep') { const x = slDec(val(h, d)); return x ? Math.min(1, x.dur / h.target) : 0; }
  return 0;
}
const wOf = h => h.w || 1; // 중요도 1 보통 · 2 중요 · 3 핵심
function hStat(h, D) {
  const t = today(), pt = partialOn();
  if (!weekly(h)) { const sc = D.filter(d => d <= t && sched(h, d)); return [sc.reduce((a, d) => a + scoreD(h, d), 0), sc.length, '일']; }
  let k = 0, n = 0;
  [...new Set(D.filter(d => d <= t && alive(h, d)).map(wkStart))].forEach(w => {
    const m = wkMet(h, w), sc = m ? 1 : pt ? Math.min(1, wkDone(h, w) / wkGoal(h)) : 0;
    if (m || addD(w, 6) < t) { n++; k += sc; }
  });
  return [k, n, '주'];
}
function dayRate(d) {
  const hs = habits().filter(h => sched(h, d));
  if (!hs.length) return null;
  const W = hs.reduce((a, h) => a + wOf(h), 0);
  return hs.reduce((a, h) => a + wOf(h) * scoreD(h, d), 0) / W;
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
let wet = null; // 잉크 효과: 방금 완료한 습관·날짜
const isWet = (h, d) => wet && wet.id === h.id && wet.d === d && now() - wet.t < 1500;
function setValU(h, d, v) {
  const prev = S.logs[d]?.v?.[h.id]?.[0] || 0;
  const was = done(h, d);
  wet = null;
  setVal(h, d, v);
  if (!was && done(h, d)) { wet = { id: h.id, d, t: now() }; render(); }
  offerUndo(`${h.name} · ${fmtVal(h, d)}`, () => setVal(h, d, prev));
}
function habitU(h, msg, mut) {
  const i = S.habits.indexOf(h), prev = JSON.stringify(h);
  mut();
  offerUndo(msg, () => { S.habits[i] = { ...JSON.parse(prev), u: now() }; commit(); });
}
const devName = () => cfg.dev || (/iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) ? '아이패드' : /iPhone/.test(navigator.userAgent) ? '아이폰' : '이 기기');
function commit(noRender) {
  delete S.seed; S.u = now(); memo = null;
  S.lastDev = { n: devName(), t: now() };
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
  // 삭제된 습관은 동기화용 최소 정보만 남김
  const hm = mergeArr(a.habits, b.habits).map(h => h.del ? { id: h.id, del: true, u: h.u, o: 0 } : h);
  const live = new Set(hm.filter(h => !h.del).map(h => h.id)), old = addD(today(), -60);
  for (const d of new Set([...Object.keys(a.logs || {}), ...Object.keys(b.logs || {})])) {
    const x = a.logs?.[d] || E, y = b.logs?.[d] || E, v = { ...x.v };
    for (const k in y.v) if (!v[k] || y.v[k][1] > v[k][1]) v[k] = y.v[k];
    for (const k in v) if (!live.has(k) || (!v[k][0] && d < old)) delete v[k];
    if (Object.keys(v).length) logs[d] = { v, n: ['', 0] };
  }
  const rest = { ...(a.rest || {}) };
  for (const k in b.rest || {}) if (!rest[k] || b.rest[k][1] > rest[k][1]) rest[k] = b.rest[k];
  return {
    habits: hm, subjects: [], dday: mergeArr(a.dday, b.dday), rest,
    sessions: [], logs, u: Math.max(a.u || 0, b.u || 0),
    prefs: (b.prefs?.u || 0) > (a.prefs?.u || 0) ? b.prefs : a.prefs,
    lastDev: (b.lastDev?.t || 0) > (a.lastDev?.t || 0) ? b.lastDev : a.lastDev,
  };
}
function dataCheck() {
  const del = new Set(S.habits.filter(h => h.del).map(h => h.id)), known = new Set(S.habits.map(h => h.id)), old = addD(today(), -60);
  let orphan = 0, zero = 0, empty = 0;
  for (const d in S.logs) {
    const v = S.logs[d].v || {}, ks = Object.keys(v);
    if (!ks.length) empty++;
    for (const k of ks) { if (del.has(k) || !known.has(k)) orphan++; else if (!v[k][0] && d < old) zero++; }
  }
  const legacy = (S.sessions || []).length + (S.subjects || []).length, tomb = S.habits.filter(h => h.del && Object.keys(h).length > 4).length;
  return { orphan, zero, empty, legacy, tomb, size: JSON.stringify(S).length, total: orphan + zero + empty + legacy + tomb };
}
let syncing = false, syncT = null, syncMsg = '', syncAgain = false, localRev = 0;
const SYNC_DELAY = 15000, SYNC_GAP = 60000;
// 로컬 변경이 있으면 표시 (앱을 닫아도 유지) → 변경이 없을 때는 업로드하지 않음
function schedSync() {
  if (!cfg.token) return;
  localRev++;
  if (!cfg.dirty) { cfg.dirty = true; ls(CFG, cfg); }
  clearTimeout(syncT); syncT = setTimeout(() => sync(true), SYNC_DELAY); // 15초 안의 변경은 한 번에 묶어서 업로드
}
function setSync(m) { syncMsg = m; const e = $('#syncmsg'); if (e) e.textContent = m; }
async function gh(path, opt = {}, etag) {
  const r = await fetch('https://api.github.com' + path, {
    ...opt, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', ...(opt.body ? { 'Content-Type': 'application/json' } : {}), ...(etag ? { 'If-None-Match': etag } : {}) },
  });
  const rl = r.headers.get('x-ratelimit-remaining');
  if (rl != null) cfg.rl = [+rl, +(r.headers.get('x-ratelimit-limit') || 5000)];
  if (r.status === 304) return { status: 304 };
  if (!r.ok) throw new Error(r.status === 401 ? '토큰이 유효하지 않습니다' : r.status === 404 ? '404' : r.status === 403 ? '호출 한도 초과 · 잠시 후 다시 시도' : 'GitHub ' + r.status);
  return { status: r.status, etag: r.headers.get('etag'), json: await r.json() };
}
// 조건부 요청: 마지막 동기화 이후 Gist가 그대로면 304 (호출 한도에서 차감되지 않음)
async function readGist(id) {
  const r = await gh('/gists/' + id, {}, cfg.etag);
  if (r.status === 304) return { same: true };
  const f = r.json.files?.[FILE];
  if (!f) return { data: null, etag: r.etag };
  const c = f.truncated ? await (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content;
  return { data: JSON.parse(c), etag: r.etag };
}
async function sync(force) {
  if (!cfg.token) return;
  if (syncing) { syncAgain = true; return; }
  if (!navigator.onLine) return setSync('오프라인 · 연결되면 동기화합니다');
  // 바뀐 게 없고 1분 안에 확인했으면 건너뜀
  if (!force && !cfg.dirty && cfg.last && now() - cfg.last < SYNC_GAP) return;
  syncing = true; clearTimeout(syncT); setSync('동기화 중…');
  const rev = localRev;
  let ok = false;
  try {
    let remote = null, same = false;
    if (!cfg.gist) {
      const f = (await gh('/gists?per_page=100')).json.find(g => g.files && g.files[FILE]);
      if (f) { cfg.gist = f.id; cfg.etag = null; ls(CFG, cfg); }
    }
    if (cfg.gist) {
      try { const r = await readGist(cfg.gist); if (r.same) same = true; else { remote = r.data; cfg.etag = r.etag; } }
      catch (e) { if (e.message === '404') { cfg.gist = null; cfg.etag = null; ls(CFG, cfg); } else throw e; }
    }
    let changed = false;
    if (same) {
      // 원격은 그대로: 로컬 변경이 있을 때만 업로드
      if (cfg.dirty) {
        const r = await gh('/gists/' + cfg.gist, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(merge(S, {})) } } }) });
        cfg.etag = r.etag;
      }
    } else {
      const merged = remote ? (S.seed ? remote : merge(S, remote)) : merge(S, {});
      const out = JSON.stringify(merged);
      if (!cfg.gist) {
        const r = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files: { [FILE]: { content: out } } }) });
        cfg.gist = r.json.id; cfg.etag = r.etag;
      } else if (out !== JSON.stringify(remote)) {
        const r = await gh('/gists/' + cfg.gist, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: out } } }) });
        cfg.etag = r.etag;
      }
      changed = !!remote;
      S = S.seed ? merged : merge(S, merged); memo = null;
      ls(KEY, S);
    }
    cfg.last = now();
    if (localRev === rev) cfg.dirty = false; // 동기화 중에 생긴 변경은 다음 번에
    ls(CFG, cfg);
    setSync(`${same && !changed ? '최신 상태' : '동기화 완료'} · ${hm(new Date())}`);
    if (changed) softRender();
    ok = true;
  } catch (e) {
    ls(CFG, cfg);
    setSync('동기화 실패 · ' + e.message);
  }
  syncing = false;
  // 성공했고 그 사이 변경이 생겼을 때만 다시 예약 (실패 시 반복 호출하지 않음)
  syncAgain = false;
  if (ok && cfg.dirty) { clearTimeout(syncT); syncT = setTimeout(() => sync(true), SYNC_DELAY); }
}

/* ========== views ========== */
let view = 'today', hid = null, setSub = null;
function parseHash() {
  const x = location.hash.slice(1) || 'today';
  if (x.startsWith('h=')) { view = 'habit'; hid = x.slice(2); }
  else if (x.startsWith('set')) { view = 'set'; setSub = x.startsWith('set=') ? x.slice(4) : null; }
  else view = x;
}
parseHash();
let cur = today(), lastToday = today();
let ym = today().slice(0, 7);
let wkCur = wkStart(today());
let rng = { m: 'month', a: null, b: null }; // 통계 기간

// D-day 연동: 남은 기간의 목표와 최근 속도로 본 예상
function ddPlan(h) {
  const x = (S.dday || []).find(y => y.id === h.dd && !y.del);
  if (!x) return null;
  const t = today(), left = dayDiff(t, x.date);
  if (left <= 0) return null;
  const D = [...Array(left)].map((_, i) => addD(t, i)), R = [...Array(28)].map((_, i) => addD(t, i - 28)).filter(d => alive(h, d));
  let need, exp, unit;
  if (!weekly(h)) {
    need = D.filter(d => sched(h, d) && !done(h, d)).length;
    const sc = R.filter(d => sched(h, d)), rate = sc.length ? sc.filter(d => done(h, d)).length / sc.length : 0;
    exp = Math.round(need * rate); unit = '일';
  } else {
    const W = [...new Set(D.map(wkStart))];
    need = Math.max(0, W.length * wkGoal(h) - wkDone(h, t));
    const per = R.length ? R.reduce((a, d) => a + (wkAmt(h) ? val(h, d) : done(h, d) ? 1 : 0), 0) / R.length : 0;
    exp = Math.round(per * left); unit = wkAmt(h) ? null : '회';
  }
  const f = v => unit ? `${v}${unit}` : fmtAmt(h, v);
  return { name: x.name, label: ddLabel(x.date), left, need, exp, f, perDay: need / left };
}
const bujo = () => P().mark === 'bujo';
// 완료는 체크 표시로 통일 (• 할 일 · − 안 함)
const bjGlyph = (ok, d) => ok ? I.check : d < today() ? '−' : '•';
function row(h, d) {
  const v = val(h, d), t = goal(h), ok = done(h, d), st = streak(h), unit = unitOf(h);
  const meta = [];
  if (wOf(h) > 1) meta.push(wOf(h) === 3 ? '핵심' : '중요');
  if (h.type === 'clock') meta.push(`목표 ${hhmm(h.target)} 이전`);
  else if (h.type === 'sleep') { const x = slDec(v); meta.push(x ? fmtMin(x.dur) : `목표 ${fmtMin(h.target)}${h.bt != null ? ` · ${hhmm(h.bt)} 전 취침` : ''}`); }
  else if (amtType(h) && !wkAmt(h)) meta.push(`목표 ${fmtGoal(h, t)}${h.stretch ? ` · 도전 ${fmtGoal(h, h.stretch)}` : ''}${greatD(h, d) ? ' 도전 달성' : ''}`);
  if (weekly(h)) meta.push(`이번 주 ${wkProg(h, d)}${h.stretch && wkAmt(h) ? ` · 도전 ${fmtGoal(h, h.stretch)}` : ''}${greatW(h, d) ? ' 도전 달성' : wkMet(h, d) ? ' 달성' : ''}`);
  else if (h.days.length < 7) meta.push(WDO.filter(i => h.days.includes(i)).map(i => WD[i]).join(''));
  if (st) meta.push(`${st}${sunit(h)} 연속`);
  const w7 = [...Array(7)].map((_, i) => addD(d, i - 6)).map(x => `<i class="${(weekly(h) ? !alive(h, x) : !sched(h, x)) ? 'n' : cls(h, x)}"></i>`).join('');
  const pl = d === today() ? ddPlan(h) : null;
  let ctl;
  if (h.type === 'check') ctl = bujo() ? `<button class="chk bj ${ok ? 'on' : ''} ${isWet(h, d) ? 'wet' : ''}" data-act="tog" data-id="${h.id}" aria-label="완료">${bjGlyph(ok, d)}</button>`
    : `<button class="chk ${ok ? 'on' : ''} ${isWet(h, d) ? 'wet' : ''}" data-act="tog" data-id="${h.id}" aria-label="완료">${I.check}</button>`;
  else if (h.type === 'clock') ctl = `<div class="step">${v > 1 ? '' : `<button class="btn sm" data-act="clnow" data-id="${h.id}">지금</button>`}<input type="time" class="tin" data-clock="${h.id}" value="${v > 1 ? hh2(v - 1) : ''}" aria-label="시각"></div>`;
  else if (h.type === 'sleep') { const x = slDec(v); ctl = `<div class="step slp"><input type="time" class="tin s" data-sleep="${h.id}" value="${x ? hh2(x.b) : ''}" aria-label="취침"><span class="sub">→</span><input type="time" class="tin s" data-sleep="${h.id}" value="${x ? hh2(x.w) : ''}" aria-label="기상"></div>`; }
  else ctl = `<div class="step"><button class="ib" data-act="inc" data-id="${h.id}" data-n="-1">${I.minus}</button><button class="val" data-act="vedit" data-id="${h.id}" data-d="${d}">${h.type === 'time' ? hmS(v) : v}<small>${wkAmt(h) ? (h.type === 'time' ? '' : unit) : h.type === 'time' ? `/${hmS(t)}` : `/${t}${unit}`}</small></button><button class="ib" data-act="inc" data-id="${h.id}" data-n="1">${I.plus}</button></div>`;
  const pw = amtType(h) ? Math.min(1, wkAmt(h) ? wkDone(h, d) / (h.stretch || h.target) : v / (h.stretch || t)) : 0;
  return `<div class="hrow ${h.cat} ${ok ? 'ok' : ''}"><div class="hinfo" data-act="hopen" data-id="${h.id}"><div class="hname">${esc(h.name)}</div>${h.note ? `<div class="hnote">${esc(h.note)}</div>` : ''}<div class="hmeta"><span class="wd7">${w7}</span><span>${meta.join(' · ') || '매일'}</span></div>${pl ? `<div class="hdd">${esc(pl.name)} ${pl.label} · 남은 목표 ${pl.f(pl.need)} · 지금 속도면 ${pl.f(pl.exp)}</div>` : ''}</div>${ctl}${amtType(h) ? `<i class="pbar" style="width:${pw * 100}%"></i>` : ''}</div>`;
}
const lvl = r => r == null ? 'na' : r === 0 ? '' : r < .34 ? 'l1' : r < .67 ? 'l2' : r < 1 ? 'l3' : 'l4';
const tipDate = d => `${+d.slice(5, 7)}/${+d.slice(8)} (${WD[pd(d).getDay()]})`;
const niceMin = m => m <= 60 ? 60 : m <= 120 ? Math.ceil(m / 30) * 30 : Math.ceil(m / 60) * 60;
const pct = r => Math.round(r * 100) + '%';
function rateOf(d) { const hs = habits().filter(h => sched(h, d)); return hs.length ? [hs.filter(h => done(h, d)).length, hs.length, dayRate(d)] : null; }
const tickLab = (D, monthMode) => { const st = monthMode || D.length <= 31 ? 7 : Math.ceil(D.length / 5); return (d, i) => i % st === 0 ? (monthMode ? +d.slice(8) : md(d)) : ''; };

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
    // 회색 = 예정 전체(배경), 색 = 달성 (점 그래프에서는 점이 달성 높이에 찍힘)
    return `<div data-tip="${tipDate(d)} · ${isRest(d) ? '휴식일' : o.n ? `${s}/${o.n} 달성\n일상 ${o.life} · 공부 ${o.study}` : '-'}"><i class="gh" style="height:${o.n / mx * 100}%"></i><div class="st ${o.n ? '' : 'z'}" style="height:${s / mx * 100}%">${C.filter(c => o[c]).map(c => `<i class="${c}" style="flex:${o[c]} 1 0"></i>`).join('')}</div></div>`;
  }).join('');
  return `<div class="plot"><div class="gl" style="top:0"><span>${mx}</span></div><div class="gl base" style="top:100%"></div><div class="bars">${bars}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${lab(d, i)}</span>`).join('')}</div>
  <div class="legend"><span><i style="--c:var(--life)"></i>일상</span><span><i style="--c:var(--study)"></i>공부</span><span><i style="--c:var(--h0)"></i>미달성</span></div>`;
}

/* 일별 달성률 영역 그래프 */
function rateLine(D, lab = (d, i) => i % 7 === 0 ? +d.slice(8) : '') {
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
    <div class="hits">${D.map(d => { const r = d <= t ? rateOf(d) : null; return `<div data-tip="${tipDate(d)} · ${r ? `${pct(r[2])} (${r[0]}/${r[1]})` : '-'}"></div>`; }).join('')}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${lab(d, i)}</span>`).join('')}</div>`;
}

/* 습관별 달성률 순위 */
function habitRank(D) {
  const rows = habits().filter(h => inRange(h, D)).map(h => {
    const [dn, n, u] = hStat(h, D);
    return { h, r: n ? dn / n : null, dn, n, u, st: streak(h) };
  }).sort((a, b) => (b.r ?? -1) - (a.r ?? -1));
  if (!rows.length) return '<p class="empty">습관이 없습니다.</p>';
  return `<table class="tb"><thead><tr><th>습관</th><th class="bc wide">달성률</th><th class="num"></th><th class="num">연속</th></tr></thead><tbody>${rows.map(x => `<tr class="${x.h.cat}" data-act="hopen" data-id="${x.h.id}" data-tip="${esc(x.h.name)} · ${fk(x.dn)}/${x.n}${x.u}${weekly(x.h) ? ` (${wkText(x.h)} 목표)` : ''}"><td>${esc(x.h.name)}${archived(x.h) ? ' <small>보관</small>' : ''}</td><td class="bc wide"><div class="ibar"><i style="width:${(x.r || 0) * 100}%"></i></div></td><td class="num">${x.r == null ? '-' : pct(x.r)}</td><td class="num sub">${x.st}${x.u}</td></tr>`).join('')}</tbody></table>`;
}

/* 습관 × 날짜 매트릭스 */
function matrix(D, lab = (d, i) => i % 7 === 0 ? +d.slice(8) : '') {
  const t = today(), hs = habits().filter(h => inRange(h, D));
  if (!hs.length) return '<p class="empty">습관이 없습니다.</p>';
  const head = D.map((d, i) => `<th>${lab(d, i)}</th>`).join('');
  const rows = hs.map(h => {
    const [dn, n] = hStat(h, D);
    return `<tr class="${h.cat}"><td class="nm" data-act="hopen" data-id="${h.id}">${esc(h.name)}${weekly(h) ? ` <small>${wkText(h)}</small>` : ''}</td>${D.map(d => {
      if (!weekly(h) && isRest(d) && alive(h, d) && h.days.includes(pd(d).getDay())) return `<td><i class="rs" data-tip="${tipDate(d)} · 휴식일"></i></td>`;
      if (weekly(h) ? !alive(h, d) : !sched(h, d)) return '<td><i class="n"></i></td>';
      if (d > t) return '<td><i class="f"></i></td>';
      return `<td><i class="${cls(h, d)}" data-tip="${esc(h.name)} · ${tipDate(d)}\n${fmtVal(h, d)}"></i></td>`;
    }).join('')}<td class="rt">${n ? Math.round(dn / n * 100) + '%' : '-'}</td></tr>`;
  }).join('');
  return `<table class="mx"><thead><tr><th class="nm"></th>${head}<th class="rt">달성</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="legend"><span><i style="--c:var(--life)"></i>일상</span><span><i style="--c:var(--study)"></i>공부</span><span><i style="--c:color-mix(in srgb,var(--life) 45%,var(--h0))"></i>부분 달성</span></div>`;
}

/* 최근 1년 잔디: fn(d) → [class, tip] */
function dayCell(d) {
  if (isRest(d)) return ['rs', `${tipDate(d)} · 휴식일`];
  const r = rateOf(d);
  return [r ? lvl(r[2]) : '', `${tipDate(d)} · ${r ? `${pct(r[2])} (${r[0]}/${r[1]})` : '기록 없음'}`];
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

// 넘김식 숫자: 날짜가 바뀐 뒤 처음 볼 때 한 번 넘어감
function flipDD(dd) {
  const n = dayDiff(today(), dd.date), key = 'ht.flip', seen = ls(key), go = seen !== today();
  if (go) ls(key, today());
  const digits = n === 0 ? ['D', 'A', 'Y'] : String(n).split('');
  return `<span class="flip ${go ? 'go' : ''}"><span class="fl">D-</span>${digits.map((c, i) => `<span class="fd" style="animation-delay:${i * .08}s"><b>${c}</b></span>`).join('')}</span>`;
}
const viewSw = v => `<div class="seg vsw"><button data-act="go" data-h="today" class="${v === 'today' ? 'on' : ''}">하루</button><button data-act="go" data-h="week" class="${v === 'week' ? 'on' : ''}">주간</button></div>`;
function vToday() {
  const d = cur, dt = pd(d), hs = habits().filter(h => shown(h, d)), dl = hs.filter(h => !weekly(h));
  const dn = dl.filter(h => done(h, d)).length, r = dayRate(d) ?? 0;
  const diff = Math.round((pd(today()) - dt) / 864e5);
  const rel = diff === 0 ? '오늘' : diff === 1 ? '어제' : diff === -1 ? '내일' : diff > 0 ? `${diff}일 전` : `${-diff}일 후`;
  const grp = c => { const l = hs.filter(h => h.cat === c); return l.length ? `<h2>${c === 'life' ? '일상' : '공부'}</h2><div class="card list">${l.map(h => row(h, d)).join('')}</div>` : ''; };
  const dd = nextDday(), rest = isRest(d);
  return `<div class="topline"><i style="width:${rest ? 0 : r * 100}%"></i></div>${viewSw('today')}${dd ? `<div class="ddbar"><span>${esc(dd.name)}</span>${P().flip ? flipDD(dd) : `<b>${ddLabel(dd.date)}</b>`}<span class="sub">${md(dd.date)}</span></div>` : ''}
  <header class="top"><div><div class="sub">${rel}</div><h1>${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WD[dt.getDay()]}요일</h1>
    <div class="datenav"><button class="btn" data-act="day" data-n="-1">이전</button>${diff ? '<button class="btn" data-act="day" data-n="0">오늘</button>' : ''}<button class="btn" data-act="day" data-n="1">다음</button><button class="btn ${rest ? 'on' : ''}" data-act="rest" data-d="${d}">휴식일</button></div></div>
    ${rest ? '<div class="score"><b>휴식</b><span class="sub">통계에서 제외</span></div>' : `<div class="score"><b>${pct(r)}</b><span class="sub">${dn}/${dl.length} 완료</span></div>`}</header>
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
    const txt = h.type === 'check' ? (bujo() ? bjGlyph(ok, d) : ok ? I.check : '') : h.type === 'clock' ? (v > 1 ? hhmm(v - 1) : v === 1 ? I.check : '') : h.type === 'sleep' ? (v ? hmS(slDec(v).dur) : '') : (v ? (h.type === 'time' ? hmS(v) : Math.round(v)) : '');
    return `<td><button class="wc ${cls(h, d)} ${isRest(d) ? 'rs' : ''} ${isWet(h, d) ? 'wet' : ''} ${h.type === 'check' && bujo() ? 'bj' : ''}" data-act="wcell" data-id="${h.id}" data-d="${d}"${d > t ? ' disabled' : ''}>${txt}</button></td>`;
  };
  const sum = h => {
    if (weekly(h)) return wkAmt(h) ? (f => `${f(wkDone(h, wkCur))}<small>/${f(h.target)}</small>`)(h.type === 'time' ? short : Math.round) : `${wkDone(h, wkCur)}/${h.per}`;
    const sc = D.filter(d => d <= t && sched(h, d)); return sc.length ? `${sc.filter(d => done(h, d)).length}/${sc.length}` : '-';
  };
  const foot = D.map(d => { const r = d <= t ? dayRate(d) : null; return `<td>${isRest(d) ? '휴식' : r == null ? '' : pct(r)}</td>`; }).join('');
  return `${viewSw('week')}<header class="top"><h1>주간</h1><div class="mnav">${wkCur !== wkStart(t) ? '<button class="btn sm" data-act="wk" data-n="0">이번 주</button>' : ''}<button class="ib" data-act="wk" data-n="-1">${I.l}</button><span>${md(D[0])} – ${md(D[6])}</span><button class="ib" data-act="wk" data-n="1">${I.r}</button></div></header>
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
    return `<div data-tip="${m.replace('-', '.')} · ${r == null ? '기록 없음' : `${pct(r)} (${fk(st[0])}/${st[1]}${st[2]})`}"><div class="st ${r == null ? 'z' : ''}" style="height:${(r || 0) * 100}%"><i style="flex:1 1 0"></i></div></div>`;
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
  const t = today(), W = [...Array(12)].map((_, i) => addD(wkStart(t), 7 * (i - 11))), vs = W.map(w => wkDone(h, w)), mx = Math.max((h.stretch || h.target) * 1.15, ...vs);
  return `<div class="plot ${h.cat}"><div class="gl goal" style="top:${(1 - h.target / mx) * 100}%"><span>목표 ${fmtGoal(h, h.target)}</span></div>${h.stretch ? `<div class="gl goal" style="top:${(1 - h.stretch / mx) * 100}%"><span>도전 ${fmtGoal(h, h.stretch)}</span></div>` : ''}<div class="gl base" style="top:100%"></div>
    <div class="bars">${W.map((w, i) => `<div data-tip="${md(w)} – ${md(addD(w, 6))} · ${fmtAmt(h, vs[i])}"><div class="st" style="height:${vs[i] / mx * 100}%"><i class="${vs[i] >= h.target ? '' : 'p'}" style="flex:1 1 0"></i></div></div>`).join('')}</div></div>
  <div class="xax">${W.map((w, i) => `<span>${i % 3 === 0 ? md(w) : ''}</span>`).join('')}</div>`;
}
function sleepChart(h) {
  const t = today(), D = [...Array(30)].map((_, i) => addD(t, i - 29)), xs = D.map(d => slDec(val(h, d)));
  const got = xs.filter(Boolean);
  if (!got.length) return '<p class="empty">최근 30일 수면 기록이 없습니다.</p>';
  const avg = a => Math.round(a.reduce((p, q) => p + q, 0) / a.length);
  const ab = avg(got.map(x => nightN(x.b))) % 1440, ad = avg(got.map(x => x.dur)), aw = (ab + ad) % 1440, ok = got.filter(x => slOk(h, x)).length;
  let lo = Math.min(...got.map(x => nightN(x.b))), hi = Math.max(...got.map(x => nightN(x.b) + x.dur));
  if (h.bt != null) { lo = Math.min(lo, nightN(h.bt)); hi = Math.max(hi, nightN(h.bt)); }
  lo = Math.floor(lo / 120) * 120; hi = Math.ceil(hi / 120) * 120; if (hi === lo) hi = lo + 120;
  const Y = m => (m - lo) / (hi - lo) * 100, grid = [];
  for (let m = lo; m <= hi; m += 120) grid.push(m);
  return `<div class="sub">평균 취침 <span style="color:var(--text)">${hhmm(ab)}</span> · 기상 <span style="color:var(--text)">${hhmm(aw)}</span> · 수면 <span style="color:var(--text)">${fmtMin(ad)}</span> · 목표 달성 ${ok}/${got.length}일</div>
  <div class="plot slc ${h.cat}" style="height:11rem">${grid.map(m => `<div class="gl" style="top:${Y(m)}%"><span>${hhmm(m % 1440)}</span></div>`).join('')}
    ${h.bt != null ? `<div class="gl goal gl-l" style="top:${Y(nightN(h.bt))}%"><span>목표 ${hhmm(h.bt)}</span></div>` : ''}
    <div class="slin">${xs.map((x, i) => { if (!x) return ''; const b = nightN(x.b); return `<i class="sb ${slOk(h, x) ? '' : 'p'}" style="left:calc(${i / 30 * 100}% + 1px);width:calc(${100 / 30}% - 2px);top:${Y(b)}%;height:${x.dur / (hi - lo) * 100}%"></i>`; }).join('')}
    <div class="hits">${D.map(d => `<div data-tip="${tipDate(d)} · ${fmtVal(h, d)}"></div>`).join('')}</div></div></div>
  <div class="xax sl-x">${D.map((d, i) => `<span>${i % 7 === 1 ? md(d) : ''}</span>`).join('')}</div>`;
}
function durBars(h) {
  const t = today(), D = [...Array(30)].map((_, i) => addD(t, i - 29)), vs = D.map(d => slDec(val(h, d))?.dur || 0), mx = Math.max(h.target * 1.25, ...vs);
  return `<div class="plot ${h.cat}"><div class="gl goal" style="top:${(1 - h.target / mx) * 100}%"><span>목표 ${fmtMin(h.target)}</span></div><div class="gl base" style="top:100%"></div>
    <div class="bars">${D.map((d, i) => `<div data-tip="${tipDate(d)} · ${vs[i] ? fmtMin(vs[i]) : '미기록'}"><div class="st" style="height:${vs[i] / mx * 100}%"><i class="${vs[i] >= h.target ? '' : 'p'}" style="flex:1 1 0"></i></div></div>`).join('')}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${i % 7 === 1 ? md(d) : ''}</span>`).join('')}</div>`;
}
function valBars(h) {
  const t = today(), D = [...Array(30)].map((_, i) => addD(t, i - 29)), vs = D.map(d => val(h, d)), mx = Math.max((h.stretch || h.target) * 1.15, ...vs);
  return `<div class="plot ${h.cat}"><div class="gl goal" style="top:${(1 - h.target / mx) * 100}%"><span>목표 ${fmtGoal(h, h.target)}</span></div>${h.stretch ? `<div class="gl goal" style="top:${(1 - h.stretch / mx) * 100}%"><span>도전 ${fmtGoal(h, h.stretch)}</span></div>` : ''}<div class="gl base" style="top:100%"></div>
    <div class="bars">${D.map((d, i) => `<div data-tip="${tipDate(d)} · ${fmtAmt(h, vs[i])}"><div class="st" style="height:${vs[i] / mx * 100}%"><i class="${vs[i] >= h.target ? '' : 'p'}" style="flex:1 1 0"></i></div></div>`).join('')}</div></div>
  <div class="xax">${D.map((d, i) => `<span>${i % 7 === 1 ? md(d) : ''}</span>`).join('')}</div>`;
}
let hTab = 'sum', hTabFor = null;
// 최근 60일 기록 목록 (눌러서 바로 수정)
// 장부식 기록: 날짜 | 기록 | 표시 | 누계 (최근 60일, 오래된 날부터 누계)
function hLog(h) {
  const t = today(), list = [];
  for (let i = 59; i >= 0; i--) {
    const d = addD(t, -i);
    if (!alive(h, d)) continue;
    const v = val(h, d), on = weekly(h) || h.days.includes(pd(d).getDay()), rest = !weekly(h) && isRest(d);
    if (!on && !v) continue;
    list.push({ d, v, rest, ok: done(h, d) });
  }
  let acc = 0;
  list.forEach(x => { if (x.ok) acc++; x.acc = acc; });
  const mark = x => x.rest ? '휴' : bujo() ? bjGlyph(x.ok, x.d) : x.ok ? I.check : '';
  const rows = list.reverse().map(x => `<tr class="${x.d.slice(8) === '01' ? 'mo' : ''}"><td class="ld">${x.d.slice(5).replace('-', '.')} <small>${WD[pd(x.d).getDay()]}</small></td>
    <td class="lv">${x.rest ? '휴식일' : x.v || h.type === 'check' ? fmtVal(h, x.d) : '<small>미기록</small>'}</td><td class="lm ${h.cat} ${x.ok ? 'y' : ''}">${mark(x)}</td><td class="la">${x.acc}</td>
    <td class="le"><button class="ib" data-act="${h.type === 'check' ? 'wcell' : 'vedit'}" data-id="${h.id}" data-d="${x.d}" aria-label="${h.type === 'check' ? '완료 전환' : '수정'}">${h.type === 'check' ? I.check : I.edit}</button></td></tr>`).join('');
  return `<div class="card ledger">${rows ? `<table><thead><tr><th>날짜</th><th>기록</th><th>표시</th><th>누계</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">최근 60일 기록이 없습니다.</p>'}</div>`;
}
function vHabit() {
  const h = S.habits.find(x => x.id === hid && !x.del);
  if (!h) return '<p class="empty">습관을 찾을 수 없습니다.</p>';
  if (hTabFor !== hid) { hTab = 'sum'; hTabFor = hid; }
  const t = today(), all = []; for (let d = h.c; d <= t; d = addD(d, 1)) all.push(d);
  const [k, n, u] = hStat(h, all), [mk, mn] = hStat(h, monthDays(t.slice(0, 7)));
  const hc = d => {
    if (!alive(h, d)) return ['', `${tipDate(d)} · -`];
    if (!weekly(h) && isRest(d)) return ['rs', `${tipDate(d)} · 휴식일`];
    if (!weekly(h) && !sched(h, d)) return ['', `${tipDate(d)} · 예정 없음`];
    return [done(h, d) ? 'l4' : val(h, d) > 0 ? 'l2' : '', `${tipDate(d)} · ${fmtVal(h, d)}`];
  };
  const head = `<header class="top"><div><button class="btn sm" data-act="back">${I.l.replace('<svg', '<svg style="width:.9rem;height:.9rem;vertical-align:-2px"')} 뒤로</button>
    <h1 style="margin-top:.6rem">${esc(h.name)}</h1><div class="sub">${hDesc(h)}${ended(h) ? ' · 종료됨' : archived(h) ? ' · 보관됨' : ''} · ${h.c.slice(2).replace(/-/g, '.')} 시작${h.end ? ` · ${h.end.slice(2).replace(/-/g, '.')} 종료` : ''}</div>${h.note ? `<p class="hdesc">${esc(h.note)}</p>` : ''}</div>
    <button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></header>
  ${seg('htab', [['sum', '개요'], ['log', '기록'], ['chart', '그래프']], hTab)}`;
  if (hTab === 'log') return head + `<h2>최근 60일</h2>${hLog(h)}`;
  if (hTab === 'chart') return head + `
  ${h.type === 'sleep' ? `<h2>수면 · 최근 30일</h2><div class="card">${sleepChart(h)}</div><h2>수면 시간 · 최근 30일</h2><div class="card">${durBars(h)}</div>` : h.type === 'clock' ? `<h2>시각 · 최근 30일</h2><div class="card">${clockChart(h)}</div>` : wkAmt(h) ? `<h2>주간 합계 · 최근 12주</h2><div class="card">${weekBars(h)}</div>` : h.type !== 'check' ? `<h2>${h.type === 'time' ? '시간' : '횟수'} · 최근 30일</h2><div class="card">${valBars(h)}</div>` : ''}
  <div class="grid2"><div><h2>월별 달성률 · 최근 12개월</h2><div class="card">${monthBars(h)}</div></div>
  <div><h2>요일별</h2><div class="card">${hWeekday(h)}</div></div></div>`;
  return head + `
  <div class="tiles" style="margin-top:.8rem">
    <div class="tile"><span class="sub">현재 연속</span><b>${streak(h)}${u}</b></div>
    <div class="tile"><span class="sub">최장 연속</span><b>${longest(h)}${u}</b></div>
    <div class="tile"><span class="sub">전체 달성률</span><b>${n ? pct(k / n) : '-'}</b><small>${fk(k)}/${n}${u}</small></div>
    <div class="tile"><span class="sub">이번 달</span><b>${mn ? pct(mk / mn) : '-'}</b><small>${fk(mk)}/${mn}${u}</small></div>
  </div>
  ${(pl => pl ? `<h2>${esc(pl.name)} ${pl.label}까지</h2><div class="tiles">
    <div class="tile"><span class="sub">남은 기간</span><b>${pl.left}일</b></div>
    <div class="tile"><span class="sub">남은 목표</span><b>${pl.f(pl.need)}</b></div>
    <div class="tile"><span class="sub">지금 속도면</span><b>${pl.f(pl.exp)}</b><small>${pl.need ? pct(Math.min(1, pl.exp / pl.need)) + ' 달성 예상' : '목표 달성'}</small></div>
    <div class="tile"><span class="sub">하루 필요량</span><b>${pl.f(Math.ceil(pl.perDay * 10) / 10)}</b></div></div>` : '')(ddPlan(h))}
  <h2>최근 1년</h2><div class="card ${h.cat}">${yearHeat(hc, false)}</div>`;
}

function monthDays(m) {
  const [y, mo] = m.split('-').map(Number);
  return [...Array(new Date(y, mo, 0).getDate())].map((_, i) => `${m}-${pad(i + 1)}`);
}
function statDays() {
  const t = today();
  if (rng.m === 'month') return monthDays(ym);
  if (rng.m === 'custom') { const a = rng.a || addD(t, -29), b = rng.b || t, L = []; for (let d = a; d <= b && L.length < 400; d = addD(d, 1)) L.push(d); return L.length ? L : [t]; }
  const n = +rng.m; return [...Array(n)].map((_, i) => addD(t, i - n + 1));
}
function vStats() {
  const D = statDays(), t = today(), past = D.filter(d => d <= t), mm = rng.m === 'month', [y, mo] = ym.split('-').map(Number);
  const avgOf = days => { const r = days.map(dayRate).filter(x => x != null); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; };
  let prev;
  if (mm) { const pmD = pd(ym + '-01'); pmD.setMonth(pmD.getMonth() - 1); prev = monthDays(ds(pmD).slice(0, 7)).filter(d => d <= t); }
  else prev = D.map((_, i) => addD(D[0], i - D.length));
  const avg = avgOf(past), pavg = avgOf(prev);
  const delta = avg != null && pavg != null ? Math.round((avg - pavg) * 100) : null;
  const perfect = past.filter(d => dayRate(d) === 1).length;
  const total = past.reduce((a, d) => a + habits().filter(h => counts(h, d) && done(h, d)).length, 0);
  const best = habits().filter(h => !archived(h)).map(h => [h, streak(h)]).sort((a, b) => b[1] - a[1])[0];
  const lab = tickLab(D, mm), MX = D.length > 31 ? D.slice(-31) : D;
  const title = mm ? `${mo}월` : rng.m === 'custom' ? `${md(D[0])}–${md(D[D.length - 1])}` : `최근 ${rng.m}일`;
  return `<header class="top"><h1>통계</h1>${mm ? `<div class="mnav"><button class="ib" data-act="mon" data-n="-1">${I.l}</button><span>${y}. ${pad(mo)}</span><button class="ib" data-act="mon" data-n="1">${I.r}</button></div>` : ''}</header>
  ${seg('rng', [['month', '월'], ['7', '7일'], ['30', '30일'], ['90', '90일'], ['custom', '기간']], rng.m)}
  ${rng.m === 'custom' ? `<div class="inl rngin"><input type="date" id="rng-a" value="${D[0]}"><span class="sub">–</span><input type="date" id="rng-b" value="${D[D.length - 1]}"></div>` : ''}
  <div class="tiles" style="margin-top:.8rem">
    <div class="tile"><span class="sub">평균 달성률</span><b>${avg == null ? '-' : pct(avg)}</b><small>${delta == null ? '이전 기록 없음' : `${mm ? '지난달' : '이전 기간'} 대비 ${delta >= 0 ? '+' : ''}${delta}%p`}</small></div>
    <div class="tile"><span class="sub">완벽한 날</span><b>${perfect}일</b><small>${past.length}일 중</small></div>
    <div class="tile"><span class="sub">총 달성</span><b>${total}회</b><small>하루 평균 ${past.length ? (total / past.length).toFixed(1) : 0}회</small></div>
    <div class="tile"><span class="sub">최고 연속</span><b>${best ? best[1] : 0}${best ? sunit(best[0]) : '일'}</b><small>${best && best[1] ? esc(best[0].name) : '-'}</small></div>
  </div>
  <div class="grid2"><div>
    <h2>일별 달성률</h2><div class="card">${rateLine(D, lab)}</div>
    <h2>일별 달성 개수</h2><div class="card">${catBars(D, lab)}</div>
  </div><div>
    <h2>습관별 달성률 · ${title}</h2><div class="card">${habitRank(past)}</div>
    <h2>요일 패턴 · 최근 8주</h2><div class="card">${weekdayTable()}</div>
  </div></div>
  <h2>습관 매트릭스${D.length > 31 ? ' · 마지막 31일' : ''}</h2><div class="card">${matrix(MX, tickLab(MX, mm))}</div>
  <h2>최근 1년</h2><div class="card">${yearHeat()}</div>
  ${mm ? '<div class="btns" style="margin-top:1.2rem"><button class="btn" style="flex:1" data-act="report">A4 월간 리포트</button><button class="btn" style="flex:1" data-act="diary">A4 다이어리 페이지</button></div>' : ''}`;
}
function designCard() {
  const p = P();
  return `<div class="card">
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
    <div class="fld"><span>화면 스타일</span>${seg('pref:style', [['card', '카드'], ['note', '노트']], p.style || 'card')}</div>
    <div class="fld"><span>그래프 모양</span>${seg('pref:chart', [['bar', '막대'], ['dot', '점'], ['pencil', '연필']], p.chart)}</div>
    <h4 class="anh">아날로그</h4>
    <div class="fld"><span>잔디 칠</span>${seg('pref:heatSt', [['plain', '단색'], ['pencil', '색연필']], p.heatSt)}</div>
    <div class="fld"><span>체크 표시</span>${seg('pref:mark', [['box', '칸'], ['bujo', '불렛저널 · • −']], p.mark)}</div>
    <div class="fld"><span>D-day 숫자</span>${seg('pref:flip', [['0', '기본'], ['1', '넘김식']], p.flip ? '1' : '0')}</div>
    <div class="fld"><span>잉크 마르는 효과</span>${seg('pref:ink', [['0', '끔'], ['1', '켬']], p.ink ? '1' : '0')}</div>
    <div class="fld"><span>화면 손그림 (모든 화면의 선·칸·버튼을 연필로)</span>${seg('pref:sketch', [['0', '끔'], ['1', '켬']], p.sketch ? '1' : '0')}</div>
    <button class="btn" data-act="analog" style="margin-bottom:.6rem">아날로그로 한 번에 (노트 · 연필 · 색연필 · 불렛저널)</button>
    <button class="btn" data-act="preset-reset">기본값으로</button>
  </div>`;
}
function ddCard() {
  const t = today();
  return `<div class="card list">${ddays().map(x => `<div class="srow"><div class="grow"><div class="${x.date < t ? 'sub' : ''}">${esc(x.name)}</div><div class="hmeta">${x.date.replace(/-/g, '.')} · ${x.date < t ? '지남' : ddLabel(x.date)}</div></div><button class="ib" data-act="ddedit" data-id="${x.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">등록된 D-day가 없습니다.</p>'}</div>
  <button class="btn add" data-act="ddedit">D-day 추가</button>`;
}
function hDesc(h) {
  const TY = { check: '완료', count: '횟수', time: '시간', clock: '시각', sleep: '수면' };
  const g = h.type === 'sleep' ? ` ${fmtMin(h.target)} 이상${h.bt != null ? ` · ${hhmm(h.bt)} 전 취침` : ''}` : h.type === 'clock' ? ` ${hhmm(h.target)} 이전`
    : amtType(h) && !wkAmt(h) ? ` ${fmtGoal(h, h.target)}${h.stretch ? `(도전 ${fmtGoal(h, h.stretch)})` : ''}` : '';
  const f = weekly(h) ? ` · ${wkText(h)}${wkAmt(h) && h.stretch ? `(도전 ${fmtGoal(h, h.stretch)})` : ''}` : h.days.length < 7 ? ' · ' + WDO.filter(x => h.days.includes(x)).map(x => WD[x]).join('') : '';
  return `${h.cat === 'life' ? '일상' : '공부'} · ${TY[h.type]}${g}${f}${wOf(h) > 1 ? ` · ${wOf(h) === 3 ? '핵심' : '중요'}` : ''}`;
}
const VER = 'v2.4';
const SET_ITEMS = [
  ['habits', '습관', () => `${habits().filter(h => !archived(h)).length}개`],
  ['dday', 'D-day', () => nextDday() ? `${nextDday().name} ${ddLabel(nextDday().date)}` : ''],
  ['design', '디자인', () => (FONTS[P().font] || FONTS.pretendard)[0]],
  ['stats', '통계', () => partialOn() ? '부분 점수 켬' : ''],
  ['sync', '동기화', () => cfg.token ? (cfg.dirty ? '대기 중' : '연결됨') : '꺼짐'],
  ['data', '백업 · 리포트', () => ''],
  ['help', '도움말', () => ''],
  ['about', '정보', () => VER],
];
function setPage(k) {
  if (k === 'habits') return `<div class="card list" id="hlist">${habits().filter(h => !archived(h)).map(h => `<div class="srow"><span class="drag" data-drag="${h.id}" aria-label="순서 바꾸기"><svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg></span><span class="dot" style="--c:var(--${h.cat})"></span><div class="grow"><div>${esc(h.name)}</div><div class="hmeta">${hDesc(h)}</div></div><button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">습관이 없습니다.</p>'}</div>
  <button class="btn add" data-act="hedit">습관 추가</button>
  <p class="sub" style="margin:.6rem 2px 0">왼쪽 줄 두 개를 끌어서 순서를 바꿉니다.</p>
  ${habits().some(archived) ? `<h2>보관·종료된 습관</h2><div class="card list">${habits().filter(archived).map(h => { const o = (h.off || []).find(r => !r[1]); return `<div class="srow"><span class="dot" style="--c:var(--${h.cat})"></span><div class="grow"><div class="sub">${esc(h.name)}</div><div class="hmeta">${hDesc(h)} · ${o ? o[0].slice(2).replace(/-/g, '.') + ' 보관' : h.end.slice(2).replace(/-/g, '.') + ' 종료'}</div></div><button class="btn" data-act="hrest" data-id="${h.id}">복원</button><button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></div>`; }).join('')}</div>` : ''}`;
  if (k === 'dday') return ddCard();
  if (k === 'design') return designCard();
  if (k === 'stats') return `<div class="card"><div class="fld"><span>부분 점수 반영</span>${seg('pref:partial', [['0', '끔'], ['1', '켬']], partialOn() ? '1' : '0')}</div>
    <p class="sub" style="margin:0">켜면 시간·수면 습관을 일부만 채운 날도 채운 비율만큼 점수로 계산합니다. 예: 공부 3시간/4시간 → 75%. 주간 합계 습관도 같은 방식입니다.</p>
    <p class="sub" style="margin:.6rem 0 0">달성률은 습관의 중요도(보통 1 · 중요 2 · 핵심 3)를 가중치로 계산합니다.</p></div>`;
  if (k === 'sync') return `<div class="card">${cfg.token ? `
    <div class="kv"><span>상태</span><span id="syncmsg">${esc(syncMsg || '연결됨')}</span></div>
    <div class="kv"><span>마지막 변경</span><span>${S.lastDev ? `${esc(S.lastDev.n)} · ${new Date(S.lastDev.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '-'}</span></div>
    <div class="kv"><span>대기 중인 변경</span><span>${cfg.dirty ? '있음 · 15초 안에 업로드' : '없음'}</span></div>
    <div class="kv"><span>남은 API 호출</span><span>${cfg.rl ? `${cfg.rl[0].toLocaleString()} / ${cfg.rl[1].toLocaleString()} (1시간)` : '-'}</span></div>
    <div class="kv"><span>마지막 동기화</span><span>${cfg.last ? new Date(cfg.last).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
    <div class="kv"><span>Gist</span><span>${cfg.gist ? cfg.gist.slice(0, 10) + '…' : '-'}</span></div>
    <div class="btns"><button class="btn pri" data-act="sync">지금 동기화</button><button class="btn danger" data-act="untok">연결 해제</button></div>` : `
    <p class="sub" style="margin:0 0 10px">gist 권한이 있는 GitHub 토큰을 입력하세요. 아이폰과 아이패드에 같은 토큰을 넣으면 자동으로 같은 비공개 Gist를 사용합니다.</p>
    <input type="password" id="tok" placeholder="ghp_… 또는 github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="btns"><button class="btn pri" data-act="tok">연결</button></div>`}</div>
    <h2>이 기기 이름</h2><div class="card"><input id="devname" value="${esc(devName())}" maxlength="12"><p class="sub" style="margin:.5rem 0 0">동기화 상태에 마지막으로 바꾼 기기로 표시됩니다.</p></div>`;
  if (k === 'data') return `<div class="card"><p class="sub" style="margin:0">JSON 파일로 저장하거나, 저장한 파일을 현재 데이터에 병합합니다.</p>
    <div class="btns"><button class="btn" data-act="export">내보내기</button><button class="btn" data-act="import">가져오기</button></div>
    <input type="file" id="file" accept="application/json,.json" hidden></div>
  <h2>리포트</h2><div class="card"><div class="btns" style="margin:0"><button class="btn" data-act="report">이번 달 A4 리포트</button></div></div>
  ${(c => `<h2>데이터 점검</h2><div class="card">
    <div class="kv"><span>데이터 크기</span><span>${(c.size / 1024).toFixed(1)} KB</span></div>
    <div class="kv"><span>삭제된 습관의 남은 기록</span><span>${c.orphan}개</span></div>
    <div class="kv"><span>60일 지난 빈 값</span><span>${c.zero}개</span></div>
    <div class="kv"><span>빈 날짜</span><span>${c.empty}개</span></div>
    <div class="kv"><span>예전 타이머 데이터</span><span>${c.legacy}개</span></div>
    <div class="kv"><span>삭제된 습관 정보</span><span>${c.tomb}개</span></div>
    <div class="btns"><button class="btn${c.total ? ' pri' : ''}" data-act="clean"${c.total ? '' : ' disabled'}>${c.total ? '정리하기' : '정리할 것 없음'}</button></div>
    <p class="sub" style="margin:.6rem 0 0">동기화할 때도 자동으로 정리됩니다. 습관 기록과 설정은 지우지 않습니다.</p></div>`)(dataCheck())}`;
  if (k === 'help') return `<div class="card help">
    <h4>기록 방식</h4><p><b>완료</b> 했으면 체크 · <b>횟수</b> 주간 합계로 판정(단위 지정 가능) · <b>시간</b> 시:분 입력, 하루 목표 또는 주간 합계 · <b>시각</b> 목표 시각 이전이면 달성 · <b>수면</b> 취침·기상 시각으로 수면 시간 계산</p>
    <h4>주 n회</h4><p>요일을 정하지 않고 일~토 한 주에 n번(또는 합계)만 채우면 달성입니다. 일별 달성률에는 들어가지 않고 주 단위로 집계됩니다.</p>
    <h4>최소 · 도전 목표</h4><p>최소 목표만 채워도 달성입니다. 도전 목표까지 채우면 칸이 진하게 표시됩니다.</p>
    <h4>달성률 계산</h4><p>그날 예정된 습관 중 달성한 비율입니다. 중요도(보통 1 · 중요 2 · 핵심 3)를 가중치로 씁니다. 설정 → 통계에서 부분 점수를 켜면 시간·수면 습관을 채운 비율만큼 점수로 칩니다.</p>
    <h4>휴식일</h4><p>그날은 달성률과 연속 기록에서 빠집니다. 오늘 화면의 '휴식일' 또는 주간 표의 날짜를 눌러 지정합니다.</p>
    <h4>보관 · 기간 한정</h4><p>보관하거나 종료일이 지나면 목록에서 빠지지만 지난 기록은 통계에 남습니다. 삭제하면 기록도 사라집니다.</p>
    <h4>D-day 연동</h4><p>습관을 D-day에 연결하면 남은 목표, 최근 4주 속도로 본 예상, 하루 필요량을 보여 줍니다.</p>
    <h4>손동작</h4><p>오늘 화면을 좌우로 밀면 날짜 이동 · 습관 이름을 누르면 상세 · 체크 후 5초 안에 '되돌리기' · 설정 → 습관에서 손잡이를 끌어 순서 변경</p>
    <h4>동기화</h4><p>같은 GitHub 토큰을 넣은 기기끼리 비공개 Gist로 맞춰집니다. 변경은 15초씩 묶어 올리고, 바뀐 게 없으면 호출 한도를 쓰지 않습니다.</p></div>`;
  return `<div class="card"><div class="kv"><span>버전</span><span>${VER}</span></div><div class="kv"><span>데이터</span><span>이 기기 · GitHub Gist</span></div></div>`;
}
function vSet() {
  const wide = innerWidth >= 900, sub = setSub || (wide ? 'habits' : null), it = SET_ITEMS.find(x => x[0] === sub);
  const list = `<div class="card list setl">${SET_ITEMS.map(([k, l, f]) => `<a class="srow setr ${sub === k ? 'on' : ''}" href="#set=${k}"><span class="grow">${l}</span><span class="sub">${esc(f())}</span>${I.r}</a>`).join('')}</div>`;
  if (wide) return `<header class="top"><h1>설정</h1></header><div class="setw">${list}<div><h2 style="margin-top:0">${it ? it[1] : ''}</h2>${it ? setPage(sub) : ''}</div></div>`;
  if (!it) return `<header class="top"><h1>설정</h1></header>${list}`;
  return `<header class="top"><div><a class="btn sm" href="#set">${I.l.replace('<svg', '<svg style="width:.9rem;height:.9rem;vertical-align:-2px"')} 설정</a><h1 style="margin-top:.6rem">${it[1]}</h1></div></header>${setPage(sub)}`;
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
    <div class="rp-s">${hr.map(x => `<div class="r"><span>${esc(x.h.name)}</span><i style="width:${x.r * 40}mm;background:var(--u-${x.h.cat})"></i><em>${fk(x.dn)}/${x.n}${x.u} · ${Math.round(x.r * 100)}%</em></div>`).join('') || '<div style="color:#999">기록 없음</div>'}</div>
  </div>`;
}
function diaryPage(m) {
  const D = monthDays(m), t = today(), past = D.filter(d => d <= t), [y, mo] = m.split('-').map(Number), off = pd(D[0]).getDay();
  const hs = habits().filter(h => inRange(h, D)), sl = hs.find(h => h.type === 'sleep'), tm = hs.find(h => h.type === 'time');
  const rates = past.map(dayRate).filter(r => r != null), avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0;
  const perfect = past.filter(d => dayRate(d) === 1).length, dd = ddays().find(x => x.date >= D[0]);
  const cells = '<div class="dc e"></div>'.repeat(off) + D.map(d => {
    const r = d <= t ? rateOf(d) : null, rest = isRest(d), w = pd(d).getDay();
    return `<div class="dc ${w === 0 ? 'sun' : ''}"><span class="dn">${+d.slice(8)}</span>${r && r[2] === 1 ? '<i class="stamp">다 함</i>' : ''}
      ${rest ? '<span class="dl">휴식</span>' : r ? `<span class="sq">${'<i class="f"></i>'.repeat(r[0])}${'<i></i>'.repeat(r[1] - r[0])}</span>` : ''}
      ${tm && val(tm, d) ? `<span class="dl">${esc(tm.name)} ${hmS(val(tm, d))}</span>` : ''}${sl && val(sl, d) ? `<span class="dl">수면 ${hmS(slDec(val(sl, d)).dur)}</span>` : ''}
      ${dd && dd.date === d ? `<span class="dl dd">${esc(dd.name)}</span>` : ''}</div>`;
  }).join('');
  const hr = hs.map(h => { const [k, n] = hStat(h, past); return { h, r: n ? k / n : 0 }; });
  return `<div class="page dp">
    <div class="dp-h"><div><span class="dp-y">${y}</span><h1>${mo}<small>월</small></h1></div>
      <div class="dp-m"><span>평균 달성 <b>${avg}%</b></span><span>다 한 날 <b>${perfect}일</b></span>${dd ? `<span>${esc(dd.name)} <b>${dd.date.slice(5).replace('-', '.')}</b></span>` : ''}</div></div>
    <div class="dp-cal">${[...WD].map((w, i) => `<div class="dw ${i === 0 ? 'sun' : ''}">${w}</div>`).join('')}${cells}</div>
    <h4>습관</h4>
    <div class="dp-hb">${hr.map(x => `<div class="r"><span>${esc(x.h.name)}</span><span class="pb"><i class="${x.h.cat}" style="width:${x.r * 100}%"></i></span><em>${Math.round(x.r * 100)}%</em></div>`).join('') || '<div>기록 없음</div>'}</div>
    <div class="dp-f">${y}.${pad(mo)}</div>
  </div>`;
}
function openPrint(html) {
  const p = $('#print');
  p.innerHTML = `<div class="pbar-top"><button class="btn" data-act="pclose">닫기</button><button class="btn pri" data-act="pprint">인쇄</button></div>${html}`;
  p.classList.add('show'); fitReport();
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

// 목표 입력칸: 시간 습관은 시·분, 그 외는 숫자 (둘 다 그려 두고 기록 방식에 따라 보이기)
const amtIn = (id, v, unit, ph) => `<div class="inl amt-n"><input id="${id}" type="number" inputmode="numeric" min="1" value="${v || ''}" placeholder="${ph}"><span class="u-lbl">${unit}</span></div>
  <div class="inl amt-t"><input id="${id}-h" type="number" inputmode="numeric" min="0" value="${v ? Math.floor(v / 60) : ''}" placeholder="0"><span>시간</span><input id="${id}-m" type="number" inputmode="numeric" min="0" max="59" value="${v ? v % 60 : ''}" placeholder="0"><span>분</span></div>`;
const amtVal = (id, time) => time ? (+($(`#${id}-h`).value || 0)) * 60 + (+($(`#${id}-m`).value || 0)) : +($(`#${id}`).value || 0);
function habitDlg(h) {
  const n = !h;
  h = h || { name: '', cat: 'life', type: 'check', target: 1, days: [0, 1, 2, 3, 4, 5, 6], freq: 'days', per: 3, c: today() };
  const at = amtType(h), ddl = ddays().filter(x => x.date >= today() || x.id === h.dd), advN = [h.note, wOf(h) > 1, h.stretch, h.end, h.dd].filter(Boolean).length;
  openDlg(`<h3>${n ? '습관 추가' : '습관 편집'}</h3>
    <div class="fld"><span>이름</span><input id="f-name" value="${esc(h.name)}" maxlength="30" placeholder="예: 스트레칭"></div>
    <div class="fld"><span>분류</span>${seg('cat', [['life', '일상'], ['study', '공부']], h.cat)}</div>
    <div class="fld"><span>기록 방식</span>${seg('type', [['check', '완료'], ['count', '횟수'], ['time', '시간'], ['clock', '시각'], ['sleep', '수면']], h.type)}</div>
    <div class="fld" id="f-un"><span>단위</span><input id="f-unitn" maxlength="6" placeholder="회" value="${esc(h.unit || '')}"></div>
    <div class="fld" id="f-tg"><span>하루 목표 (최소)</span>${amtIn('f-target', at && !wkAmt(h) ? h.target : '', '', 30)}</div>
    <div class="fld" id="f-sl"><span>목표 수면 시간</span><div class="inl"><input id="f-slh" type="number" inputmode="decimal" step="0.5" min="1" max="14" value="${h.type === 'sleep' ? h.target / 60 : 7}"><span>시간 이상</span></div>
      <span style="margin-top:.7rem">취침 목표 시각 (선택 · 비우면 없음)</span><input id="f-slb" type="time" value="${h.type === 'sleep' && h.bt != null ? hh2(h.bt) : ''}"></div>
    <div class="fld" id="f-tt"><span>목표 시각 (이 시각 이전이면 달성)</span><input id="f-ttime" type="time" value="${hh2(h.type === 'clock' ? h.target : 390)}"></div>
    <div class="fld" id="f-freq"><span>빈도</span>${seg('freq', [['days', '요일 지정'], ['week', '주 n회']], weekly(h) ? 'week' : 'days')}</div>
    <div class="fld" id="f-per"><span>주간 목표</span><div class="inl"><input id="f-pern" type="number" inputmode="numeric" min="1" max="7" value="${h.per || 3}"><span id="f-perunit">회 / 주 (일~토)</span></div></div>
    <div class="fld" id="f-wt"><span>주간 목표 (최소 · 일~토 합계)</span>${amtIn('f-wtn', wkAmt(h) ? h.target : '', h.unit || '회', 10)}<small style="display:block;margin-top:.35rem">하루 목표 없이 이번 주 합계로 판정합니다. 하루에 몰아서 해도 인정됩니다.</small></div>
    <div class="fld" id="f-days"><span>요일</span><div class="days">${WDO.map(i => `<button type="button" data-act="dtog" data-d="${i}" class="${h.days.includes(i) ? 'on' : ''}">${WD[i]}</button>`).join('')}</div></div>
    <button type="button" class="btn more" data-act="adv" data-n="${advN}">더 보기 · 설명, 중요도, 도전 목표, 기간, D-day${advN ? ` (${advN}개 설정됨)` : ''}</button>
    <div id="f-adv" hidden>
    <div class="fld"><span>설명 (선택)</span><textarea id="f-note" rows="2" maxlength="80" placeholder="예: 80분, 채점까지">${esc(h.note || '')}</textarea></div>
    <div class="fld"><span>중요도</span>${seg('w', [['1', '보통'], ['2', '중요'], ['3', '핵심']], String(wOf(h)))}</div>
    <div class="fld" id="f-st"><span>도전 목표 (선택)</span>${amtIn('f-str', h.stretch || '', h.unit || '회', '')}<small style="display:block;margin-top:.35rem">최소 목표만 채워도 달성입니다. 도전 목표까지 채우면 진하게 표시됩니다.</small></div>
    <div class="fld"><span>기간</span><div class="inl"><input id="f-c" type="date" value="${h.c}"><span class="sub">~</span><input id="f-end" type="date" value="${h.end || ''}"></div><small style="display:block;margin-top:.35rem">종료일은 선택입니다. 지나면 자동으로 보관되고 기록은 통계에 남습니다.</small></div>
    <div class="fld"><span>D-day 연동 (선택)</span><select id="f-dd"><option value="">없음</option>${ddl.map(x => `<option value="${x.id}"${x.id === h.dd ? ' selected' : ''}>${esc(x.name)} · ${md(x.date)}</option>`).join('')}</select>${ddl.length ? '' : '<small style="display:block;margin-top:.35rem">설정 → D-day에서 먼저 추가하세요.</small>'}</div>
    </div>
    <div class="dbtns">${n ? '' : `<button class="btn danger" data-act="hdel" data-id="${h.id}">삭제</button>${archived(h) ? `<button class="btn" data-act="hrest" data-id="${h.id}">복원</button>` : `<button class="btn" data-act="harch" data-id="${h.id}">보관</button>`}`}<span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="hsave" data-id="${n ? '' : h.id}">저장</button></div>`);
  updForm();
}
function valDlg(h, d) {
  const v = val(h, d), clk = h.type === 'clock', sl = h.type === 'sleep', x = slDec(v);
  openDlg(`<h3>${esc(h.name)}</h3><p class="sub" style="margin:-.6rem 0 1rem">${tipDate(d)} · ${sl ? `목표 ${fmtMin(h.target)} 이상 · 기상한 날짜 기준` : clk ? `목표 ${hhmm(h.target)} 이전` : wkAmt(h) ? `이번 주 ${wkProg(h, d)}` : `목표 ${fmtGoal(h, h.target)}`}</p>
    <div class="fld">${sl ? `<div class="inl"><span class="sub">취침</span><input id="f-vb" type="time" value="${x ? hh2(x.b) : ''}"><span class="sub">기상</span><input id="f-v" type="time" value="${x ? hh2(x.w) : ''}"></div>` : clk ? `<input id="f-v" type="time" value="${v > 1 ? hh2(v - 1) : ''}">` : h.type === 'time' ? `<div class="inl"><input id="f-vh" type="number" inputmode="numeric" min="0" value="${v ? Math.floor(v / 60) : ''}" placeholder="0"><span>시간</span><input id="f-v" type="number" inputmode="numeric" min="0" max="59" value="${v ? v % 60 : ''}" placeholder="0"><span>분</span></div>` : `<div class="inl"><input id="f-v" type="number" inputmode="numeric" min="0" value="${v || ''}" placeholder="0"><span>${esc(unitOf(h))}</span></div>`}</div>
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
  const ty = segVal('type'), cnt = ty === 'count', wk = cnt || segVal('freq') === 'week', amt = ty === 'count' || ty === 'time', tm = ty === 'time';
  $('#f-freq').hidden = cnt;
  $('#f-un').hidden = !cnt;
  $('#f-tg').hidden = !amt || wk;
  $('#f-tt').hidden = ty !== 'clock';
  $('#f-sl').hidden = ty !== 'sleep';
  $('#f-st').hidden = !amt;
  $('#f-per').hidden = !wk || amt; $('#f-wt').hidden = !wk || !amt; $('#f-days').hidden = wk;
  $$('#dlg .amt-n').forEach(e => e.hidden = tm); $$('#dlg .amt-t').forEach(e => e.hidden = !tm);
  $$('#dlg .u-lbl').forEach(e => e.textContent = $('#f-unitn').value.trim() || '회');
  $('#f-perunit').textContent = ty === 'clock' ? '일 / 주 (목표 시각 이전에 한 날)' : ty === 'sleep' ? '일 / 주 (목표를 지킨 날)' : '회 / 주 (일~토)';
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
  R.dataset.chart = p.chart || 'bar';
  R.dataset.style = p.style || 'card';
  R.dataset.heatst = p.heatSt || 'plain';
  R.dataset.mark = p.mark || 'box';
  R.dataset.ink = p.ink === false ? 'off' : 'on';
  R.dataset.sketch = p.sketch ? 'on' : 'off';
  $('#tc').content = getComputedStyle(R).getPropertyValue('--bg').trim();
}
mq.addEventListener?.('change', applyPrefs);
function setPref(o, live) {
  S.prefs = { ...P(), ...o, skv: 1, u: now() };
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
  $$('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === view || (a.dataset.v === 'today' && view === 'week')));
  $('#main').className = 'v-' + view;
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
      const x = $('#f-v').value, xb = $('#f-vb')?.value;
      if (h.type === 'sleep' && (!x || !xb)) return toast('취침과 기상 시각을 모두 입력하세요');
      const nv = h.type === 'sleep' ? slEnc(toMin(xb), toMin(x)) : h.type === 'clock' ? (x ? toMin(x) + 1 : 0) : h.type === 'time' ? (+($('#f-vh').value || 0)) * 60 + (+x || 0) : Math.max(0, Math.round(+x || 0));
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
    case 'go': location.hash = b.dataset.h; break;
    case 'adv': { const box = $('#f-adv'); box.hidden = !box.hidden; b.textContent = box.hidden ? '더 보기 · 설명, 중요도, 도전 목표, 기간, D-day' : '접기'; break; }
    case 'clean': { const before = JSON.stringify(S).length; S = merge(S, {}); commit(); toast(`정리했습니다 · ${(before / 1024).toFixed(1)} → ${(JSON.stringify(S).length / 1024).toFixed(1)} KB`); break; }
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
      if (p.dataset.f.startsWith('pref:')) { const k = p.dataset.f.slice(5), v = b.dataset.v; setPref({ [k]: k === 'weight' ? +v : ['partial', 'flip', 'ink', 'sketch'].includes(k) ? v === '1' : v }); break; }
      if (p.dataset.f === 'rng') { rng.m = b.dataset.v; render(); break; }
      if (p.dataset.f === 'htab') { hTab = b.dataset.v; render(); break; }
      $$('button', p).forEach(x => x.classList.toggle('on', x === b));
      if (p.dataset.f === 'type' || p.dataset.f === 'freq') updForm();
      break;
    }
    case 'hedit': habitDlg(h); break;
    case 'dtog': b.classList.toggle('on'); break;
    case 'dclose': dlg.close(); break;
    case 'hsave': {
      const name = $('#f-name').value.trim(), type = segVal('type'), tm = type === 'time';
      const days = $$('#dlg .days .on').map(x => +x.dataset.d);
      const freq = type === 'count' ? 'week' : segVal('freq'), amt = (type === 'count' || tm) && freq === 'week';
      const target = type === 'check' ? 1 : type === 'sleep' ? Math.round(Math.max(1, Math.min(14, +$('#f-slh').value || 7)) * 60) : type === 'clock' ? toMin($('#f-ttime').value || '06:30')
        : Math.max(1, Math.round(amtVal(amt ? 'f-wtn' : 'f-target', tm) || (amt ? (tm ? 600 : 10) : tm ? 30 : 1)));
      if (!name) return toast('이름을 입력하세요');
      const per = Math.max(1, Math.min(7, Math.round(+$('#f-pern').value || 1)));
      if (freq === 'days' && !days.length) return toast('요일을 하나 이상 고르세요');
      const str = (type === 'count' || tm) ? Math.round(amtVal('f-str', tm)) : 0, c = $('#f-c').value || today(), end = $('#f-end').value || null;
      if (end && end < c) return toast('종료일이 시작일보다 빠릅니다');
      const o = { name, note: $('#f-note').value.trim(), cat: segVal('cat'), w: +segVal('w') || 1, type, target, stretch: str > target ? str : null, unit: type === 'count' ? $('#f-unitn').value.trim() || null : null,
        bt: type === 'sleep' && $('#f-slb').value ? toMin($('#f-slb').value) : null, days: freq === 'week' ? [0, 1, 2, 3, 4, 5, 6] : days, freq, per, c, end, dd: $('#f-dd').value || null, link: '', u: now() };
      if (h) Object.assign(h, o);
      else S.habits.push({ id: uid(), o: Math.max(0, ...S.habits.map(x => x.o)) + 1, ...o });
      dlg.close(); commit(); break;
    }
    case 'hdel': if (confirm(`'${h.name}' 습관을 삭제할까요?\n지난 기록도 통계에서 사라집니다. 기록을 남기려면 '보관'을 사용하세요.`)) habitU(h, `'${h.name}' 삭제됨`, () => { h.del = true; h.u = now(); dlg.close(); commit(); }); break;
    case 'harch': habitU(h, `'${h.name}' 보관됨 · 지난 기록은 통계에 남습니다`, () => { h.off = [...(h.off || []), [today(), null]]; h.u = now(); dlg.close(); commit(); }); break;
    case 'hrest': habitU(h, `'${h.name}' 복원됨`, () => {
      const r = (h.off || []).find(x => !x[1]); if (r) r[1] = today();
      h.off = (h.off || []).filter(x => x[0] !== x[1]); if (ended(h)) h.end = null; h.u = now();
      if (dlg.open) dlg.close(); commit();
    }); break;
    case 'hup': case 'hdn': {
      const l = habits().filter(x => !archived(x)), i = l.indexOf(h), j = a === 'hup' ? i - 1 : i + 1;
      if (l[j]) { [h.o, l[j].o] = [l[j].o, h.o]; h.u = l[j].u = now(); commit(); }
      break;
    }
    case 'tok': {
      const v = $('#tok').value.trim(); if (!v) return toast('토큰을 입력하세요');
      cfg = { token: v }; ls(CFG, cfg); render(); sync(true); break;
    }
    case 'untok': if (confirm('동기화를 해제할까요? 이 기기의 데이터는 유지됩니다.')) { cfg = {}; syncMsg = ''; ls(CFG, cfg); render(); } break;
    case 'sync': sync(true); break;
    case 'fontpick': $('#fontfile').click(); break;
    case 'fontdel': if (confirm('내 폰트 파일을 삭제할까요?')) delCustomFont(); break;
    case 'theme': { const th = THEMES[+b.dataset.i]; setPref({ life: th[1], study: th[2], accent: th[3] }); break; }
    case 'preset-reset': if (confirm('디자인 설정을 기본값으로 되돌릴까요?')) { S.prefs = { ...DEF_P, u: now() }; commit(); } break;
    case 'export': exportData(); break;
    case 'import': $('#file').click(); break;
    case 'diary': openPrint(diaryPage(view === 'stats' && rng.m === 'month' ? ym : today().slice(0, 7))); break;
    case 'analog': setPref({ chart: 'pencil', heatSt: 'pencil', mark: 'bujo', flip: true, ink: true, style: 'note', sketch: true }); toast('아날로그 설정을 적용했습니다'); break;
    case 'report': openReport(view === 'stats' && rng.m === 'month' ? ym : today().slice(0, 7)); break;
    case 'pclose': $('#print').classList.remove('show'); break;
    case 'pprint': window.print(); break;
  }
});
const prefVal = t => t.dataset.pref === 'size' ? +t.value : t.value;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.pref) { setPref({ [t.dataset.pref]: prefVal(t) }, true); if (t.dataset.pref === 'size') $('#fsv').textContent = t.value + 'px'; return; }
  if (t.id === 'f-unitn') $$('#dlg .u-lbl').forEach(e => e.textContent = t.value.trim() || '회');
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.pref) { setPref({ [t.dataset.pref]: prefVal(t) }); return; }
  if (t.dataset.sleep) {
    const h = S.habits.find(x => x.id === t.dataset.sleep), [ib, iw] = $$(`[data-sleep="${h.id}"]`);
    if (ib.value && iw.value) setValU(h, cur, slEnc(toMin(ib.value), toMin(iw.value)));
    else if (!ib.value && !iw.value) setValU(h, cur, 0);
    return; // 하나만 입력된 경우 나머지를 기다림
  }
  if (t.id === 'rng-a' || t.id === 'rng-b') { rng[t.id === 'rng-a' ? 'a' : 'b'] = t.value || null; render(); return; }
  if (t.id === 'devname') { cfg.dev = t.value.trim() || null; ls(CFG, cfg); toast('기기 이름을 저장했습니다'); return; }
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
// 설정 습관 목록: 손잡이를 끌어 순서 변경
let drag = null;
document.addEventListener('pointerdown', e => {
  const hd = e.target.closest?.('[data-drag]'); if (!hd) return;
  const rowEl = hd.closest('.srow');
  drag = { rowEl, list: rowEl.parentElement };
  rowEl.classList.add('dragging'); hd.setPointerCapture?.(e.pointerId); e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const { rowEl, list } = drag, rows = [...list.children].filter(x => x !== rowEl && x.classList.contains('srow'));
  const after = rows.find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
  if (after) { if (after !== rowEl.nextSibling) list.insertBefore(rowEl, after); } else if (list.lastElementChild !== rowEl) list.appendChild(rowEl);
});
const endDrag = () => {
  if (!drag) return;
  const ids = [...drag.list.querySelectorAll('[data-drag]')].map(x => x.dataset.drag);
  drag.rowEl.classList.remove('dragging'); drag = null;
  let ch = false;
  ids.forEach((id, i) => { const h = S.habits.find(x => x.id === id); if (h && h.o !== i + 1) { h.o = i + 1; h.u = now(); ch = true; } });
  if (ch) commit();
};
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
// 오늘 화면: 좌우로 밀어 날짜 이동 (왼쪽 → 다음 날, 오른쪽 → 이전 날)
let sw = null;
$('#main').addEventListener('touchstart', e => {
  sw = view === 'today' && e.touches.length === 1 && !e.target.closest('input,button,select,textarea,.step') ? [e.touches[0].clientX, e.touches[0].clientY] : null;
}, { passive: true });
$('#main').addEventListener('touchend', e => {
  if (!sw) return;
  const t = e.changedTouches[0], dx = t.clientX - sw[0], dy = t.clientY - sw[1]; sw = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 50) { cur = addD(cur, dx < 0 ? 1 : -1); render(); }
}, { passive: true });
let rzT; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (view === 'set') softRender(); }, 200); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { softRender(); sync(); }
  else if (cfg.dirty) sync(true); // 앱을 떠날 때 남은 변경만 바로 업로드
});
addEventListener('online', () => { if (cfg.dirty) sync(true); });

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
