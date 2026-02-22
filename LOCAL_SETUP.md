# 로컬 실행 방법 (Docker 없이)

## 1. 로컬에 설치할 것

- **Node.js** (v18 이상) — [nodejs.org](https://nodejs.org)
- **MySQL** (로컬에서 실행, DB `reborn` 생성)
- **Redis** (로컬에서 실행, 포트 6379)

### MySQL

- 설치 후 서비스 실행.
- DB 생성: `CREATE DATABASE reborn;`
- `.env`의 `DB_*` 값에 맞게 사용자/비밀번호 설정.

### Redis

- Windows: [Redis for Windows](https://github.com/microsoftarchive/redis/releases) 또는 WSL2에서 Redis 실행.
- macOS: `brew install redis` 후 `brew services start redis`
- Linux: `sudo apt install redis-server` 등으로 설치 후 실행.

---

## 2. 순서

1. **MySQL, Redis를 로컬에서 실행**한 상태로 둔다.

2. **프로젝트 폴더로 이동**
   ```bash
   cd reborn-backend
   ```

3. **환경 변수 설정**
   - `.env.example`을 복사해 `.env` 생성.
   - `.env`에서 아래만 로컬에 맞게 수정.
     - `DB_HOST=localhost`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE=reborn`
     - `JWT_SECRET=` 에 아무 문자열 입력
     - `REDIS_HOST=localhost`, `REDIS_PORT=6379`
   ```bash
   cp .env.example .env
   ```

4. **의존성 설치**
   ```bash
   npm install
   ```

5. **백엔드 실행**
   ```bash
   npm run start:dev
   ```
   - 기본 포트: **3000**. 바꿨으면 `PORT` 환경 변수 확인.

6. **API 문서(Swagger)**
   - 브라우저에서 **http://localhost:3000/api/docs** 접속.
   - 로그인 필요 API는 Swagger **Authorize**에 `POST /auth/login`으로 받은 토큰 입력.

---

## 요약

```
MySQL 실행 → Redis 실행 → cd reborn-backend → cp .env.example .env → .env 수정 → npm install → npm run start:dev → http://localhost:3000/api/docs
```
