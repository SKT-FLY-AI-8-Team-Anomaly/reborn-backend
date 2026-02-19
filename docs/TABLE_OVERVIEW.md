# 테이블 정리 (reborn-backend)

## 1. users

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | 유저 ID |
| nickname | string | 닉네임 |
| password | string | 비밀번호 (해시) |
| character_image | string | 캐릭터 이미지 URL (프로필 수락 시 저장) |

- 회원가입·로그인 대상. 캐릭터 프로필 수락 시 `character_image` 갱신.

---

## 2. character_pending

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | |
| job_id | string (unique) | BullMQ job ID (수락 시 생성) |
| user_id | FK → users.id | 유저 ID |
| status | enum | motion_processing \| done \| failed |
| profile_url | string(1024) | 프로필 1장 URL (수락 시 저장) |
| motion_sheet_url | string(1024), nullable | 모션 시트 URL (AI 완료 후 저장) |
| error_message | string(512), nullable | 실패 시 AI에서 전달한 에러 메시지 (프론트 표시용) |
| created_at | datetime | 생성 시각 |

- **역할:** 프로필 수락 후 모션 시트 생성 중인 작업의 진행 상태.
- **흐름:** 수락 → status=motion_processing, AI 완료 콜백 → done + motion_sheet_url 저장 / 실패 시 failed.

---

## 3. characters

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | |
| motion_sheet_url | string | 모션 시트 URL (4방향 합친 1장) |
| user_id | FK → users.id | 유저 ID |

- **역할:** 완료된 캐릭터(모션 시트 확정) 1건 = 1행.
- **참고:** 현재 코드에서는 `character_pending`만 사용하고, `characters` INSERT는 없을 수 있음. 필요 시 done 시 character_pending → characters 로 이관하는 로직 추가 가능.

---

## 4. games

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | |
| code | string | 게임 코드 |
| user_id | FK → users.id | 생성한 유저 ID |
| game | string | 게임 이름 |

- 게임 마스터(1건 = 1게임).

---

## 5. game_played

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | |
| game_id | FK → games.id | 게임 ID |
| play_user_id | FK → users.id | 플레이한 유저 ID |

- “누가 어떤 게임을 플레이했는지” 기록.

---

## 6. objects (game_object)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | |
| object_url | string | 오브젝트 저장 URL |
| game_id | FK → games.id | 게임 ID |

- 게임별 오브젝트(에셋) URL.

---

## 7. quiz

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | PK (auto) | |
| story | string | 이야기 |
| question | string | 질문 |
| answer | string | 정답 |
| game_id | FK → games.id | 게임 ID |
| object_id | FK → objects.id | 오브젝트 ID |

- 게임별 퀴즈(스토리·질문·정답·연결 오브젝트).

---

## 관계 요약

```
users
  ├── character_pending (user_id)  … 모션 생성 중인 작업
  ├── characters (user_id)        … 완료된 캐릭터
  └── games (user_id)             … 생성한 게임

games
  ├── game_played (game_id)       … 플레이 기록
  ├── objects (game_id)           … 게임 오브젝트
  └── quiz (game_id)              … 퀴즈

objects
  └── quiz (object_id)            … 퀴즈에 연결된 오브젝트
```
