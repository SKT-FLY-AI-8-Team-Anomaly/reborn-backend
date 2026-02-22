# 테이블 정리 (reborn-backend)

제공 스키마 기준으로 엔티티를 정리했습니다. 콜백 매칭용 `job_id`, `error_message`는 character_pending에 유지했습니다.

---

## 1. users

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | 유저 ID |
| nickname | VARCHAR(50), NOT NULL, UNIQUE | 닉네임 |
| password | VARCHAR(255), NOT NULL | 비밀번호 (해시) |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| updated_at | DATETIME, DEFAULT ... ON UPDATE ... | 수정 시각 |

- 캐릭터 이미지는 `characters.character_image_url`에만 저장.

---

## 2. character_pending

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| job_id | VARCHAR, UNIQUE | BullMQ job ID (콜백 매칭용, 스키마 외 추가) |
| user_id | BIGINT, NOT NULL, FK → users.id | 유저 ID |
| status | ENUM('pending','completed','failed') | pending \| completed \| failed |
| profile_url | TEXT, NULL | 프로필 1장 URL |
| motion_sheet_url | TEXT, NULL | 모션 시트 URL (완료 후) |
| error_message | VARCHAR(512), NULL | 실패 사유 (스키마 외 추가) |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

---

## 3. characters

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| user_id | BIGINT, NOT NULL, FK → users.id | 유저 ID |
| motion_sheet_url | TEXT, NOT NULL | 모션 시트 URL |
| character_image_url | TEXT, NOT NULL | 캐릭터 이미지 URL |
| character_detail_url | TEXT, NULL | 캐릭터 상세 URL |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

- 모션 완료 콜백 시 한 건 저장 (character_image_url = profile_url, motion_sheet_url = blobUrl).

---

## 4. games

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| user_id | BIGINT, NOT NULL, FK → users.id | 유저 ID |
| title | VARCHAR(100), NOT NULL | 게임 제목 |
| thumbnail_url | TEXT, NULL | 썸네일 URL |
| background_url | TEXT, NULL | 배경 URL |
| object_scale | FLOAT, DEFAULT 1.0 | 오브젝트 스케일 |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

---

## 5. input_source

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| game_id | BIGINT, NOT NULL, FK → games.id | 게임 ID |
| content_text | TEXT, NOT NULL | 입력 텍스트 |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

---

## 6. input_image

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| game_id | BIGINT, NOT NULL, FK → games.id | 게임 ID |
| image_url | TEXT, NOT NULL | 이미지 URL |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

---

## 7. objects

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| game_id | BIGINT, NOT NULL, FK → games.id | 게임 ID |
| object_directory | VARCHAR(255), NOT NULL | 오브젝트 디렉터리/경로 |
| name | VARCHAR(100), NOT NULL | 오브젝트 이름 |
| x_pos | INT, NOT NULL | x 좌표 |
| y_pos | INT, NOT NULL | y 좌표 |
| height | INT, NOT NULL | 높이 |
| interaction_text | TEXT, NULL | 상호작용 텍스트 |
| outro_story | TEXT, NULL | 아웃트로 스토리 |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

---

## 8. quiz

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| object_id | BIGINT, NOT NULL, FK → objects.id | 오브젝트 ID |
| story | TEXT, NOT NULL | 이야기 |
| question | TEXT, NOT NULL | 질문 |
| answer | VARCHAR(255), NOT NULL | 정답 |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

- 퀴즈는 object에 종속 (quiz_id는 posts에서 제거 권장).

---

## 9. posts

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| user_id | BIGINT, NOT NULL, FK → users.id | 유저 ID |
| game_id | BIGINT, NOT NULL, FK → games.id | 게임 ID |
| content_text | TEXT, NOT NULL | 내용 텍스트 |
| match_rate | FLOAT, NULL | 매칭률 |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

- quiz_id 없음 (퀴즈는 object에 종속).

---

## 10. game_played

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT, PK, AUTO_INCREMENT | |
| game_id | BIGINT, NOT NULL, FK → games.id | 게임 ID |
| played_user_id | BIGINT, NOT NULL, FK → users.id | 플레이한 유저 ID |
| score | INT, NULL | 점수 |
| play_time_seconds | INT, NULL | 플레이 시간(초) |
| created_at | DATETIME, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

---

## 관계 요약

```
users
  ├── games (user_id)
  │     ├── input_source (game_id)
  │     └── input_image (game_id)
  ├── posts (user_id)
  ├── characters (user_id)
  └── character_pending (user_id)

games
  ├── objects (game_id)
  │     └── quiz (object_id)
  ├── input_source (game_id)
  ├── input_image (game_id)
  ├── posts (game_id)
  └── game_played (game_id)

game_played
  ├── game_id → games
  └── played_user_id → users
```
