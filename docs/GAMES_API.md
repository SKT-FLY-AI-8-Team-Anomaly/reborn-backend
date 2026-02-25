# 게임 API 동작 정리

- **백엔드 → AI 연동 스펙** (어떤 값을 어떤 형태로 보내는지): **[BACKEND_SPEC.md](BACKEND_SPEC.md)**

## 개요

- **프론트**는 **이미지·텍스트만** 전달.
- **백엔드**는 **이미지, 텍스트, storage_url, 게임 id(session_id)** 를 AI에 전달. **콜백은 사용하지 않음.**
- AI가 **202** 등으로 응답하면 백엔드가 곧바로 **Game**을 저장하고, 생성된 파일(background, object_1/2/3.png, layout.json, result.json 등)은 **storage_url** 아래에 올라갑니다.  
- 나중에 **게임 ID 또는 game_code(session_id)** 로 play 데이터를 조회해 불러올 수 있습니다.

---

## 1. POST /games/generate-with-preview (게임 생성)

### 역할

- 클라이언트가 **텍스트 + 선택 이미지**만 보내면, 백엔드가 **session_id(게임 id)**·**storage_url**을 만들어 AI에 넘깁니다.  
- AI 응답(200/202) 후 **Game을 즉시 저장**. 콜백 없음.

### 요청 (프론트 → 백엔드)

| 항목 | 타입 | 필수 | 설명 |
|------|------|------|------|
| text | string | O | 스토리 원문 (최대 10000자) |
| images | file[] | X | 참고 이미지 (최대 5장) |
| sessionId | string | X | 게임 ID. 미제공 시 백엔드에서 생성 |

- **Content-Type**: `multipart/form-data`
- **인증**: JWT Bearer 필요

### 백엔드 동작

1. **session_id**  
   요청에 있으면 사용, 없으면 `generateGameId()`로 생성 (예: `g_xxx_yyy`).

2. **storage_url**  
   `getGameStorageBaseUrl(userId, sessionId)`  
   → 예: `https://{account}.blob.core.windows.net/generated-games/{게임코드}/`

3. **AI 서버 호출**  
   `AI_GAME_GENERATION_URL` 또는 `AI_BASE_URL + /v1/games/generate-multipart` 로 **POST**  
   - Form: **session_id**, **text**, **storage_url**, **images**(선택). **callback_url 없음.**

4. **AI 응답(200/202) 후**  
   - **Game** 한 건 저장: gameCode=session_id, storageUrl, layoutJsonUrl, resultJsonUrl, thumbnailUrl, backgroundUrl, title 등.
   - 응답에 **session_id** 포함해 반환.

### 결과물 (스토리지)

AI가 **storage_url** 아래에 올리는 파일:

- `preview.json`, `layout.json`, `result.json`
- `background.png`, `object_1.png`, `object_2.png`, `object_3.png`
- (기타: error.json, timings.json, timings_report.txt 등)

---

## 2. POST /games/generation-callback (웹훅, 현재 미사용)

### 역할

- **현재 플로우에서는 콜백을 보내지 않음.** Game은 AI 응답 직후 저장.
- 엔드포인트는 유지. 과거 연동 또는 별도 연동 시 AI가 호출하면 **pending** 기준으로 Game 저장 가능.

### 요청 (AI → 백엔드)

- **인증**: 없음 (AI 서버가 호출)
- **Body**: JSON. 예시 필드:
  - **status**: `"success"` | `"partial"` | 기타
  - **game_code**: 게임 코드 (session_id 대신 올 수 있음)
  - **session_id** / **sessionId**: (선택) 세션 식별
  - **storage_url**: (선택) 실제 파일이 올라간 스토리지 base URL
  - **blob**: (선택) container, prefix, files 등
  - **files** / **file_urls**: (선택) 파일 경로·URL 목록

### 백엔드 동작

1. **session 식별**  
   `session_id` 또는 `sessionId` 또는 **game_code** 중 하나로 sessionId 확보.

2. **pending 조회**  
   `game_generation_pending`에서 해당 **sessionId**로 조회. 없으면 스킵.

3. **성공 여부**  
   `status === 'success'` 또는 `'partial'`(또는 success: true)일 때만 계속. 아니면 pending 삭제 후 종료.

4. **storage_url 확정**  
   body.**storage_url** → 없으면 pending.**storageUrl** (generate-with-preview 시 저장한 값) → 없으면 `getGameStorageBaseUrl(userId, sessionId)`.

5. **layout/result URL**  
   body에 **file_urls** 등으로 layout.json·result.json URL이 있으면 사용.  
   없으면 **storage_url + `layout.json`** / **storage_url + `result.json`** 로 설정.

6. **Game 저장**  
   `games` 테이블에 한 건 생성/저장:
   - userId, roomId, title, **gameCode**, **storageUrl**, **layoutJsonUrl**, **resultJsonUrl**
   - thumbnailUrl, backgroundUrl, language, previewJson

7. **pending 삭제**  
   해당 sessionId의 pending 레코드 삭제.

- **objects 테이블**에는 넣지 않음. play 시 **layout.json + result.json**을 fetch해서 병합해 사용.

---

## 3. GET /games/:id/play (실행 데이터 by ID)

### 역할

- **게임 ID**로 해당 게임의 **실행용 페이로드**를 반환합니다.
- **background, object 이미지 URL**, **layout/result를 병합한 데이터**를 한 번에 줍니다.

### 요청

- **id**: Game 테이블 PK (숫자)
- **인증**: 없음 (필요 시 컨트롤러에서 가드 추가 가능)

### 백엔드 동작

1. **Game + user** 조회 (id).
2. **storage base**  
   `game.storageUrl`로 baseUrl 확정 (끝에 `/` 보장).
3. **layout/result**  
   - `game.layoutJsonUrl`, `game.resultJsonUrl`이 있으면 **fetch**해서 파싱.  
   - **layout**: objectScale, layoutType, placements  
   - **result**: mood, objects (object_id, intro, quiz, outro)  
   - **placements**와 **result.objects**를 **object_id**로 매칭해 **interactiveObjects** 생성 (x, y, displayHeight, introStory, outroStory, quiz, image URL 등).
4. **layout/result가 없으면**  
   기존 **objects** 테이블 + **quizzes**로 interactiveObjects 구성 (하위 호환).
5. **assets**  
   - background: `game.backgroundUrl` 또는 baseUrl + `background.png` (SAS 부여)  
   - clearBanner: 고정 URL (SAS 적용)  
   - playerSheet / characterDetail: character의 motion_sheet_url, character_detail_url 등 (없으면 baseUrl 기준 fallback).
6. **storage 정보**  
   응답에 **storage.baseUrl**, **storage.layoutJsonUrl**, **storage.resultJsonUrl** 포함 (원본 JSON/파일 불러올 때 사용).

### 응답 (GamePlayPayload)

- title, userNickname, assetVersion, objectScale, layoutType, mood
- **storage**: baseUrl, layoutJsonUrl, resultJsonUrl (해당 API에서 생성한 파일 불러오기용)
- **assets**: background, clearBanner, playerSheet, characterDetail (이미지 URL)
- **interactiveObjects**: textureKey, image, x, y, displayHeight, introStory, outroStory, quiz (question, historySamples)

---

## 4. GET /games/by-code/:gameCode/play (실행 데이터 by game_code)

### 역할

- **game_code**(문자열)로 Game을 찾아, **위 GET /games/:id/play와 동일한 페이로드**를 반환합니다.
- 생성 시 사용한 **게임 코드만** 있으면, 나중에 **background, object, layout.json, result.json** 등을 불러올 수 있습니다.

### 요청

- **gameCode**: Game.gameCode (예: `qwerqwer`)
- **인증**: 없음

### 백엔드 동작

1. **Game** 조회: `gameCode = :gameCode` (trim).
2. 없으면 404.
3. 있으면 **getPlayData(game.id)** 호출 → **GET /games/:id/play**와 같은 로직, 같은 응답 형태.

### 응답

- **GET /games/:id/play**와 동일한 **GamePlayPayload** (storage, assets, interactiveObjects 포함).

---

## 5. 흐름 요약

```
[클라이언트]  POST /games/generate-with-preview (sessionId, text, images?)
       ↓
[백엔드]      storage_url, callback_url 생성
              → pending 저장 (sessionId, userId, storageUrl 등)
              → AI 서버 POST (session_id, text, storage_url, callback_url, images)
       ↓
[AI 서버]     202/200 반환 → 백그라운드에서 storage_url에 파일 업로드
              (preview.json, layout.json, result.json, background.png, object_1/2/3.png 등)
              → 완료 시 POST /games/generation-callback
       ↓
[백엔드]      session_id/game_code로 pending 조회
              → Game 저장 (gameCode, storageUrl, layoutJsonUrl, resultJsonUrl 등)
              → pending 삭제

[나중에]      GET /games/:id/play 또는 GET /games/by-code/:gameCode/play
       ↓
[백엔드]      Game 조회 → layout/result fetch 후 병합
              → storage, assets, interactiveObjects 포함한 GamePlayPayload 반환
```

---

## 6. 환경 변수

| 변수 | 용도 |
|------|------|
| GAME_CALLBACK_BASE_URL | AI가 콜백 호출할 백엔드 주소 (예: http://127.0.0.1:3001) |
| BACKEND_PUBLIC_URL | 위 미설정 시 사용 |
| AI_GAME_GENERATION_URL | 게임 생성 AI 엔드포인트 (예: http://localhost:8000/v1/games/generate-multipart) |
| AI_BASE_URL | AI 서버 base (위 미설정 시 사용) |
| AZURE_STORAGE_* | storage_url 생성 시 컨테이너/계정 정보 |

---

## 7. DB·스토리지

- **game_generation_pending**: 생성 요청 시점의 sessionId, userId, storageUrl 등 (콜백 처리 후 삭제).
- **games**: gameCode, storageUrl, layoutJsonUrl, resultJsonUrl, thumbnailUrl, backgroundUrl 등 (play 조회의 기준).
- **스토리지 경로**: `generated-games/{게임코드}/` 아래에 layout.json, result.json, background.png, object_1.png 등 저장.

이 문서는 위 API들의 **동작**을 정리한 것입니다. 요청/응답 스키마는 Swagger(`/api/docs`)를 참고하면 됩니다.
