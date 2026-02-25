# 백엔드 연동 스펙 — 어떤 값을 어떤 형태로 보내야 하는지

백엔드에서 Game Generation API를 호출할 때 **넘겨야 할 값**과 **형태**만 정리한 문서입니다.

---

## 공통

- **Base URL**: 배포된 API 주소 (예: `https://api.example.com` 또는 `http://localhost:8000`)
- **JSON 요청**: `Content-Type: application/json` 필수
- **Multipart 요청**: `Content-Type: multipart/form-data` (boundary는 클라이언트가 자동 설정)

---

## 1. 게임 생성 (JSON) — `POST /v1/games/generate`

**언제 쓰나**  
스토리 텍스트만 보낼 때. 이미지는 서버에 이미 있다고 가정하고 `image_paths`로 경로만 넘길 수 있음.

| 넘겨야 할 값 | 형태 | 필수 | 설명 |
|--------------|------|------|------|
| **session_id** | 문자열 | ✅ | 세션/요청 식별자. 영문·숫자 권장 (예: UUID). Blob 경로에도 사용됨. |
| **text** | 문자열 | ✅ | 스토리 입력 텍스트 (사용자가 입력한 이야기) |
| **storage_url** | 문자열 | △ | Blob 스토리지 base URL. 없으면 null 또는 생략 가능. |
| **image_paths** | 문자열 배열 | X | 서버 로컬 이미지 파일 경로 배열. 없으면 `[]` 또는 생략. |

**storage_url 형식**  
`https://<스토리지계정>.blob.core.windows.net/generated-games/<게임코드>`  
- 끝에 `/` 붙이지 않음.  
- 예: `https://stanomaly01.blob.core.windows.net/generated-games/12341234`

**보내는 body 예시**
```json
{
  "session_id": "12341234",
  "text": "오늘 팀원들이랑 노량진에서 회식했다. 회가 너무 맛있었다.",
  "storage_url": "https://stanomaly01.blob.core.windows.net/generated-games/12341234",
  "image_paths": []
}
```

**백엔드가 받는 응답 (202)**  
```json
{
  "status": "accepted",
  "session_id": "12341234",
  "message": "Generation started in background. Poll GET /v1/games/status/{session_id} or check blob storage for result."
}
```
→ 이때 받은 `session_id`와 요청 시 보낸 `storage_url`을 백엔드에서 저장해 두고, 완료 후 파일 조회에 사용.

---

## 2. 게임 생성 (Multipart) — `POST /v1/games/generate-multipart` (현재 사용)

**언제 쓰나**  
스토리 텍스트 + **이미지 파일**을 함께 보낼 때 (사용자가 올린 사진 등).

**Content-Type**  
`multipart/form-data` (헤더에 boundary 포함, 라이브러리가 자동 처리).

| 넘겨야 할 값 | 폼 필드 이름 | 형태 | 필수 | 설명 |
|--------------|--------------|------|------|------|
| **session_id** | `session_id` | 텍스트 필드 | ✅ | 세션/요청 식별자 (영문·숫자 권장) |
| **text** | `text` | 텍스트 필드 | ✅ | 스토리 입력 텍스트 |
| **storage_url** | `storage_url` | 텍스트 필드 | ✅ | Blob base URL (**끝에 `/` 없음**) |
| **images** | `images` | 파일 필드 (여러 개 가능) | X | 이미지 파일. **필드 이름은 반드시 `images`** (배열 표기 없음). 최대 5개. 없으면 필드 생략. |

**주의**
- 필드 이름은 정확히 `session_id`, `text`, `storage_url`, `images` (소문자, 밑줄만 사용).
- `images`는 파일을 여러 개 보낼 때 **같은 필드 이름 `images`** 로 여러 part 전송 (예: `images` + 파일1, `images` + 파일2).
- `session_id`, `text`, `storage_url`에는 **따옴표나 JSON 이스케이프 없이** 값만 넣음 (일반 form 필드).
- **storage_url 끝에 `/` 붙이지 않음.**

**storage_url 예시**  
`https://stanomaly01.blob.core.windows.net/generated-games/12341234`

**백엔드가 받는 응답 (202)**  
1번과 동일한 형식. `session_id`와 요청 시 사용한 `storage_url` 저장.

### 백엔드 vs Swagger 요청 차이로 인한 오류 방지

직접(Swagger/curl)로 보내면 되는데 백엔드 경유 시 에러가 나면, **아래를 반드시 맞췄는지** 확인하세요.

| 체크 항목 | Swagger/curl (잘 됨) | 백엔드가 보낼 때 |
|-----------|----------------------|-------------------|
| **Content-Type** | `multipart/form-data; boundary=...` | **반드시** `multipart/form-data`. boundary는 라이브러리가 자동 붙이게 두기. `application/json` 이면 안 됨. |
| **폼 필드 이름** | `session_id`, `text`, `storage_url`, `images` | **완전 동일** (소문자, 밑줄만). `sessionId`, `storage_urls`, `image` 등 오타 금지. |
| **images** | 파일 part, 필드 이름 `images` | **파일 바이너리**를 part로 보내고, **part 이름(필드 이름)은 `images`**. 파일명을 문자열로 보내면 안 됨. |
| **텍스트 필드** | 값만 (따옴표 없음) | `session_id`, `text`, `storage_url`에 **JSON 따옴표/이스케이프 넣지 말고** 일반 form 텍스트로만 전송. |
| **storage_url** | 끝에 `/` 없음 | 끝에 `/` 붙이지 않기. |
| **인코딩** | UTF-8 | 한글 등은 UTF-8로 인코딩. |

**서버 로그로 비교하기**  
API 서버는 multipart 수신 시 다음 로그를 남깁니다.  
`generate-multipart received session_id='...' len(text)=N storage_url='...' images_count=M`  
- 백엔드 요청 시 로그의 `len(text)`, `images_count`가 Swagger로 보낼 때와 같은지 확인.
- `images_count=0`인데 이미지를 보냈다고 생각하면 → 필드 이름이 `images`가 아니거나, 파일이 아닌 문자열로 보낸 가능성.

---

## 3. 생성 상태 조회 — `GET /v1/games/status/{session_id}`

**언제 쓰나**  
생성 요청 후, 완료 여부를 폴링할 때.

| 넘겨야 할 값 | 형태 | 설명 |
|--------------|------|------|
| **session_id** | URL path | 생성 요청 시 보낸 `session_id`를 그대로 path에 넣음. |

**요청 예**  
`GET /v1/games/status/12341234`  
(쿼리 파라미터 없음, path만 사용)

**백엔드가 받는 응답 (200)**  
```json
{
  "session_id": "12341234",
  "status": "pending",
  "preview": null,
  "result": null,
  "layout": null,
  "error": null,
  "message": null
}
```
- `status`: `"pending"` | `"success"` | `"partial"` | `"failed"`
- `success` 또는 `partial`이면 완료. `preview`, `result`, `layout` 등은 API 서버 로컬 경로라 백엔드가 직접 쓰지 않음. **실제 파일은 Blob URL로 조회.**

---

## 4. 재시도 API (레이아웃 / 배경 / 오브젝트)

**언제 쓰나**  
상태 조회에서 `partial`이 나왔을 때, 특정 단계만 다시 돌릴 때.

| 엔드포인트 | Method | Path |
|------------|--------|------|
| 레이아웃 재시도 | POST | `/v1/games/retry-layout` |
| 배경 재시도 | POST | `/v1/games/retry-background` |
| 오브젝트 재시도 | POST | `/v1/games/retry-objects` |

**공통으로 넘겨야 할 값**

| 넘겨야 할 값 | 형태 | 필수 | 설명 |
|--------------|------|------|------|
| **session_id** | 문자열 (JSON body) | ✅ | 기존 생성 요청에 썼던 session_id. |

**Content-Type**  
`application/json`

**보내는 body 예시**
```json
{
  "session_id": "12341234"
}
```

**백엔드가 받는 응답 (200)**  
완료 시 `GenerateResponse` (status, game_code, preview, result, layout, error, timings, timings_report, blob).  
재시도는 **동기**이므로, 200이 오면 해당 단계까지 완료된 상태.

---

## 5. 완료 후 — 저장된 파일을 백엔드에서 부를 때

생성/재시도가 끝나면 파일은 **Blob 스토리지** (`generated-games/{게임코드}/`)에 올라갑니다.  
백엔드는 **요청 시 보냈던 `storage_url` + `/` + 파일 이름**으로 각 파일을 조회하면 됩니다.

**규칙**  
`{storage_url}/{파일이름}`  
(storage_url 끝에 `/` 없음, 조회 시 `/` + 파일이름 붙임)

| 파일 | 백엔드가 부를 URL |
|------|-------------------|
| preview.json | `GET {storage_url}/preview.json` |
| result.json | `GET {storage_url}/result.json` |
| layout.json | `GET {storage_url}/layout.json` |
| error.json | `GET {storage_url}/error.json` |
| timings.json | `GET {storage_url}/timings.json` |
| timings_report.txt | `GET {storage_url}/timings_report.txt` |
| background.png | `GET {storage_url}/background.png` |
| object_1.png | `GET {storage_url}/object_1.png` |
| object_2.png | `GET {storage_url}/object_2.png` |
| object_3.png | `GET {storage_url}/object_3.png` |

**예시 (session_id=12341234, storage_url=https://stanomaly01.blob.core.windows.net/generated-games/12341234)**  
- preview: `https://stanomaly01.blob.core.windows.net/generated-games/12341234/preview.json`  
- result: `https://stanomaly01.blob.core.windows.net/generated-games/12341234/result.json`  
- background: `https://stanomaly01.blob.core.windows.net/generated-games/12341234/background.png`

---

## 백엔드가 주의할 점

아래를 지키지 않으면 422 Validation Error나 이미지 0개·백그라운드 에러가 날 수 있음.

1. **Multipart인데 JSON으로 보내는 경우**  
   게임 생성 Multipart(`/v1/games/generate-multipart`)는 **반드시 multipart/form-data**로 보내야 함.  
   `Content-Type: application/json`으로 JSON만 보내면 폼 필드가 안 넘어가서 422가 나거나 서버가 기대한 필드를 못 받음.  
   백엔드에서는 "이 API는 multipart다"라고 정해두고, 항상 multipart/form-data로만 호출할 것.

2. **폼 필드 이름을 다르게 보내는 경우**  
   필드 이름은 정확히: **session_id**, **text**, **storage_url**, **images** (소문자, 밑줄만).  
   `sessionId`, `storage_urls`, `image`(단수), `images[]` 같이 보내면 서버가 인식 못 함.  
   특히 이미지는 반드시 필드 이름 **images**로 보내야 함. 이름 하나만 바꿔도 422가 나거나 이미지가 0개로 들어감.

3. **이미지를 "파일"이 아니라 "문자열"로 보내는 경우**  
   `images`에는 **파일 바이너리**를 multipart part로 넣어서 보내야 함.  
   파일 경로 문자열이나 파일명만 보내거나, base64 문자열을 텍스트 필드로 보내면 서버는 "파일이 0개"로 받음.  
   백엔드는 "이미지 = multipart의 파일 part이고, part 이름은 images"라고 정확히 구현할 것.

4. **텍스트 필드에 JSON처럼 따옴표를 넣는 경우**  
   `session_id`, `text`, `storage_url`은 **일반 form 텍스트**로 보냄.  
   `"asdf"`처럼 JSON 따옴표를 붙이거나 이스케이프(`\"`)를 넣어서 보내면, 서버가 받는 값에 따옴표가 포함되어 Blob 경로·세션 식별이 꼬일 수 있음.  
   값만 보내고, 따옴표·이스케이프는 넣지 말 것.

5. **storage_url 끝에 슬래시(/)를 붙이는 경우**  
   `storage_url`은 **끝에 `/` 없이** 보냄.  
   예: `https://stanomaly01.blob.core.windows.net/generated-games/12341234`  
   `/`를 붙이면 Blob 경로가 `.../12341234//preview.json`처럼 되어 파일 조회·업로드 경로가 어긋날 수 있음.

6. **202 받은 뒤 백그라운드에서 나는 에러**  
   202는 "요청 접수됐다"는 뜻이고, 실제 게임 생성은 백그라운드에서 돌아감.  
   위 1~5처럼 요청이 조금이라도 다르면 앞단이 실패하고, 그 결과로 백그라운드에서 에러가 나는 경우가 많음.  
   요청 형식을 Swagger/curl과 **완전히 동일하게** 맞추는 게 중요함.

7. **인코딩**  
   한글 등은 **UTF-8**로 보내야 함. 다른 인코딩이면 text가 깨져서 스토리 생성 실패나 검증 에러가 날 수 있음.

**한 줄 요약**  
Multipart는 반드시 multipart/form-data로, 필드 이름은 **session_id**, **text**, **storage_url**, **images** 그대로, **images**는 파일 part로만 보내고, 텍스트 필드는 따옴표 없이 값만, **storage_url**은 끝에 `/` 없이, UTF-8로 보내면 됨.

---

## 한 페이지 요약 (백엔드 개발자용)

| 호출 목적 | Method | URL | 넘길 값 (형태) |
|-----------|--------|-----|----------------|
| 게임 생성 (텍스트만) | POST | `/v1/games/generate` | JSON: `session_id`(string), `text`(string), `storage_url`(string 또는 null), `image_paths`(string[] 또는 []) |
| 게임 생성 (텍스트+이미지) | POST | `/v1/games/generate-multipart` | Form: `session_id`, `text`, `storage_url` (텍스트, **끝에 `/` 없음**), `images` (파일, 필드명 `images`, 최대 5개) |
| 상태 조회 | GET | `/v1/games/status/{session_id}` | path에 session_id만 |
| 레이아웃 재시도 | POST | `/v1/games/retry-layout` | JSON: `{ "session_id": "..." }` |
| 배경 재시도 | POST | `/v1/games/retry-background` | JSON: `{ "session_id": "..." }` |
| 오브젝트 재시도 | POST | `/v1/games/retry-objects` | JSON: `{ "session_id": "..." }` |
| 결과 파일 조회 | GET | (Blob URL) | `{storage_url}/preview.json` 등 위 표 참고 |

이 스펙에 맞춰 백엔드(`AiService.generateGameWithPreview` 등)가 요청을 보냅니다. 상세 스키마·에러 형식은 API 서버의 API.md 참고.
