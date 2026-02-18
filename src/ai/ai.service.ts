import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 프로필 생성 요청 (FastAPI AI에 전달) */
export interface ProfileGenerationRequest {
  sourceImage: string; // base64
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

  /** base64 문자열에서 순수 base64 부분만 추출 */
  private stripBase64Prefix(str: string): string {
    const match = str.match(/^data:image\/[^;]+;base64,(.+)$/);
    return match ? match[1] : str;
  }

  /** base64 → Buffer */
  private base64ToBuffer(base64: string): Buffer {
    const raw = this.stripBase64Prefix(base64);
    return Buffer.from(raw, 'base64');
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

  /** 프로필 1장 생성 - AI가 blob에 업로드 */
  async generateProfile(req: ProfileGenerationRequest): Promise<void> {
    if (this.isMock) {
      const buffer = this.base64ToBuffer(req.sourceImage);
      await this.putImage(req.uploadUrl, buffer);
      return;
    }

    const res = await fetch(`${this.baseUrl}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
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
