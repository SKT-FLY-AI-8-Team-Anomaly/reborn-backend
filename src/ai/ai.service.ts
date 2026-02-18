import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 프로필 생성 요청 (FastAPI AI에 전달) - 이미지 파일 + 메타 */
export interface ProfileGenerationRequest {
  /** 이미지 바이너리 (multipart로 전달) */
  imageBuffer: Buffer;
  uploadUrl: string;
  blobUrl: string;
}

/** 4방향 모션 생성 요청 */
export interface MotionGenerationRequest {
  profileUrl: string;
  uploadUrls: {
    front: string;
    back: string;
    left: string;
    right: string;
  };
}

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = String(
      this.config.get('AI_BASE_URL', 'http://localhost:8000'),
    ).replace(/\/$/, '');
    this.isMock =
      this.config.get('AI_MOCK', 'false').toLowerCase() === 'true';
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

    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'image.png');
    form.append('uploadUrl', uploadUrl);
    form.append('blobUrl', blobUrl);

    const res = await fetch(`${this.baseUrl}/profile`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI profile generation failed: ${res.status} ${text}`);
    }
  }

  /** 4방향 모션 생성 - AI가 각 blob에 업로드 */
  async generateMotion(req: MotionGenerationRequest): Promise<void> {
    if (this.isMock) {
      await new Promise((r) => setTimeout(r, 5000)); // 5초 지연 (Worker 동작 확인용)
      const profileRes = await fetch(req.profileUrl);
      if (!profileRes.ok) {
        throw new Error(`Failed to fetch profile: ${req.profileUrl}`);
      }
      const buffer = Buffer.from(await profileRes.arrayBuffer());
      await this.putImage(req.uploadUrls.front, buffer);
      await this.putImage(req.uploadUrls.back, buffer);
      await this.putImage(req.uploadUrls.left, buffer);
      await this.putImage(req.uploadUrls.right, buffer);
      return;
    }

    const res = await fetch(`${this.baseUrl}/motion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI motion generation failed: ${res.status} ${text}`);
    }
  }
}
