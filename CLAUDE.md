# CLAUDE.md — 프로젝트 작업 가이드

## 프로젝트 개요
여자친구 24번째 생일 선물용 모바일 웹 게임. 5일간 자원 수확 → 파츠 제작 → 선물상자 완성.
기획서: `game_design_v6.md`, 밸런싱: `balance_5day.md`, 에셋 요구사항: `asset_requirements.md`

## 사용자 소통

### 텔레그램 채널
- 사용자는 **텔레그램**으로 소통합니다. 터미널을 직접 보지 않습니다.
- **모든 작업 완료 시 반드시 텔레그램으로 결과를 보고**하세요.
- `mcp__plugin_telegram_telegram__reply`로 chat_id `8676658677`에 보냅니다.
- 파일/이미지 전송: `files` 파라미터에 절대 경로 배열.
- **존댓말**을 사용하세요.

### 보고 원칙
- 짧고 핵심만. 변경 내용 + URL 전달.
- 에셋 생성 시 결과 이미지를 텔레그램으로 전송하여 사용자가 확인할 수 있게.
- 커밋/푸시 후 Vercel 배포 URL 안내: `https://seoyeon-2026-birthday.vercel.app/`

## 팀 운영

### 팀 스폰 (Agent tool)
복잡한 작업은 팀원을 스폰하여 병렬 처리합니다.
- `team_name: "ui-polish"` (기존 팀 사용)
- 팀원에게 구체적인 지시 + 파일 경로 + 기대 결과를 명시
- 완료 후 `shutdown_request` 보내서 종료

### 자주 쓰는 팀원 역할
| 역할 | 용도 | 주의 |
|------|------|------|
| QA 스크린샷 | puppeteer로 캡처 + 분석 | `mode: bypassPermissions` 필요 |
| 에셋 리뷰어 | 이미지 파일 읽고 평가 | 기획서 참조시키기 |
| 밸런싱 설계 | 자원 수급 계산 | 수학 검증 필수 |
| 코드 리팩토링 | 대규모 파일 수정 | 빌드 확인 후 커밋 |
| 기획 작성 | 문서 작성/수정 | 비게이머 친화 어투 |

### 팀원 사용 시점
- 단순 수정: 직접 처리
- 스크린샷 확인 필요: QA 팀원
- 에셋 생성 + 코드 수정 동시: 병렬 스폰
- 사용자가 "팀원 써서 해줘"라고 하면: 반드시 팀원 스폰

## 에셋 생성

### Scenario API
- Base URL: `https://api.cloud.scenario.com/v1`
- 인증: Basic Auth (`.env`의 `SCENARIO_API_KEY:SCENARIO_API_SECRET`)
- 모델: `model_imagen4-ultra` (imagen4, 10 CU/장)
- 엔드포인트: `POST /generate/custom/model_imagen4-ultra`

### 에셋 생성 워크플로우
1. **생성**: imagen4-ultra로 이미지 생성
2. **배경 제거**: Scenario API `model_bria-remove-background` (3 CU) 또는 로컬 `@imgly/background-removal-node` (무료, 품질 약간 낮음)
3. **원본 보존**: `_raw.png` 파일은 절대 삭제하지 않음
4. **프롬프트 패턴**: `"... clash of clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art"`

### 프롬프트 주의사항
- "thick outlines" 넣지 말 것 (클오클 스타일 아님)
- 생일 선물 테마: 전쟁/무기/왕실 요소 배제
- 건물은 isometric view 명시
- 파츠/아이콘은 "centered, single item, no text"

### 사용자에게 보여주기
- 투명 배경 이미지는 텔레그램에서 안 보이므로 핑크 배경 버전을 같이 만들어 전송

## 빌드 & 배포

### 개발
```bash
cd D:/programming/2026birthday
npm run dev-nolog  # Vite dev server (port 5173)
```

### 빌드 확인
```bash
npx vite build --config vite/config.prod.mjs
```
**코드 수정 후 반드시 빌드 확인 → 커밋 → 푸시**

### 배포
- Vercel 자동 배포 (git push → 자동 빌드)
- URL: https://seoyeon-2026-birthday.vercel.app/

### 커밋 규칙
- 빌드 실패 시 커밋하지 말 것
- `package.json` / `package-lock.json` 변경 시 반드시 함께 커밋
- 커밋 메시지에 `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` 포함

## 캘리브레이션 도구

건물 위치/크기 조절은 사용자가 직접 합니다:
- `/calibrate.html` — 건물 originY, scale, offX, offY 조절
- 사용자가 값을 복사해서 텔레그램으로 보내면, 코드에 반영

## 테스트 페이지들
| 경로 | 용도 |
|------|------|
| `/calibrate.html` | 건물 위치/크기 캘리브레이션 |
| `/gallery.html` | 전체 에셋 갤러리 |
| `/dialogue-preview.html` | 대화 스크립트 프리뷰 |
| `/resource-test.html` | 자원 변동 애니메이션 테스트 |
| `/admin.html` | DB 관리 (목업/Supabase) |

## DB 연동

### 현재 상태: 목업
- `src/services/db.ts` — 함수 시그니처만 존재, 실제 저장 안 함
- `MOCK_SAVE` 객체로 초기 상태 제공 (디버그용으로 수정 가능)

### Supabase 연동 시
- `supabase/schema.sql`을 Supabase SQL Editor에서 실행
- `db.ts`의 TODO 부분을 supabase-js 호출로 교체
- `.env`에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 추가

## 캐릭터: 콜드유 (ColdU)
- 김유찬의 비서 로봇
- 감정 없음, 존댓말, 사무적
- 비인간형 메탈릭 로봇
- 여자친구가 누군지 모르고 "수령인"으로 인식
- 대화 스크립트: `src/data/dialogues.ts`

## 알려진 제약
- Phaser 캔버스와 React 오버레이 간 포인터 이벤트 충돌 주의
- 핀치줌: 네이티브 터치 카운트(`activeTouchCount`) 기반으로 감지 (Phaser pointer 상태는 꼬임)
- 건설 모드 진입 시 500ms 디바운스 (카드 탭이 즉시 건설되는 것 방지)
- DPR 대응: 캔버스는 `window.innerWidth * DPR` 크기, 좌표는 DPR 곱해서 사용
