# 백엔드 가이드

## 게임 생성 콜백 URL (AI → Nest)

게임 생성 API(`POST /games/generate-with-preview`)는 AI 서버에 `callback_url`을 넘깁니다.  
AI가 백그라운드 처리 완료 후 **그 URL로 POST**해서 결과를 알려줍니다.

### 콜백 실패가 나는 경우

- **증상**: AI 로그에 `Callback POST http://localhost:3001/games/generation-callback failed: ...` (연결 중단 등)
- **원인**: AI 서버가 **Docker 등 다른 프로세스**에서 돌 때, `localhost`는 **AI가 돌아가는 환경 기준**입니다.  
  그래서 AI 입장에선 Nest(호스트 3001)에 연결되지 않거나 끊깁니다.

### 대응: 콜백 URL을 AI가 접근 가능한 주소로 설정

백엔드가 AI에 넘기는 `callback_url`을 **AI가 실제로 접근할 수 있는 주소**로 만들어야 합니다.

| 환경 | 설정 예시 |
|------|------------|
| AI가 **Docker** 안에서 돌 때 (Windows/Mac) | `GAME_CALLBACK_BASE_URL=http://host.docker.internal:3001` |
| Nest가 떠 있는 **호스트 IP** 사용 | `GAME_CALLBACK_BASE_URL=http://<호스트IP>:3001` |
| 같은 머신에서 둘 다 호스트로 실행 | 설정 생략 가능 (기본 `http://localhost:3001`) |

- **실제 콜백 경로**: `{GAME_CALLBACK_BASE_URL}/games/generation-callback`  
  (예: `http://host.docker.internal:3001/games/generation-callback`)
- **우선순위**: `GAME_CALLBACK_BASE_URL` → `MOTION_CALLBACK_BASE_URL` → `BACKEND_PUBLIC_URL` → `http://localhost:3001`

`.env`에 위처럼 설정한 뒤 Nest를 다시 띄우면, AI에 넘어가는 `callback_url`이 바뀌어서 콜백이 성공할 수 있습니다.

### 로그로 확인

- AI 쪽: `Callback POST <url> failed: <에러>` 에서 **실제로 어떤 URL**로 호출했는지 확인 가능.
- Nest 쪽: `[generateWithPreview] pending 저장 완료, AI 서버 호출 중... { callbackUrl: '...' }` 에서 넘긴 URL 확인 가능.

---

## bg_node 실패 (AI 파이프라인)

파이프라인에서 **bg_node**(배경 생성)가 실패하는 경우, Nest 백엔드가 손댈 부분은 없습니다.  
AI 서버(플러그인 설정, GEMINI API 키, 타임아웃, 에러 로그) 쪽에서 원인을 보면 됩니다.
