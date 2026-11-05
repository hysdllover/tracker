# 습관 트래커

일상·공부 습관 체크, 주간 보기, 습관별 상세 통계, D-day, A4 월간 리포트. 아이폰·아이패드용 PWA.

## 설치
1. 저장소 Settings → Pages → Branch `main` / `(root)` → Save
2. 아이폰·아이패드 Safari에서 `https://hysdllover.github.io/tracker/` 접속 → 공유 → 홈 화면에 추가

## 동기화 (GitHub Gist)
1. GitHub → Settings → Developer settings → Personal access tokens
   - Fine-grained: Account permissions → Gists: Read and write
   - 또는 Classic: `gist` 권한만 체크
2. 앱 설정 → 동기화에 토큰 입력 (두 기기 모두 같은 토큰)
3. 비공개 Gist `habit-tracker.json`이 자동 생성·공유됨. 앱 실행·복귀·수정 시 자동 동기화

토큰은 각 기기의 브라우저 저장소에만 보관되며 저장소에 올라가지 않습니다.

## 홈 화면 위젯 (Scriptable)
앱의 Gist 동기화가 켜져 있어야 합니다.

1. App Store에서 **Scriptable** 설치
2. Safari에서 [`widget/habit-widget.js`](widget/habit-widget.js)를 열고 → 오른쪽 위 **Raw** → 전체 선택 후 복사
3. Scriptable → `+` → 붙여넣기 → 이름을 `습관 트래커`로 저장
4. 스크립트를 한 번 실행 → 앱과 같은 토큰 입력 (Scriptable 키체인에만 저장)
5. 홈 화면 길게 누르기 → `+` → Scriptable → 크기 선택(중간 권장) → 위젯 길게 눌러 **위젯 편집** → Script: `습관 트래커`

- 표시: 오늘 진행률, 습관별 체크, 최근 4주 잔디, 가장 가까운 D-day
- 위젯을 누르면 앱이 열립니다. iOS가 15분 이상 간격으로 새로 고칩니다.
