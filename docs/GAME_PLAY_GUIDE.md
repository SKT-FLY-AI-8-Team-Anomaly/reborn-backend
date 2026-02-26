# 앱에서 게임 실행하기 (HTML/JS/CSS + input.json 번들)

원래 게임은 **한 폴더에 HTML, JS, CSS, input.json**을 두고 HTML을 열면 실행되는 구조입니다.  
앱(프론트)에서는 **특정 게임을 누르면 WebView로 실행**하도록 연동할 수 있습니다.

---

## 1. 저장소 구조 (게임당)

게임 생성 시 Azure Blob 등에 아래처럼 올려두는 것을 전제로 합니다.

```
{storageUrl}/   (예: generated-games/{gameCode}/)
├── index.html   (선택, 아래 play-page 사용 시 불필요)
├── game.js      (게임 로직)
├── style.css    (스타일)
└── input.json   (오브젝트/설정 등 게임 데이터)
```

---

## 2. 동작 흐름 (프론트 ↔ 백)

```
[앱] 게임 탭
  → GET /games/:id/play-url  (또는 by-code/:gameCode/play-url)
  → 응답: { playUrl: "https://api-host/games/123/play-page" }
  → WebView 로 open(playUrl)

[WebView] playUrl 로드
  → GET /games/123/play-page  (백엔드가 HTML 반환)
  → HTML 안에서:
       - game.js, style.css 는 Blob URL(SAS 포함)로 로드
       - input.json 은 window.GAME_INPUT 으로 주입 또는 GET /games/123/input-json
  → 게임 JS 실행 (기존과 동일한 로직)
```

- **백엔드**: `play-url`로 WebView에 열 URL만 넘기고, `play-page`에서 HTML로 게임 에셋(game.js, style.css) + input.json을 제공.
- **프론트/앱**: 게임 선택 시 `play-url` 호출 → 받은 URL을 WebView로 열기만 하면 됨.

---

## 3. 백엔드 API (게임 실행용)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/games/:id/play-url` | WebView에 열 URL 반환. `playUrl` 한 개만 반환. |
| GET | `/games/:id/play-page` | 게임 실행용 HTML 반환 (game.js, style.css SAS URL + input 데이터 포함). |
| GET | `/games/:id/input-json` | Blob의 input.json 내용 그대로 JSON으로 반환. (play-page에서 fetch로 쓸 때 사용) |

- `id`: Game 테이블의 `id`.
- `game_code` 기준으로 쓰고 싶으면 `GET /games/by-code/:gameCode/play-url` 등 동일 패턴으로 추가 가능.

---

## 4. 게임 JS 쪽 약속 (input.json 사용)

play-page는 다음 중 하나로 input 데이터를 넘깁니다.

1. **주입**: HTML에 `<script>window.GAME_INPUT = { ... };</script>` 로 넣고, 게임 JS는 `window.GAME_INPUT`이 있으면 그걸 사용.
2. **fetch**: 같은 HTML 문서의 `<base href=".../games/123/">` 때문에 상대 경로 `input.json` 요청이 `GET /games/123/input.json`으로 가지 않으므로,  
   대신 **`GET /games/123/input-json`** 을 쓰도록 게임 JS에서 `fetch('/games/123/input-json')` 또는 절대 경로로 호출.

기존에 `fetch('input.json')`만 쓰던 경우, play-page에서 **window.GAME_INPUT**을 채워 두고, 게임 JS에서 아래처럼 처리하면 됩니다.

```js
const data = window.GAME_INPUT || await (await fetch('input.json')).json();
```

---

## 5. 프론트/앱에서 할 일 (요약)

1. 게임 목록/카드에서 **게임 선택 시**  
   `GET /games/:id/play-url` (또는 by-code 기준 URL) 호출.
2. 응답의 **playUrl**을 그대로 **WebView URL**로 사용.
3. WebView는 해당 URL(play-page)만 열면 되고, 나머지(에셋 로드, input)는 백엔드가 제공한 HTML이 처리.

이렇게 하면 기존처럼 **HTML + JS + CSS + input.json** 한 폴더 구조를 유지한 채, 앱에서는 “게임 누르면 WebView로 실행”만 하면 됩니다.
