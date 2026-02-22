# 프론트엔드: 백엔드 실행 ~ API 문서(Swagger) 보기

## 1. 준비물

- **Node.js** (v18 이상 권장)
- **MySQL** 실행 중 (DB: `reborn` 생성)
- **Redis** 실행 중 (포트 6379, BullMQ용)

## 2. 환경 변수 설정

프로젝트 루트(`reborn-backend`)에 `.env` 파일이 있어야 합니다.

- `.env.example`을 복사해 `.env`로 만들고 값만 채우면 됩니다.
- **최소한 아래만 맞추면** 서버는 뜹니다.
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE=reborn`
  - `JWT_SECRET` (아무 문자열이라도 입력)
  - Redis: `REDIS_HOST`, `REDIS_PORT` (로컬이면 `localhost`, `6379`)

```bash
# 예시 (reborn-backend 폴더에서)
cp .env.example .env
# .env 파일을 열어서 DB, JWT_SECRET, Redis 등 수정
```

## 3. 의존성 설치

```bash
cd reborn-backend
npm install
```

## 4. 백엔드 실행

**개발 모드 (코드 수정 시 자동 재시작):**

```bash
npm run start:dev
```

**또는 빌드 후 실행:**

```bash
npm run build
npm run start
```

정상이면 터미널에 서버가 떴다는 메시지가 나오고, 기본 포트는 **3000**입니다.  
(포트를 바꾼 경우 `PORT` 환경 변수 또는 코드 확인)

## 5. Swagger API 문서 열기

1. 브라우저에서 아래 주소로 접속합니다.
   - **기본:** `http://localhost:3000/api/docs`
   - 포트를 변경했다면: `http://localhost:<사용 중인 포트>/api/docs`
2. Swagger UI에서 모든 API 목록과 요청/응답 스펙을 볼 수 있습니다.

## 6. 로그인이 필요한 API 테스트하기

1. Swagger에서 **POST /auth/login** 으로 로그인해서 `access_token`을 받습니다.
2. 문서 오른쪽 상단 **Authorize** 버튼 클릭.
3. Value 칸에 `Bearer <access_token>` 형태로 넣거나, **access_token 값만** 넣고 저장합니다.
4. 이후에는 인증이 필요한 API를 문서에서 바로 호출할 수 있습니다.

---

**한 줄 요약:**  
`cd reborn-backend` → `npm install` → `.env` 설정 → `npm run start:dev` → 브라우저에서 `http://localhost:3000/api/docs` 접속.
