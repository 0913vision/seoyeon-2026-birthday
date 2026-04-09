# 생일 선물상자 게임 - 기술 스택 조사 보고서

작성일: 2026년 4월
프로젝트 참조: `game_design_v5.md`

---

## 0. 요약 (TL;DR)

**권장 스택**

| 영역 | 선택 | 비고 |
|-----|------|-----|
| 게임 엔진 | **Phaser 3.90** | 공식 Vite+TS 템플릿 활용, 아이소메트릭 기본 지원 |
| 빌드 도구 | **Vite 6** | 공식 템플릿 기본 |
| 언어 | **TypeScript 5.x** | 타입 안정성·Claude Code 친화 |
| PWA | **vite-plugin-pwa** | Workbox 기반, Vite 친화 |
| 저장소 | **IndexedDB** (idb-keyval) | localStorage 대신 권장 — 뒤에서 설명 |
| 배포 | **Vercel** 또는 **Netlify** | 무료 HTTPS·자동 배포 |
| 테스트 환경 | **Xcode iOS Simulator** | 아이폰 없이 iOS Safari 디버깅 |
| AI 에셋 | **Scenario.gg** 또는 **Leonardo.ai** | 일관성 있는 게임 에셋 |

**가장 큰 리스크 2개 (먼저 읽으세요)**

1. **iOS Safari 7일 스토리지 만료 정책**: iOS 13.4부터 script-writable storage(localStorage, IndexedDB 등)는 7일 미사용 시 자동 삭제. 8일짜리 게임에 치명적. 홈 화면 추가 시 "완화"되지만 완전히 해결되진 않음. → 대응책 섹션 4 참조
2. **PWA 미설치 시 스토리지 휘발**: 여자친구가 Safari에서만 쓰면 데이터 손실 위험. 반드시 "홈 화면에 추가" 플로우를 첫 진입 시 강제 안내해야 함.

---

## 1. 게임 엔진: Phaser 3

### 1.1 현재 상태 (2026년 4월 기준)

- 최신 버전: **Phaser 3.90.0** (2025년 공개, 활발한 유지보수)
- Phaser Studio Inc.가 상업적으로 개발·유지 중
- 공식 사이트: phaser.io
- GitHub: phaserjs/phaser

### 1.2 이 프로젝트에 적합한 이유

**아이소메트릭 타일맵 네이티브 지원**
- Phaser 3.50부터 `Phaser.Tilemaps.Orientation.ISOMETRIC` 공식 지원
- Tiled 에디터 JSON 연동
- 코드로 직접 아이소메트릭 맵 생성 가능:
  ```javascript
  const mapData = new Phaser.Tilemaps.MapData({
    width: 10, height: 10,
    tileWidth: 64, tileHeight: 32,
    orientation: Phaser.Tilemaps.Orientation.ISOMETRIC,
    format: Phaser.Tilemaps.Formats.ARRAY_2D
  });
  ```
- 별도 플러그인 불필요 (예전 `phaser3-plugin-isometric` 등은 이제 레거시)

**터치·스와이프 지원**
- Pointer Events API 기반 입력 시스템
- 카메라 드래그(스와이프) 구현 간단
- 멀티터치·핀치줌 지원

**실시간 타이머 관리**
- 게임 내부적으로 `this.time.delayedCall()`, `Phaser.Time.Clock` 제공
- 단, 이 프로젝트는 **실시간 기반 타이머**(앱 꺼도 진행)이므로 `Date.now()` 기반 로직이 더 적합 — Phaser의 내장 타이머는 보조 역할

**Claude Code와의 궁합**
- 10년 이상 성숙한 프레임워크 → 훈련 데이터 풍부
- 공식 문서·예제 방대 (phaser.io/examples)
- 최근 Phaser 3.85 기반 400페이지 무료 서적 출간

### 1.3 대안 검토

| 프레임워크 | 평가 | 결론 |
|----------|------|-----|
| **PixiJS** | 렌더러는 빠르지만 게임 프레임워크 기능 부족 (씬·물리·입력 직접 구현) | 이 규모엔 과함 |
| **Three.js** | 3D. 아이소메트릭은 2D 스프라이트라 불필요 | 부적합 |
| **Godot Web Export** | 웹 빌드 크기 큼 (10MB+), PWA 통합 복잡 | 부적합 |
| **순수 Canvas** | 직접 구현 부담 큼 (타일맵·카메라·입력 모두 수동) | 비효율 |
| **Phaser 4** | 2025년 개발 중, 아직 정식 미공개 | 안정성 부족 |

**결론**: Phaser 3 최신 버전이 이 프로젝트에 최적.

---

## 2. 빌드 도구 및 언어

### 2.1 Vite + TypeScript + Phaser 공식 템플릿

**저장소**: `phaserjs/template-vite-ts` (GitHub)

**설치**:
```bash
npx degit phaserjs/template-vite-ts my-birthday-game
cd my-birthday-game
npm install
npm run dev    # 개발 서버 (http://localhost:8080)
npm run build  # 프로덕션 빌드 (dist/)
```

**제공 기능**:
- Vite 기반 HMR(Hot Module Reload) — 즉각 반영
- TypeScript 기본 설정 완료
- 번들 최적화·에셋 경로 처리 자동
- 프로덕션 빌드 크기 자동 압축

### 2.2 TypeScript를 쓰는 이유

- 게임 상태(자원·건물·파츠·타이머)가 많음 → 타입 없으면 실수 빈발
- Phaser 3에 완전한 TypeScript 정의 포함 (`node_modules/phaser/types`)
- Claude Code는 타입 힌트가 있을 때 훨씬 정확한 코드 생성

### 2.3 React 같은 UI 프레임워크 필요한가?

**결론**: **불필요**. Phaser 내부에서 UI도 처리하는 게 간단함.

- 대안으로 `template-react-ts`, `template-vue-ts` 공식 템플릿 존재
- 하지만 이 게임은 UI 복잡도가 높지 않음 (대화창·메뉴·인벤토리 정도)
- React를 넣으면 Phaser ↔ React 브리지를 관리해야 해서 복잡도 증가
- HTML 오버레이가 필요한 부분(예: 증명서·편지 텍스트 입력)은 순수 HTML+CSS로 `div` 오버레이 처리로 충분

---

## 3. PWA 구성

### 3.1 목적

- 아이폰 홈 화면에 "앱처럼" 설치
- 오프라인에서도 마지막 상태 유지
- 전체화면 모드로 브라우저 UI 숨김
- 아이콘·스플래시 화면

### 3.2 권장 도구: vite-plugin-pwa

```bash
npm install -D vite-plugin-pwa
```

**Vite 설정 예시**:
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '생일 선물상자',
        short_name: '선물상자',
        theme_color: '#ffffff',
        icons: [ /* 192x192, 512x512 PNG */ ],
        display: 'standalone',
        orientation: 'portrait'
      }
    })
  ]
}
```

**자동 생성**:
- Service Worker (Workbox 기반)
- Web App Manifest
- 오프라인 캐시 전략

### 3.3 iOS Safari PWA 제약 (매우 중요)

iOS Safari는 WebKit을 강제하며, 모든 iOS 브라우저는 동일한 제약을 공유.

| 항목 | 상태 |
|------|------|
| 설치 | Share → "홈 화면에 추가" (수동, 자동 프롬프트 없음) |
| 전체화면 | 지원 (홈 화면 설치 시) |
| 오프라인 | 지원 (Service Worker) |
| **스토리지 영구성** | **제한적 — 7일 미사용 시 삭제 가능** |
| Push 알림 | iOS 16.4+ & 홈 화면 설치 시만 (EU 제외) |
| Background Sync | **미지원** |
| 자동 설치 프롬프트 | **없음** |

### 3.4 iOS에 맞춰 필요한 커스텀 코드

**홈 화면 추가 안내 UI** (자동 프롬프트 없으므로 수동 안내):
```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = window.navigator.standalone === true

if (isIOS && !isStandalone) {
  // "홈 화면에 추가하세요" 배너 표시
  // Share 아이콘 → Add to Home Screen 안내
}
```

**iOS 메타 태그**:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="선물상자">
<link rel="apple-touch-icon" href="/icon-180.png">
<link rel="apple-touch-startup-image" href="/splash.png">
```

---

## 4. ⚠️ 가장 큰 리스크: iOS 스토리지 만료

### 4.1 문제 설명

iOS 13.4부터 **Intelligent Tracking Prevention(ITP)** 정책으로 script-writable storage는 **7일 미사용 시 자동 삭제**:

- **영향 받는 저장소**: localStorage, IndexedDB, sessionStorage, Cache API, Service Worker 캐시
- **트리거**: 해당 origin을 7일 이상 방문하지 않음
- **결과**: 모든 저장 데이터 소실

### 4.2 이 프로젝트에 왜 치명적인가

- **게임 기간 8일** — 7일 임계값을 넘김
- 여자친구가 Day 1 이후 며칠 게임 안 하면 Day 2에서 "처음부터" 상태 가능
- Day 7~8 사이 포장 타이머(24시간) 대기 중 데이터 손실 가능성

### 4.3 완화 방안

**1단계: 홈 화면 설치 강제 안내**

홈 화면에 추가된 PWA는 **스토리지 정책이 완화**됨 (완전 해결 아니지만 훨씬 안정적):
- Day 1 첫 진입 시 "홈 화면 추가하세요" 팝업 강제
- Safari에서 열고 있으면 튜토리얼 진행 자체를 막기

**2단계: IndexedDB + Storage API persist 요청**

localStorage보다 **IndexedDB가 용량·지속성 면에서 유리** (iOS Safari에서 IndexedDB는 최대 500MB, localStorage는 약 10MB).

```javascript
// 영구 저장 요청 (지원 시)
if (navigator.storage && navigator.storage.persist) {
  const persisted = await navigator.storage.persist()
  console.log(persisted ? '영구 저장 승인' : '일반 저장')
}
```

iOS Safari는 `persist()`를 완전 지원하진 않지만, 호출해둘 가치 있음.

**3단계: 자동 재접속 유도**

- PWA Push 알림(iOS 16.4+) 활용 — 매일 한 번 "초코가 기다려요" 알림
- 단, 이것도 홈 화면 설치 필수

**4단계: 서버 백업 (최후의 수단)**

- 아주 작은 백엔드(Vercel Serverless Function 등)에 진행 상태 JSON 저장
- 로컬 + 서버 이중 저장
- 여자친구 ID는 URL 파라미터 등으로 간이 식별
- 개발 부담 증가하지만 **확실한 안전망**

**5단계: Day 7 → Day 8 사이의 특수 처리**

포장 타이머가 가장 리스크 높은 구간. 대응:
- Day 7 완료 시점에 "상자 포장 시작" 상태를 서버에 저장 (4단계 병용)
- 또는: 타이머 시작 시간을 **URL 파라미터에 인코딩**해서 사용자에게 링크로 제공 (북마크 유도)

### 4.4 권장 조합

최소한: **홈 화면 설치 강제 + IndexedDB 사용 + persist() 호출**

안전하게: 위 + **Vercel Serverless Function 백업**

---

## 5. 저장소 아키텍처

### 5.1 localStorage vs IndexedDB

| 항목 | localStorage | IndexedDB |
|------|--------------|-----------|
| 용량 (iOS Safari) | ~10MB | ~500MB |
| API | 간단 (동기) | 복잡 (비동기) |
| 지속성 | 약함 | 상대적으로 강함 |
| 구조화 데이터 | 문자열만 (JSON 직렬화) | 객체 직접 저장 |

**결론**: IndexedDB 사용 권장. 직접 쓰기 번거로우니 **idb-keyval** 라이브러리 사용.

### 5.2 idb-keyval 예시

```bash
npm install idb-keyval
```

```typescript
import { get, set, del } from 'idb-keyval'

// 저장
await set('gameState', {
  currentDay: 3,
  resources: { wood: 1200, flower: 400 },
  buildings: [...]
})

// 불러오기
const state = await get('gameState')
```

기획서에 명시된 저장 항목(currentDay, resources, buildings, parts, tutorialStep, packagingTimer, boxHarvested)을 단일 객체로 묶어 관리 가능.

### 5.3 타이머 계산 원칙

모든 타이머는 **절대 시간(Date.now())** 기반:

```typescript
// 나쁜 예: 경과 초 누적
let elapsed = 0
setInterval(() => { elapsed += 1 }, 1000)

// 좋은 예: 절대 시간 저장
const startTime = Date.now()
const duration = 2 * 60 * 60 * 1000 // 2시간 (ms)

function checkReady() {
  return Date.now() - startTime >= duration
}
```

앱 꺼져 있어도 `Date.now()`는 정확한 값 반환 → 실시간 진행 구현 가능.

---

## 6. 테스트 환경

### 6.1 아이폰 없이 iOS Safari 테스트

**Xcode iOS Simulator** (무료, 맥 전용)

설치:
1. Mac App Store에서 **Xcode** 설치 (무료, 용량 ~15GB)
2. Xcode 설치 후 `/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app`
3. 또는 Spotlight에서 "Simulator" 검색

사용:
1. Simulator 앱 실행
2. 원하는 iPhone 모델 선택 (iPhone 15/16/17 등)
3. 시뮬레이터 내 Safari 실행 → `http://localhost:5173` 접속
4. 맥 Safari에서 **개발 메뉴 → Simulator → [페이지]** 선택 → 원격 인스펙터 열림

**개발 메뉴 활성화**:
Safari → 설정 → 고급 → "메뉴 막대에서 개발자용 기능 보기" 체크

**주의**:
- Simulator는 "Mac 위에서 동작하는 앱"이라 `localhost`가 Mac의 localhost 가리킴 → 편리
- Simulator Safari는 실기기와 99% 동일 (WebKit 버전 동일)
- PWA 홈 화면 추가 테스트도 가능
- 단, PWA 설치 후 Simulator 재부팅하면 앱 사라질 수 있음

### 6.2 실기기 테스트 대안

아이폰을 직접 못 쓰더라도:
- 친구·가족 아이폰 빌려서 배포된 Vercel URL 열기 (5분이면 충분)
- BrowserStack 무료 체험 (실제 iOS 기기 원격 테스트)
- 직접 아이폰 구매까진 불필요

### 6.3 크롬 개발자도구 반응형 모드의 한계

Chrome DevTools → 반응형 모드로 "아이폰처럼" 보이지만:
- 렌더링 엔진이 **Blink**라서 WebKit과 다름
- PWA 동작, 스토리지 정책, 터치 이벤트 세부 차이
- **보조 도구로만 사용, 최종 검증은 Simulator/실기기**

---

## 7. 배포

### 7.1 Vercel (권장)

- 무료 티어 충분
- GitHub 저장소 연동 → Git push 시 자동 배포
- HTTPS 자동 (PWA 필수)
- 커스텀 도메인 무료
- Vite 프로젝트 자동 감지

배포 플로우:
```bash
# 1. GitHub 저장소 만들기
git init && git add . && git commit -m "initial"
# GitHub 생성 → git remote add origin ... → git push

# 2. vercel.com에서 Import Project → GitHub 선택
# 3. 자동 빌드 시작 → 약 1분 후 https://your-project.vercel.app 제공
```

### 7.2 Netlify (대안)

- 기능 동일, 인터페이스 취향 차이
- 무료 티어 충분

### 7.3 커스텀 도메인 (선택)

- 생일 이벤트용 도메인: `choco-gift.xyz`, `happy24.app` 등
- `.xyz`, `.app` 저렴 (~$10/년)
- Vercel/Netlify에 DNS 연결 간단

### 7.4 서버리스 함수 (백업 용도, 선택)

4.3 4단계 백업 방식 채택 시:
- Vercel Serverless Functions (무료 티어 월 10만 호출)
- 데이터 저장소: Vercel KV (Redis 기반) 또는 Supabase (PostgreSQL, 무료 500MB)

---

## 8. 에셋 제작

### 8.1 AI 이미지 생성 도구 비교

| 도구 | 장점 | 단점 | 추천도 |
|-----|------|------|-------|
| **Scenario.gg** | 게임 에셋 특화, 스타일 일관성 최고 | 유료 (무료 크레딧 있음) | ★★★★★ |
| **Leonardo.ai** | 게임 에셋 프리셋, 무료 크레딧 넉넉 | 일관성 중간 | ★★★★ |
| **Midjourney** | 퀄리티 최상 | 일관성 약함, 월 구독 | ★★★ |
| **Recraft** | 벡터·아이콘 특화, 배경 제거 쉬움 | 게임 전용 아님 | ★★★★ (UI용) |
| **Ideogram** | 텍스트·로고 강함 | 게임 에셋엔 부적합 | ★★ (타이틀용) |

### 8.2 필요 에셋 목록

**건물 스프라이트 (8종)**
- 나무밭, 꽃밭, 채석장, 광산, 수정동굴, 목공방, 세공소, 선물상자
- 상자는 파츠 부착 단계별로 여러 버전 필요 (상자 성장 애니메이션)

**파츠 스프라이트 (24종)**
- 각 파츠 + 상자 부착 위치 참고 이미지

**초코 캐릭터**
- 맵용 정적 스프라이트 1종
- 대화창 아이콘 2~3종 (기본·기쁨·놀람)

**UI 요소**
- 버튼, 메뉴 프레임, 인벤토리 카드, 대화창 배경

**배경·이펙트**
- 맵 타일 (잔디·흙·경로)
- 파티클 (반짝이·꽃잎·불꽃)

**증명서 디자인**
- 양피지 배경
- 왕실 테두리 장식

### 8.3 제작 워크플로우 추천

1. **Scenario 또는 Leonardo로 스타일 레퍼런스 확정** (건물 1~2개 테스트 생성)
2. 스타일 일관성 유지 설정 (동일 프롬프트 + 시드)
3. 건물·파츠 순차 생성
4. **remove.bg** 또는 Photoshop으로 배경 투명화
5. TexturePacker 등으로 스프라이트 시트 패킹 (선택, 성능 최적화용)

### 8.4 초코 에셋 특수 처리

여자친구 실제 강아지 참고 필요:
- 옵션 A: 실제 사진 → AI 이미지-to-이미지 스타일 변환 (Scenario·Midjourney)
- 옵션 B: 특징만 메모해서 프롬프트로 생성 ("브라운 푸들, 흰 가슴털" 등)
- 실제 사진의 품종·색 파악 후 시각적 힌트를 부여해 유사성 확보

---

## 9. 개발 워크플로우 제안

### 9.1 Claude Code 활용 구조

```
birthday-game/
├── src/
│   ├── scenes/         # Phaser 씬 (Day별로 나누거나 통합)
│   │   ├── BootScene.ts
│   │   ├── GameScene.ts
│   │   └── EndingScene.ts
│   ├── entities/       # 건물·자원지·초코 등
│   ├── systems/        # 타이머·저장·상태 관리
│   ├── ui/             # 대화창·메뉴·인벤토리
│   ├── data/           # 파츠 레시피·대사·상수
│   │   ├── parts.ts
│   │   ├── buildings.ts
│   │   └── dialogue.ts  # game_design_v5.md 부록 C 변환
│   └── main.ts
├── public/
│   └── assets/         # 스프라이트·오디오
├── game_design_v5.md   # 기획서 동봉
└── vite.config.ts
```

`game_design_v5.md`를 프로젝트 루트에 두면 Claude Code가 참조 가능.

### 9.2 단계별 개발 순서 (제안)

1. **템플릿 셋업 + Phaser "Hello World"** — 10분
2. **아이소메트릭 맵 렌더링** (정적 타일) — 반나절
3. **건물 배치·터치 상호작용** — 1일
4. **자원 생산·수확 루프** (타이머 기반) — 1일
5. **공방·제작 시스템** — 1일
6. **저장·불러오기** (IndexedDB) — 반나절
7. **Day 진행 로직 + 해금** — 1일
8. **Day 1 튜토리얼 구현** — 1~2일
9. **PWA 설정·iOS 테스트** — 반나절
10. **대화 시스템·초코 연출** — 1일
11. **Day 7 포장 타이머 + Day 8 엔딩** — 1일
12. **에셋 교체·폴리싱** — 2~3일
13. **배포·실기기 테스트·버그 수정** — 1일

**총 예상**: 경험에 따라 10~15일. 에셋 제작 시간 별도.

### 9.3 생일 역산 스케줄

**생일 8일 전까지**: 게임 완성 + 배포 + 최소 1회 실기기 테스트
**생일 9일 전**: 여자친구에게 링크 전달, 홈 화면 추가 유도
**생일 1일**: 접속해서 Day 1 시작

여유 있게 가려면 **생일 2~3주 전**에 개발 시작 권장.

---

## 10. 리스크 매트릭스

| 리스크 | 확률 | 영향 | 대응 |
|-------|-----|-----|-----|
| iOS 스토리지 7일 만료로 진행 손실 | 중 | 치명 | 홈 화면 설치 강제 + IndexedDB + persist() + 서버 백업 |
| 여자친구가 홈 화면 설치 안 함 | 중 | 치명 | 첫 진입 시 강제 안내, 설치 확인 전 튜토리얼 차단 |
| 아이소메트릭 에셋 퀄리티 부족 | 중 | 중 | 탑다운 2D 스타일로 우회 가능 |
| AI 에셋 일관성 실패 | 중 | 중 | Scenario 사용, 동일 시드·프롬프트 유지 |
| 자원 수급 밸런싱 오류 | 높 | 중 | 기획서 부록 B 기반, 플레이테스트 필수 |
| 시뮬레이터에서 작동했지만 실기기에서 안 됨 | 낮 | 중 | 배포 후 지인 아이폰으로 1회 검증 |
| 생일 당일 접속 시 Day 8 조건 불일치 | 낮 | 치명 | 타이머 로직 유닛 테스트, 타임존 고려 |
| iOS 업데이트로 WebKit 동작 변경 | 낮 | 낮 | 개발 시작 시점의 iOS 버전 고정 기준 |

---

## 11. 체크리스트 (개발 시작 전)

### 11.1 환경 준비
- [ ] Node.js 18+ 설치 (nvm 권장)
- [ ] Xcode 설치 (Mac App Store, 무료)
- [ ] Xcode 최초 실행 및 iOS Simulator 다운로드
- [ ] Safari 개발 메뉴 활성화
- [ ] GitHub 계정 준비
- [ ] Vercel 계정 준비 (GitHub 연동)
- [ ] Scenario 또는 Leonardo 계정 (AI 에셋용)

### 11.2 프로젝트 초기화
- [ ] `npx degit phaserjs/template-vite-ts birthday-game`
- [ ] `npm install`
- [ ] `npm install idb-keyval vite-plugin-pwa`
- [ ] `npm run dev` 실행 확인
- [ ] Simulator에서 localhost 접속 확인

### 11.3 기획 문서 준비
- [ ] `game_design_v5.md` 프로젝트 루트에 배치
- [ ] Claude Code 세션에서 문서 첨부 확인

### 11.4 에셋 사전 작업
- [ ] AI 에셋 스타일 레퍼런스 확정 (건물 1~2개 테스트 생성)
- [ ] 초코 외형 참고 자료 준비
- [ ] 편지 내용 초안 작성 (본인 작업)

---

## 12. 참고 링크

### 공식 문서
- Phaser 3 공식: https://phaser.io
- Phaser 3 문서: https://docs.phaser.io
- Phaser Vite 템플릿: https://github.com/phaserjs/template-vite-ts
- Vite: https://vitejs.dev
- vite-plugin-pwa: https://vite-pwa-org.netlify.app

### 라이브러리
- idb-keyval: https://github.com/jakearchibald/idb-keyval

### iOS PWA
- Apple Safari PWA 가이드: https://developer.apple.com/documentation/safariservices
- web.dev PWA on iOS: https://web.dev/learn/pwa

### AI 에셋
- Scenario: https://scenario.gg
- Leonardo: https://leonardo.ai

### 배포
- Vercel: https://vercel.com
- Netlify: https://netlify.com

---

## 13. 미결정·추가 조사 필요

- iOS 17/18에서 PWA 스토리지 정책 완화 여부 (EU 외 지역)
- Phaser 4 공개 시점 (현재 개발 중)
- 여자친구 iOS 버전 확인 필요 (16.4 미만이면 Push 알림 불가)
- 포장 타이머 커스터마이징 시 시간대 처리 방식
