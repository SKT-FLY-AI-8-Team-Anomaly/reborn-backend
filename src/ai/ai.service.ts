import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 프로필 생성 요청 (FastAPI AI에 전달) - 이미지 파일 + 메타 */
export interface ProfileGenerationRequest {
  /** 이미지 바이너리 (multipart로 전달) */
  imageBuffer: Buffer;
  uploadUrl: string;
  blobUrl: string;
}

/** 모션 시트 생성 요청 - AI는 200 즉시 반환 후 백그라운드 처리, 완료 시 callbackUrl 호출 */
export interface MotionGenerationRequest {
  profileUrl: string;
  uploadUrl: string;
  blobUrl: string;
  /** 완료 시 POST { jobId, userId, success } 호출할 URL */
  callbackUrl: string;
  jobId: string;
  userId: number;
}

/** 게임 생성 요청 - AI에 session_id, text, storage_url, images 전달 (콜백 없음) */
export interface GameWithPreviewRequest {
  sessionId: string;
  text?: string;
  storageUrl: string;
  imageFiles?: Array<{ buffer: Buffer; mimetype: string; originalname: string }>;
}

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    const raw = String(
      this.config.get('AI_BASE_URL', 'http://localhost:8000'),
    ).trim();
    // 보이지 않는 문자·제로폭 공백 제거 (복사 시 붙을 수 있음)
    this.baseUrl = raw.replace(/[\s\u200B-\u200D\u2060\uFEFF]+/g, '').replace(/\/+$/, '');
    this.isMock =
      this.config.get('AI_MOCK', 'false').toLowerCase() === 'true';
    console.log('[AiService] 초기화', { baseUrl: this.baseUrl, isMock: this.isMock });
    if (this.baseUrl.includes(':3001')) {
      console.warn(
        '[AiService] AI_BASE_URL이 백엔드(3001)를 가리킵니다. 로컬 AI 서버 주소(예: :8000)로 설정하세요.',
        { AI_BASE_URL: this.baseUrl },
      );
    }
  }

  /** SAS URL로 이미지 PUT 업로드 */
  private async putImage(uploadUrl: string, buffer: Buffer): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buffer.length),
        'x-ms-blob-type': 'BlockBlob',
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blob upload failed: ${res.status} ${text}`);
    }
  }

  /** 프로필 1장 생성 - 외부 AI 서버 POST /profile 로 multipart 전송 (mock 없음) */
  async generateProfile(req: ProfileGenerationRequest): Promise<void> {
    const { imageBuffer, uploadUrl, blobUrl } = req;
    const profileUrl = `${this.baseUrl}/profile`;
    console.log('[AiService.generateProfile] 시작', {
      url: profileUrl,
      imageSize: imageBuffer?.length,
      uploadUrlLen: uploadUrl?.length,
      blobUrlLen: blobUrl?.length,
    });

    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'image.png');
    form.append('uploadUrl', uploadUrl);
    form.append('blobUrl', blobUrl);

    const timeoutMs = 60_000;
    const ac = new AbortController();
    const timeoutId = setTimeout(() => {
      ac.abort();
    }, timeoutMs);

    console.log('[AiService.generateProfile] fetch 요청 직전', { timeoutMs });
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(profileUrl, {
        method: 'POST',
        body: form,
        signal: ac.signal,
      });
      clearTimeout(timeoutId);
      console.log('[AiService.generateProfile] fetch 반환', { status: res.status, elapsed: Date.now() - t0 });
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      const cause = err instanceof Error ? (err as Error & { cause?: NodeJS.ErrnoException }).cause : null;
      const code = cause && typeof cause === 'object' && 'code' in cause ? (cause as NodeJS.ErrnoException).code : undefined;
      const elapsed = Date.now() - t0;
      console.error('[AiService.generateProfile] fetch 예외', {
        message: msg,
        code,
        causeMessage: cause && typeof cause === 'object' && 'message' in cause ? (cause as Error).message : undefined,
        elapsed,
        url: profileUrl,
      });
      const hint =
        code === 'ECONNREFUSED'
          ? 'AI 서버가 꺼져 있거나, Docker에서는 host.docker.internal:8000 / AI는 --host 0.0.0.0 필요'
          : code === 'ENOTFOUND'
            ? 'host.docker.internal을 찾을 수 없음 (Linux면 docker run --add-host=host.docker.internal:host-gateway)'
            : code === 'ETIMEDOUT' || msg.includes('abort')
              ? '연결 타임아웃. AI 서버가 0.0.0.0:8000으로 떠 있는지 확인'
              : '';
      throw new Error(`AI 서버 연결 실패 (${code ?? msg}). ${hint}`.trim());
    }
    if (!res.ok) {
      const text = await res.text();
      console.error('[AiService.generateProfile] AI 서버 에러', { status: res.status, bodyPreview: text.slice(0, 200) });
      throw new Error(`AI profile generation failed: ${res.status} ${text}`);
    }
    console.log('[AiService.generateProfile] 성공', res.status);
  }

  /** 모션 시트 생성 - AI는 200 즉시 반환, 완료 시 callbackUrl 호출 */
  async generateMotion(req: MotionGenerationRequest): Promise<void> {
    const motionUrl = `${this.baseUrl}/motion`;
    console.log('[AiService.generateMotion] 시작', { url: motionUrl, jobId: req.jobId, userId: req.userId, isMock: this.isMock });
    if (this.isMock) {
      void this.runMockMotion(req);
      return;
    }

    const res = await fetch(motionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[AiService.generateMotion] AI 서버 에러', { status: res.status, bodyPreview: text.slice(0, 200) });
      throw new Error(`AI motion generation failed: ${res.status} ${text}`);
    }
    console.log('[AiService.generateMotion] 200 반환됨');
  }

  private async runMockMotion(req: MotionGenerationRequest): Promise<void> {
    try {
      await new Promise((r) => setTimeout(r, 5000));
      const profileRes = await fetch(req.profileUrl);
      if (!profileRes.ok) throw new Error(`Failed to fetch profile`);
      const buffer = Buffer.from(await profileRes.arrayBuffer());
      await this.putImage(req.uploadUrl, buffer);
      await fetch(req.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: req.jobId, userId: req.userId, success: true }),
      });
    } catch {
      await fetch(req.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: req.jobId, userId: req.userId, success: false }),
      });
    }
  }

  /**
   * 게임 생성 (multipart). AI는 202 즉시 반환 후 storage_url에 파일 업로드.
   * 반드시 multipart/form-data로만 호출. 필드명: session_id, text, storage_url, images.
   * docs/BACKEND_SPEC.md "백엔드가 주의할 점" 참고.
   */
  async generateGameWithPreview(
    req: GameWithPreviewRequest,
  ): Promise<Record<string, unknown>> {
    const customUrl = this.config.get('AI_GAME_GENERATION_URL', '')?.trim();
    const url = customUrl || `${this.baseUrl}/v1/games/generate-multipart`;
    if (this.isMock) {
      return { session_id: req.sessionId, accepted: true };
    }
    const form = new FormData();
    // 필드명 정확히 session_id, text, storage_url, images (소문자·밑줄만). JSON 따옴표/이스케이프 넣지 말고 값만.
    const sessionId = typeof req.sessionId === 'string' ? String(req.sessionId).trim() : '';
    const textRaw = req.text != null ? String(req.text) : '';
    form.append('session_id', sessionId);
    form.append('text', textRaw);
    // storage_url 끝에 / 없이 전송 (Blob 경로 꼬임 방지)
    const storageUrlNoSlash = String(req.storageUrl ?? '').replace(/\/+$/, '');
    form.append('storage_url', storageUrlNoSlash);
    // images는 반드시 파일 part로, 필드 이름은 'images'. 경로/문자열이 아닌 바이너리만.
    const imageFiles = Array.isArray(req.imageFiles) ? req.imageFiles : [];
    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;
      const mimetype = (f.mimetype && f.mimetype.trim()) || 'image/png';
      const filename = (f.originalname && f.originalname.trim()) || `image${i}.png`;
      form.append(
        'images',
        new Blob([new Uint8Array(f.buffer)], { type: mimetype }),
        filename,
      );
    }
    // Content-Type 헤더 설정하지 않음 → fetch가 multipart/form-data; boundary=... 자동 설정 (422 방지)
    const res = await fetch(url, { method: 'POST', body: form });
    if (res.status !== 200 && res.status !== 202) {
      const text = await res.text();
      throw new Error(`AI game generation failed: ${res.status} ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 202) {
      const text = await res.text();
      const data = text && contentType.includes('application/json') ? JSON.parse(text) : {};
      return { session_id: req.sessionId, accepted: true, ...data };
    }
    const text = await res.text();
    return (text && contentType.includes('application/json') ? JSON.parse(text) : { session_id: req.sessionId }) as Record<string, unknown>;
  }
}
