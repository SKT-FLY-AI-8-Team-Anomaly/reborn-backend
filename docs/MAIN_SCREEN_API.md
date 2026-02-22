# 메인 화면 API 정리 (프론트 전달용)

Base URL: `http://localhost:3000` (또는 배포 시 백엔드 주소)

**공통:** 인증 필요한 API는 요청 헤더에 `Authorization: Bearer <access_token>` 포함.  
토큰은 `POST /auth/login` 응답의 `access_token` 사용.

---

## 1. 로그인 (메인 진입 전)

| 메서드 | 경로 | 설명 | Body 예시 |
|--------|------|------|-----------|
| POST | `/auth/login` | 로그인 | `{ "nickname": "닉네임", "password": "비밀번호" }` |

**응답:** `{ "access_token": "..." }` → 이후 API 호출 시 헤더에 사용.

---

## 2. 메인 화면 진입 시 (한 번에 불러오기)

| 메서드 | 경로 | 설명 | 응답 예시 |
|--------|------|------|-----------|
| GET | `/users/me` | 내 프로필 (좌측 상단 카드) | `{ "nickname": "Anomaly", "profileUrl": "https://..." }` |
| GET | `/users/friends` | 친구 목록 (친구 목록 버튼/영역) | `[{ "friendId": 2, "nickname": "친구닉네임", "profileUrl": "..." }]` |
| GET | `/chat/rooms` | 내 채팅방 목록 (중앙 리스트) | `[{ "roomId": 1, "name": "가족 톡방", "memberCount": 4 }]` |

---

## 3. 방 선택 시 (해당 방 상세/우측 패널)

| 메서드 | 경로 | 설명 | 응답 예시 |
|--------|------|------|-----------|
| GET | `/chat/rooms/:roomId/members` | 해당 방 멤버 목록 (멤버 보기) | `[{ "userId": 1, "nickname": "Anomaly", "profileUrl": "..." }]` |
| GET | `/chat/rooms/:roomId/games` | 해당 방 게임 목록 (우측 게임 카드들) | `[{ "gameId": 1, "title": "아이디어 회의", "thumbnailUrl": "...", "authorNickname": "김혜인", "playCount": 21, "createdAt": "..." }]` |

- `:roomId`는 위 `GET /chat/rooms` 응답의 `roomId` 사용.

---

## 4. 메인 화면에서 하는 액션

| 메서드 | 경로 | 설명 | Body 예시 |
|--------|------|------|-----------|
| POST | `/users/friends` | 닉네임으로 친구 추가 | `{ "nickname": "친구닉네임" }` |
| POST | `/chat/rooms` | 방 만들기 | `{ "name": "방 이름", "friendUserId": 2 }` |
| POST | `/chat/rooms/:roomId/members` | 방에 멤버 추가 (친구 초대) | `{ "userIds": [3, 4] }` |
| DELETE | `/chat/rooms/:roomId` | 방 삭제 | (body 없음) |

---

## 5. 호출 순서 요약

1. **로그인** → `POST /auth/login` → `access_token` 저장.
2. **메인 진입** → `GET /users/me`, `GET /users/friends`, `GET /chat/rooms` (필요 시 병렬 호출).
3. **방 하나 선택** → `GET /chat/rooms/:roomId/members`, `GET /chat/rooms/:roomId/games` (멤버 보기/게임 목록 표시 시).
4. **친구 추가 / 방 만들기 / 멤버 추가 / 방 삭제** → 위 4번 표의 API 호출 후, 필요하면 2번·3번 다시 호출해 화면 갱신.

---

상세 스펙·에러 코드는 Swagger에서 확인: **http://localhost:3000/api/docs**
