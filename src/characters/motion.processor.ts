import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MOTION_QUEUE } from '../queues/queues.module';
import { CharacterPending } from './entities/character-pending.entity';
import { CharacterPendingStatus } from './constants/character-status.enum';
import { AiService } from '../ai/ai.service';
import { AzureStorageService } from '../azure/azure-storage.service';

interface MotionJobData {
  jobId: string;
  userId: number;
  profileUrl: string;
  uploadUrl: string;
  blobUrl: string;
}

@Processor(MOTION_QUEUE)
export class MotionProcessor extends WorkerHost {
  constructor(
    @InjectRepository(CharacterPending)
    private readonly characterPendingRepo: Repository<CharacterPending>,
    private readonly aiService: AiService,
    private readonly azureStorage: AzureStorageService,
  ) {
    super();
  }

  async process(job: Job<MotionJobData>): Promise<void> {
    if (job.name !== 'generate-motion') return;

    const { jobId, userId, profileUrl, uploadUrl, blobUrl } = job.data;
    console.log('[MotionProcessor] job 수신', { jobId, userId, profileUrlLen: profileUrl?.length });

    const profileReadUrl = this.azureStorage.createReadSasUrl(profileUrl);
    const callbackUrl = this.getMotionCallbackUrl();
    console.log('[MotionProcessor] callbackUrl', callbackUrl);

    try {
      console.log('[MotionProcessor] AiService.generateMotion 호출 직전');
      await this.aiService.generateMotion({
        profileUrl: profileReadUrl,
        uploadUrl,
        blobUrl,
        callbackUrl,
        jobId,
        userId,
      });
      console.log('[MotionProcessor] AiService.generateMotion 반환 (AI가 백그라운드 처리 후 콜백 예정)');
    } catch (err) {
      console.error('[MotionProcessor] generateMotion 실패', err);
      await this.characterPendingRepo.update(
        { jobId, userId },
        { status: CharacterPendingStatus.FAILED },
      );
      throw err;
    }
  }

  /**
   * AI 서버가 콜백을 보낼 때 쓸 백엔드 주소.
   * - AI 서버가 호스트(Windows 등)에서 실행 중이면: http://localhost:3001
   * - AI 서버가 Docker 컨테이너 안이면: http://host.docker.internal:3001
   * MOTION_CALLBACK_BASE_URL 미설정 시 BACKEND_PUBLIC_URL 사용.
   */
  private getMotionCallbackUrl(): string {
    const base = (
      process.env.MOTION_CALLBACK_BASE_URL ??
      process.env.BACKEND_PUBLIC_URL ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
    return `${base}/characters/motion-callback`;
  }
}
