// 습관 트래커 홈 화면 위젯 (Scriptable)
// 설치: README의 '홈 화면 위젯' 참고. 앱과 같은 GitHub 토큰(gist 권한)이 필요합니다.
// 크기: 작게 · 중간(권장) · 크게

const APP = 'https://hysdllover.github.io/tracker/';
const FILE = 'habit-tracker.json';
const K_TOKEN = 'ht_token', K_GIST = 'ht_gist';
const CACHE = FileManager.local().joinPath(FileManager.local().documentsDirectory(), 'ht-cache.json');
const WD = '일월화수목금토';

/* ---------- 날짜 ---------- */
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const today = () => ds(new Date());
const wkStart = d => addD(d, -pd(d).getDay()); // 일요일 시작
const hhmm = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;

/* ---------- 앱과 같은 판정 로직 ---------- */
function model(S) {
  const habits = (S.habits || []).filter(h => !h.del).sort((a, b) => a.o - b.o);
  const val = (h, d) => S.logs?.[d]?.v?.[h.id]?.[0] || 0;
  const wkAmt = h => h.freq === 'week' && (h.type === 'count' || h.type === 'time');
  const done = (h, d) => { const v = val(h, d); return h.type === 'clock' ? v > 0 && v - 1 <= h.target : wkAmt(h) ? v > 0 : v >= (h.type === 'check' ? 1 : h.target); };
  const isRest = d => S.rest?.[d]?.[0] === 1;
  const weekly = h => h.freq === 'week';
  const alive = (h, d) => d >= h.c && !(h.off || []).some(([a, b]) => d >= a && (!b || d < b));
  const archived = h => (h.off || []).some(r => !r[1]);
  const sched = (h, d) => !weekly(h) && alive(h, d) && h.days.includes(pd(d).getDay()) && !isRest(d);
  const shown = (h, d) => alive(h, d) && (weekly(h) || h.days.includes(pd(d).getDay()));
  const wkDone = (h, d) => { const s = wkStart(d); let n = 0; for (let i = 0; i < 7; i++) { const x = addD(s, i); if (alive(h, x)) n += wkAmt(h) ? val(h, x) : done(h, x) ? 1 : 0; } return n; };
  const rate = d => { const hs = habits.filter(h => sched(h, d)); return hs.length ? hs.filter(h => done(h, d)).length / hs.length : null; };
  const dday = (S.dday || []).filter(x => !x.del && x.date >= today()).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  return { habits, val, done, isRest, weekly, wkAmt, archived, sched, shown, wkDone, rate, dday };
}

/* ---------- 데이터 ---------- */
async function getToken() {
  if (Keychain.contains(K_TOKEN)) return Keychain.get(K_TOKEN);
  if (config.runsInWidget) return null;
  const a = new Alert();
  a.title = '습관 트래커 위젯';
  a.message = '앱 설정의 동기화에 넣은 것과 같은 GitHub 토큰을 입력하세요.';
  a.addSecureTextField('ghp_… 또는 github_pat_…');
  a.addAction('저장'); a.addCancelAction('취소');
  if (await a.present() === -1) return null;
  const t = a.textFieldValue(0).trim();
  if (t) Keychain.set(K_TOKEN, t);
  return t || null;
}
async function gh(path, token) {
  const r = new Request('https://api.github.com' + path);
  r.headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
  const j = await r.loadJSON();
  if (r.response && r.response.statusCode >= 400) throw new Error(r.response.statusCode === 401 ? '토큰 오류' : 'GitHub ' + r.response.statusCode);
  return j;
}
async function loadData() {
  const fm = FileManager.local();
  const cached = () => fm.fileExists(CACHE) ? JSON.parse(fm.readString(CACHE)) : null;
  const token = await getToken();
  if (!token) return { S: cached(), err: '토큰 필요 · Scriptable에서 한 번 실행하세요' };
  try {
    let id = Keychain.contains(K_GIST) ? Keychain.get(K_GIST) : null;
    if (!id) {
      const list = await gh('/gists?per_page=100', token);
      const f = list.find(g => g.files && g.files[FILE]);
      if (!f) throw new Error('동기화 Gist 없음');
      id = f.id; Keychain.set(K_GIST, id);
    }
    let g;
    try { g = await gh('/gists/' + id, token); }
    catch (e) { Keychain.remove(K_GIST); throw e; }
    const f = g.files[FILE];
    const txt = f.truncated ? await new Request(f.raw_url).loadString() : f.content;
    fm.writeString(CACHE, txt);
    return { S: JSON.parse(txt) };
  } catch (e) {
    return { S: cached(), err: e.message };
  }
}

/* ---------- 색 ---------- */
const DEF = { life: '#8FA0AE', study: '#5F6F80', accent: '#BAC2C9', heat: 'life' };
const C = {
  bg: Color.dynamic(new Color('#F4F5F6'), new Color('#1D2025')),
  text: Color.dynamic(new Color('#3F4853'), new Color('#D9DCDF')),
  sub: Color.dynamic(new Color('#89919A'), new Color('#858C95')),
  h0: Color.dynamic(new Color('#E5E8EB'), new Color('#2E333A')),
};
const tone = (hex, a) => Color.dynamic(new Color(hex, a), new Color(hex, Math.min(1, a * .85)));

/* ---------- 그리기 ---------- */
function txt(st, s, size, color, weight = 'light') {
  const t = st.addText(s);
  t.font = weight === 'thin' ? Font.thinSystemFont(size) : weight === 'regular' ? Font.systemFont(size) : Font.lightSystemFont(size);
  t.textColor = color; t.lineLimit = 1;
  return t;
}
function square(st, size, color) {
  const s = st.addStack();
  s.size = new Size(size, size); s.cornerRadius = 1.5; s.backgroundColor = color;
  return s;
}
function heatGrid(parent, M, P, weeks, cell) {
  const t = today(), start = addD(wkStart(t), -7 * (weeks - 1)), hc = P[P.heat] || P.life;
  const g = parent.addStack(); g.layoutVertically(); g.spacing = 2;
  for (let w = 0; w < weeks; w++) {
    const r = g.addStack(); r.spacing = 2;
    for (let k = 0; k < 7; k++) {
      const d = addD(start, w * 7 + k);
      if (d > t) { square(r, cell, Color.clear()); continue; }
      if (M.isRest(d)) { square(r, cell, tone('#89919A', .18)); continue; }
      const x = M.rate(d);
      square(r, cell, x == null || x === 0 ? C.h0 : tone(hc, x < .34 ? .35 : x < .67 ? .6 : x < 1 ? .85 : 1));
    }
  }
}
function habitList(parent, M, P, max) {
  const t = today();
  const hs = ['life', 'study'].flatMap(c => M.habits.filter(h => h.cat === c && M.shown(h, t))).slice(0, max);
  const box = parent.addStack(); box.layoutVertically(); box.spacing = 5;
  if (!hs.length) { txt(box, '오늘 예정된 습관 없음', 11, C.sub); return; }
  for (const h of hs) {
    const r = box.addStack(); r.centerAlignContent(); r.spacing = 6;
    const ok = M.done(h, t), v = M.val(h, t), col = P[h.cat] || P.life;
    square(r, 9, ok ? new Color(col) : v > 0 ? tone(col, .4) : C.h0);
    txt(r, h.name, 12, ok ? C.sub : C.text);
    r.addSpacer();
    let right = '';
    const hr = m => m >= 60 ? `${(m / 60).toFixed(1).replace(/\.0$/, '')}h` : `${Math.round(m)}m`;
    if (M.wkAmt(h)) right = h.type === 'time' ? `주 ${hr(M.wkDone(h, t))}/${hr(h.target)}` : `주 ${M.wkDone(h, t)}/${h.target}`;
    else if (M.weekly(h)) right = `주 ${M.wkDone(h, t)}/${h.per}`;
    else if (h.type === 'clock') right = v > 1 ? hhmm(v - 1) : '';
    else if (h.type !== 'check') right = `${Math.round(v)}/${h.target}`;
    if (right) txt(r, right, 10, C.sub);
  }
}
function summary(parent, M, big) {
  const t = today(), dt = pd(t);
  const dl = M.habits.filter(h => M.shown(h, t) && !M.weekly(h)), dn = dl.filter(h => M.done(h, t)).length;
  const s = parent.addStack(); s.layoutVertically(); s.spacing = 1;
  txt(s, `${dt.getMonth() + 1}.${dt.getDate()} ${WD[dt.getDay()]}`, 11, C.sub);
  if (M.isRest(t)) { txt(s, '휴식', big, C.text, 'thin'); txt(s, '통계 제외', 10, C.sub); }
  else { txt(s, dl.length ? `${Math.round(dn / dl.length * 100)}%` : '-', big, C.text, 'thin'); txt(s, `${dn}/${dl.length} 완료`, 10, C.sub); }
}
function ddayLine(parent, M) {
  if (!M.dday) return;
  const n = Math.round((pd(M.dday.date) - pd(today())) / 864e5);
  const r = parent.addStack(); r.spacing = 4;
  txt(r, M.dday.name, 10, C.sub);
  txt(r, n === 0 ? 'D-DAY' : `D-${n}`, 10, C.text, 'regular');
}

async function build() {
  const fam = config.widgetFamily || 'medium';
  const { S, err } = await loadData();
  const w = new ListWidget();
  w.backgroundColor = C.bg; w.url = APP;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  w.setPadding(14, 14, 14, 14);
  if (!S) { txt(w, '습관 트래커', 13, C.text, 'regular'); w.addSpacer(4); const m = w.addText(err || '데이터 없음'); m.font = Font.lightSystemFont(11); m.textColor = C.sub; return w; }
  const M = model(S), P = { ...DEF, ...(S.prefs || {}) };

  if (fam === 'small') {
    summary(w, M, 30); w.addSpacer();
    heatGrid(w, M, P, 4, 9); w.addSpacer(6); ddayLine(w, M);
  } else if (fam === 'large') {
    const top = w.addStack(); top.centerAlignContent();
    summary(top, M, 34); top.addSpacer();
    const r = top.addStack(); r.layoutVertically(); heatGrid(r, M, P, 5, 9); r.addSpacer(5); ddayLine(r, M);
    w.addSpacer(14); habitList(w, M, P, 11); w.addSpacer();
  } else {
    const row = w.addStack();
    const L = row.addStack(); L.layoutVertically();
    summary(L, M, 32); L.addSpacer(); heatGrid(L, M, P, 4, 7); L.addSpacer(5); ddayLine(L, M);
    row.addSpacer(16);
    habitList(row, M, P, 6);
  }
  if (err) { w.addSpacer(2); const e = w.addText('저장된 데이터 표시 중 · ' + err); e.font = Font.lightSystemFont(8); e.textColor = C.sub; }
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
