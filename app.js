'use strict';
/* ========== util ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'ht.data', CFG = 'ht.cfg', TMR = 'ht.timer';
const FILE = 'habit-tracker.json', DESC = 'habit-tracker-sync';
const WD = '일월화수목금토';
const PAL = ['#B5C7DE', '#D4C5E2', '#B8D4C2', '#EBCFB8', '#E6C3C8', '#C3D8D6', '#E2DCB5', '#C9C4BD'];
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
      H('공부', 'study', 'time', 120, 5, { link: 'all' }),
    ],
    subjects: [
      { id: uid(), name: '영어', color: PAL[0], o: 1, u },
      { id: uid(), name: '수학', color: PAL[1], o: 2, u },
    ],
    sessions: [], logs: {}, u,
  };
}
let S = ls(KEY) || seed();
let cfg = ls(CFG) || {};
let memo = null;

const habits = () => S.habits.filter(h => !h.del).sort((a, b) => a.o - b.o);
const subjects = () => S.subjects.filter(s => !s.del).sort((a, b) => a.o - b.o);
const subj = id => S.subjects.find(s => s.id === id);
function studyMap() {
  if (memo) return memo;
  memo = {};
  for (const s of S.sessions) {
    if (s.del) continue;
    const m = memo[s.d] || (memo[s.d] = { all: 0 });
    m.all += s.min; m[s.sid] = (m[s.sid] || 0) + s.min;
  }
  return memo;
}
function val(h, d) {
  if (h.type === 'time' && h.link) return studyMap()[d]?.[h.link] || 0;
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

/* ========== timer ========== */
let T = ls(TMR) || {};
T = { mode: 'sw', sid: null, acc: 0, start: null, phase: 'focus', focus: 25, brk: 5, ...T };
const saveT = () => ls(TMR, T);
const elapsed = () => T.acc + (T.start ? now() - T.start : 0);
const tActive = () => !!(T.start || T.acc);
let actx;
function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} }
function beep() {
  if (!actx) return;
  try {
    [0, .35].forEach(t => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(.0001, actx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.2, actx.currentTime + t + .02);
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + t + .3);
      o.start(actx.currentTime + t); o.stop(actx.currentTime + t + .32);
    });
  } catch (e) {}
}
function addSession(min) {
  const s = subj(T.sid);
  S.sessions.push({ id: uid(), sid: T.sid, d: today(), min, u: now() });
  commit();
  toast(`${s ? s.name : '공부'} ${fmtMin(min)} 기록`);
}
function resetT() { T.acc = 0; T.start = null; T.phase = 'focus'; saveT(); }
const clk = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};
function tick() {
  if (T.mode === 'pomo' && tActive()) {
    const lim = (T.phase === 'focus' ? T.focus : T.brk) * 60000;
    if (elapsed() >= lim) {
      if (T.phase === 'focus') { T.phase = 'brk'; T.acc = 0; T.start = now(); saveT(); beep(); addSession(T.focus); }
      else { resetT(); beep(); toast('휴식 끝 · 다음 집중을 시작하세요'); render(); }
      return;
    }
  }
  const c = $('#clock'); if (!c) return;
  const e = elapsed();
  if (T.mode === 'pomo') {
    const lim = (T.phase === 'focus' ? T.focus : T.brk) * 60000;
    c.textContent = clk(lim - e);
    $('#phase').textContent = T.phase === 'focus' ? '집중' : '휴식';
    const p = $('#prog'); if (p) p.style.strokeDashoffset = 691.15 * (1 - Math.min(1, e / lim));
  } else {
    c.textContent = clk(e);
    $('#phase').textContent = tActive() ? (T.start ? '기록 중' : '일시정지') : '';
  }
  $('#tstart').textContent = T.start ? '일시정지' : tActive() ? '계속' : '시작';
}
setInterval(tick, 1000);

/* ========== views ========== */
let view = location.hash.slice(1) || 'today';
let cur = today(), lastToday = today();
let ym = today().slice(0, 7);

function ring(r, label) {
  const C = 150.8;
  return `<div class="ring"><svg viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" stroke="var(--line)" stroke-width="3"/>
    <circle cx="29" cy="29" r="24" stroke="var(--life-ink)" stroke-width="3" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - r)}" opacity=".7"/></svg><span>${label}</span></div>`;
}
function row(h, d) {
  const v = val(h, d), t = goal(h), ok = v >= t, st = streak(h);
  const unit = h.type === 'time' ? '분' : h.type === 'count' ? '회' : '';
  const meta = [];
  if (h.type !== 'check') meta.push(`목표 ${t}${unit}`);
  if (h.link) meta.push('타이머 연동');
  if (h.days.length < 7) meta.push([1, 2, 3, 4, 5, 6, 0].filter(i => h.days.includes(i)).map(i => WD[i]).join(''));
  if (st) meta.push(`${st}일 연속`);
  let ctl;
  if (h.type === 'check') ctl = `<button class="chk ${ok ? 'on' : ''}" data-act="tog" data-id="${h.id}" aria-label="완료">${I.check}</button>`;
  else if (h.link) ctl = `<span class="val">${Math.round(v)}<small>/${t}${unit}</small></span>`;
  else ctl = `<div class="step"><button class="ib" data-act="inc" data-id="${h.id}" data-n="-1">${I.minus}</button><span class="val">${v}<small>/${t}${unit}</small></span><button class="ib" data-act="inc" data-id="${h.id}" data-n="1">${I.plus}</button></div>`;
  return `<div class="hrow ${h.cat} ${ok ? 'ok' : ''}"><div class="hinfo"><div class="hname">${esc(h.name)}</div><div class="hmeta">${meta.join(' · ') || '매일'}</div></div>${ctl}${h.type !== 'check' ? `<i class="pbar" style="width:${Math.min(1, v / t) * 100}%"></i>` : ''}</div>`;
}
function weekChart(end) {
  const sm = studyMap(), D = [...Array(7)].map((_, i) => addD(end, i - 6));
  const mx = Math.max(60, ...D.map(d => sm[d]?.all || 0));
  return `<div class="wk">${D.map(d => {
    const m = sm[d]?.all || 0;
    return `<div class="${d === end ? 't' : ''}"><span>${m ? short(m) : ''}</span><i style="height:${m / mx * 100}%"></i><span>${WD[pd(d).getDay()]}</span></div>`;
  }).join('')}</div><div class="sub" style="text-align:right;margin-top:8px">합계 ${fmtMin(D.reduce((a, d) => a + (sm[d]?.all || 0), 0))}</div>`;
}
function heat(m) {
  const [y, mo] = m.split('-').map(Number), n = new Date(y, mo, 0).getDate(), off = new Date(y, mo - 1, 1).getDay(), t = today();
  let h = [...WD].map(w => `<div class="wd">${w}</div>`).join('') + '<div></div>'.repeat(off);
  for (let i = 1; i <= n; i++) {
    const d = `${m}-${pad(i)}`;
    let c = 'fu';
    if (d <= t) { const r = dayRate(d); c = r == null ? 'na' : r === 0 ? '' : r < .34 ? 'l1' : r < .67 ? 'l2' : r < 1 ? 'l3' : 'l4'; }
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
    ${ring(r, `${dn}/${hs.length}`)}</header>
  <div class="cols"><section>
    ${hs.length ? grp('life') + grp('study') : '<p class="empty">이 날 예정된 습관이 없습니다.</p>'}
    <h2>한 줄 회고</h2><textarea class="note" id="note" rows="2" placeholder="오늘 하루를 한 줄로">${esc(S.logs[d]?.n?.[0] || '')}</textarea>
  </section><aside>
    <h2>최근 7일 공부</h2><div class="card">${weekChart(d)}</div>
    <h2>${+d.slice(5, 7)}월 달성</h2><div class="card">${heat(d.slice(0, 7))}</div>
  </aside></div>`;
}

function vTimer() {
  const subs = subjects();
  if (!subj(T.sid) || subj(T.sid).del) { T.sid = subs[0]?.id || null; saveT(); }
  const t = today(), list = S.sessions.filter(s => !s.del && s.d === t).reverse();
  const tot = list.reduce((a, s) => a + s.min, 0);
  return `<header class="top"><h1>타이머</h1></header>
  <div class="seg" data-f="mode" style="margin-top:8px"><button data-act="seg" data-v="sw" class="${T.mode === 'sw' ? 'on' : ''}">스톱워치</button><button data-act="seg" data-v="pomo" class="${T.mode === 'pomo' ? 'on' : ''}">뽀모도로</button></div>
  <div class="chips">${subs.map(s => `<button class="chip ${s.id === T.sid ? 'on' : ''}" data-act="sub" data-id="${s.id}" style="--c:${s.color}">${esc(s.name)}</button>`).join('') || '<span class="sub">설정에서 과목을 추가하세요.</span>'}</div>
  <div class="card tm">
    <div class="dial">${T.mode === 'pomo' ? `<svg viewBox="0 0 236 236"><circle cx="118" cy="118" r="110" stroke="var(--line)" stroke-width="2"/><circle id="prog" cx="118" cy="118" r="110" stroke="${T.phase === 'focus' ? 'var(--study-ink)' : 'var(--life-ink)'}" stroke-width="2.5" stroke-dasharray="691.15" stroke-dashoffset="691.15" opacity=".7"/></svg>` : ''}
      <div><div class="clock" id="clock">00:00</div><div class="phase" id="phase"></div></div></div>
    <div class="tbtns"><button class="btn pri" id="tstart" data-act="tstart">시작</button><button class="btn" data-act="tstop">${T.mode === 'pomo' && T.phase === 'brk' ? '휴식 건너뛰기' : '종료·저장'}</button></div>
    ${T.mode === 'pomo' ? `<div class="pset">집중 <input type="number" inputmode="numeric" id="pf" value="${T.focus}" min="1"> 분 · 휴식 <input type="number" inputmode="numeric" id="pb" value="${T.brk}" min="1"> 분</div>` : ''}
  </div>
  <h2>오늘 기록 · ${fmtMin(tot)}</h2>
  <div class="card list">${list.map(s => { const sb = subj(s.sid); return `<div class="srow"><span class="dot" style="--c:${sb?.color || 'var(--sub)'}"></span><span class="grow">${esc(sb && !sb.del ? sb.name : '삭제된 과목')}</span><span>${fmtMin(s.min)}</span><button class="ib" data-act="sdel" data-id="${s.id}" aria-label="삭제">${I.x}</button></div>`; }).join('') || '<p class="empty">아직 기록이 없습니다.</p>'}</div>`;
}

function monthDays(m) {
  const [y, mo] = m.split('-').map(Number);
  return [...Array(new Date(y, mo, 0).getDate())].map((_, i) => `${m}-${pad(i + 1)}`);
}
function vStats() {
  const D = monthDays(ym), past = D.filter(d => d <= today()), sm = studyMap();
  const rates = past.map(dayRate).filter(r => r != null);
  const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0;
  const tot = past.reduce((a, d) => a + (sm[d]?.all || 0), 0);
  const subs = S.subjects.map(s => ({ ...s, m: past.reduce((a, d) => a + (sm[d]?.[s.id] || 0), 0) })).filter(s => s.m > 0).sort((a, b) => b.m - a.m);
  const [y, mo] = ym.split('-').map(Number);
  const hrows = habits().map(h => {
    const sc = past.filter(d => sched(h, d)), dn = sc.filter(d => done(h, d)).length, p = sc.length ? dn / sc.length : 0;
    return `<div class="srow" style="display:block"><div style="display:flex;justify-content:space-between"><span>${esc(h.name)}</span><span class="sub">${dn}/${sc.length}일 · ${streak(h)}일 연속</span></div><div class="hb" style="--c:var(--${h.cat})"><i style="width:${p * 100}%"></i></div></div>`;
  }).join('');
  const wkEnd = ym === today().slice(0, 7) ? today() : D[D.length - 1];
  return `<header class="top"><h1>통계</h1><div class="mnav"><button class="ib" data-act="mon" data-n="-1">${I.l}</button><span>${y}. ${pad(mo)}</span><button class="ib" data-act="mon" data-n="1">${I.r}</button></div></header>
  <div class="tiles" style="margin-top:8px"><div class="tile"><span class="sub">평균 달성률</span><b>${avg}%</b></div><div class="tile"><span class="sub">완벽한 날</span><b>${rates.filter(r => r === 1).length}일</b></div><div class="tile"><span class="sub">공부 시간</span><b>${short(tot)}</b></div></div>
  <div class="grid2"><div>
    <h2>달성 캘린더</h2><div class="card">${heat(ym)}</div>
    <h2>습관별</h2><div class="card list">${hrows || '<p class="empty">습관이 없습니다.</p>'}</div>
  </div><div>
    <h2>7일 공부 (${+wkEnd.slice(5, 7)}/${+wkEnd.slice(8)}까지)</h2><div class="card">${weekChart(wkEnd)}</div>
    <h2>과목 비율</h2><div class="card">${tot ? `<div class="stack">${subs.map(s => `<i style="width:${s.m / tot * 100}%;background:${s.color}"></i>`).join('')}</div>${subs.map(s => `<div class="kv"><span><span class="dot" style="--c:${s.color};display:inline-block;margin-right:6px"></span>${esc(s.name)}</span><span>${fmtMin(s.m)} · ${Math.round(s.m / tot * 100)}%</span></div>`).join('')}` : '<p class="empty">이번 달 공부 기록이 없습니다.</p>'}</div>
    <button class="btn" style="width:100%;margin-top:14px" data-act="report">A4 월간 리포트</button>
  </div></div>`;
}

function vSet() {
  const TY = { check: '완료', count: '횟수', time: '시간' };
  return `<header class="top"><h1>설정</h1></header>
  <div class="grid2"><div>
  <h2>습관</h2><div class="card list">${habits().map((h, i, a) => `<div class="srow"><span class="dot" style="--c:var(--${h.cat})"></span><div class="grow"><div>${esc(h.name)}</div><div class="hmeta">${h.cat === 'life' ? '일상' : '공부'} · ${TY[h.type]}${h.type !== 'check' ? ' ' + h.target + (h.type === 'time' ? '분' : '회') : ''}${h.days.length < 7 ? ' · ' + [1, 2, 3, 4, 5, 6, 0].filter(x => h.days.includes(x)).map(x => WD[x]).join('') : ''}</div></div>
    ${i ? `<button class="ib" data-act="hup" data-id="${h.id}" aria-label="위로">${I.up}</button>` : ''}${i < a.length - 1 ? `<button class="ib" data-act="hdn" data-id="${h.id}" aria-label="아래로">${I.down}</button>` : ''}<button class="ib" data-act="hedit" data-id="${h.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">습관이 없습니다.</p>'}</div>
  <button class="btn add" data-act="hedit">습관 추가</button>
  <h2>과목</h2><div class="card list">${subjects().map(s => `<div class="srow"><span class="dot" style="--c:${s.color}"></span><span class="grow">${esc(s.name)}</span><button class="ib" data-act="sedit" data-id="${s.id}" aria-label="편집">${I.edit}</button></div>`).join('') || '<p class="empty">과목이 없습니다.</p>'}</div>
  <button class="btn add" data-act="sedit">과목 추가</button>
  </div><div>
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
  const D = monthDays(m), t = today(), past = D.filter(d => d <= t), sm = studyMap(), hs = habits();
  const [y, mo] = m.split('-').map(Number);
  const rates = past.map(dayRate).filter(r => r != null);
  const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0;
  const tot = past.reduce((a, d) => a + (sm[d]?.all || 0), 0);
  const subs = S.subjects.map(s => ({ ...s, m: past.reduce((a, d) => a + (sm[d]?.[s.id] || 0), 0) })).filter(s => s.m > 0).sort((a, b) => b.m - a.m);
  const notes = D.filter(d => S.logs[d]?.n?.[0]);
  const head = D.map((d, i) => { const w = pd(d).getDay(); return `<th class="${w === 0 ? 'sun' : ''}">${i + 1}<br>${WD[w]}</th>`; }).join('');
  const body = hs.map(h => {
    const sc = past.filter(d => sched(h, d)), dn = sc.filter(d => done(h, d)).length;
    return `<tr><td class="nm">${esc(h.name)}</td>${D.map(d => `<td>${!sched(h, d) ? '' : `<span class="c ${d <= t && done(h, d) ? h.cat : 's'}"></span>`}</td>`).join('')}<td class="rt">${sc.length ? Math.round(dn / sc.length * 100) + '%' : '-'}</td></tr>`;
  }).join('');
  const mins = `<tr><td class="nm">공부(분)</td>${D.map(d => `<td class="mn">${sm[d]?.all ? Math.round(sm[d].all) : ''}</td>`).join('')}<td class="rt">${short(tot)}</td></tr>`;
  const mx = Math.max(1, ...subs.map(s => s.m));
  return `<div class="page rp">
    <div class="rp-h"><h1>${y}년 ${mo}월 습관 리포트</h1><span>${t} 출력</span></div>
    <div class="rp-t"><div>평균 달성률<b>${avg}%</b></div><div>완벽한 날<b>${rates.filter(r => r === 1).length}일</b></div><div>공부 시간<b>${fmtMin(tot)}</b></div><div>기록한 날<b>${rates.length}일</b></div></div>
    <h4>습관 달성표</h4>
    <table class="hg"><colgroup><col style="width:26mm">${D.map(() => '<col>').join('')}<col style="width:10mm"></colgroup>
      <thead><tr><th class="nm"></th>${head}<th>달성</th></tr></thead><tbody>${body}${mins}</tbody></table>
    <h4>과목별 공부 시간</h4>
    <div class="rp-s">${subs.map(s => `<div class="r"><span>${esc(s.name)}</span><i style="width:${s.m / mx * 45}mm;background:${s.color}"></i><em>${fmtMin(s.m)} · ${Math.round(s.m / tot * 100)}%</em></div>`).join('') || '<div style="color:#999">기록 없음</div>'}</div>
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
    <div class="fld" id="f-lk"><span>타이머 연동</span><select id="f-link"><option value="">없음 (직접 입력)</option><option value="all">전체 공부 시간</option>${subjects().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
    <div class="fld"><span>요일</span><div class="days">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button type="button" data-act="dtog" data-d="${i}" class="${h.days.includes(i) ? 'on' : ''}">${WD[i]}</button>`).join('')}</div></div>
    <div class="dbtns">${n ? '' : `<button class="btn danger" data-act="hdel" data-id="${h.id}">삭제</button>`}<span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="hsave" data-id="${n ? '' : h.id}">저장</button></div>`);
  $('#f-link').value = h.link || '';
  updForm();
}
function updForm() {
  const ty = segVal('type');
  $('#f-tg').hidden = ty === 'check';
  $('#f-lk').hidden = ty !== 'time';
  $('#f-unit').textContent = ty === 'time' ? '분' : '회';
}
function subjDlg(s) {
  const n = !s;
  s = s || { name: '', color: PAL[subjects().length % PAL.length] };
  openDlg(`<h3>${n ? '과목 추가' : '과목 편집'}</h3>
    <div class="fld"><span>이름</span><input id="f-name" value="${esc(s.name)}" maxlength="20" placeholder="예: 국어"></div>
    <div class="fld"><span>색상</span><div class="sw" data-f="color">${PAL.map(c => `<button type="button" data-act="seg" data-v="${c}" class="${c === s.color ? 'on' : ''}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div></div>
    <div class="dbtns">${n ? '' : `<button class="btn danger" data-act="sdelsub" data-id="${s.id}">삭제</button>`}<span></span><button class="btn" data-act="dclose">취소</button><button class="btn pri" data-act="ssave" data-id="${n ? '' : s.id}">저장</button></div>`);
}

/* ========== render ========== */
function render() {
  memo = null;
  if (today() !== lastToday) { if (cur === lastToday) cur = today(); lastToday = today(); }
  $$('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
  $('#main').innerHTML = ({ today: vToday, timer: vTimer, stats: vStats, set: vSet }[view] || vToday)();
  if (view === 'timer') tick();
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
      if (p.dataset.f === 'mode') {
        if (tActive()) return toast('타이머를 먼저 종료하세요');
        T.mode = b.dataset.v; resetT(); render(); break;
      }
      $$('button', p).forEach(x => x.classList.toggle('on', x === b));
      if (p.dataset.f === 'type') updForm();
      break;
    }
    case 'sub': if (tActive()) return toast('타이머를 먼저 종료하세요'); T.sid = id; saveT(); render(); break;
    case 'tstart':
      if (!T.sid) return toast('과목을 먼저 추가하세요');
      unlockAudio();
      if (T.start) { T.acc += now() - T.start; T.start = null; } else T.start = now();
      saveT(); tick(); break;
    case 'tstop': {
      if (T.mode === 'pomo' && T.phase === 'brk') { resetT(); render(); break; }
      const m = Math.floor(elapsed() / 60000);
      if (tActive() && m < 1) toast('1분 미만은 저장되지 않습니다');
      resetT();
      if (m >= 1) addSession(m); else render();
      break;
    }
    case 'sdel': {
      const s = S.sessions.find(x => x.id === id);
      if (s && confirm(`${fmtMin(s.min)} 기록을 삭제할까요?`)) { s.del = true; s.u = now(); commit(); }
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
      const o = { name, cat: segVal('cat'), type, target, days, link: type === 'time' ? $('#f-link').value : '', u: now() };
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
    case 'sedit': subjDlg(S.subjects.find(x => x.id === id)); break;
    case 'ssave': {
      const name = $('#f-name').value.trim(); if (!name) return toast('이름을 입력하세요');
      const s = S.subjects.find(x => x.id === id), o = { name, color: segVal('color'), u: now() };
      if (s) Object.assign(s, o); else S.subjects.push({ id: uid(), o: Math.max(0, ...S.subjects.map(x => x.o)) + 1, ...o });
      dlg.close(); commit(); break;
    }
    case 'sdelsub': {
      const s = S.subjects.find(x => x.id === id);
      if (confirm(`'${s.name}' 과목을 삭제할까요? 기존 기록은 남습니다.`)) { s.del = true; s.u = now(); dlg.close(); commit(); }
      break;
    }
    case 'tok': {
      const v = $('#tok').value.trim(); if (!v) return toast('토큰을 입력하세요');
      cfg = { token: v }; ls(CFG, cfg); render(); sync(); break;
    }
    case 'untok': if (confirm('동기화를 해제할까요? 이 기기의 데이터는 유지됩니다.')) { cfg = {}; syncMsg = ''; ls(CFG, cfg); render(); } break;
    case 'sync': sync(); break;
    case 'export': exportData(); break;
    case 'import': $('#file').click(); break;
    case 'report': openReport(view === 'stats' ? ym : today().slice(0, 7)); break;
    case 'pclose': $('#print').classList.remove('show'); break;
    case 'pprint': window.print(); break;
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'note') {
    const L = S.logs[cur] || (S.logs[cur] = { v: {}, n: ['', 0] });
    L.n = [e.target.value, now()]; commit(true);
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'pf' || t.id === 'pb') {
    if (tActive()) { toast('타이머를 먼저 종료하세요'); render(); return; }
    T[t.id === 'pf' ? 'focus' : 'brk'] = Math.max(1, Math.min(180, Math.round(+t.value || 1))); saveT(); render();
  }
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
sync();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
