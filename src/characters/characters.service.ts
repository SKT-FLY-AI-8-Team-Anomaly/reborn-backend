import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { CharacterPending } from './entities/character-pending.entity';
import { User } from '../users/entities/user.entity';
import { CharacterPendingStatus } from './constants/character-status.enum';
import { MOTION_QUEUE } from '../queues/queues.module';
import { AzureStorageService } from '../azure/azure-storage.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(CharacterPending)
    private readonly characterPendingRepo: Repository<CharacterPending>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectQueue(MOTION_QUEUE)
    private readonly motionQueue: Queue,
    private readonly azureStorage: AzureStorageService,
    private readonly aiService: AiService,
  ) {}

  /** base64 또는 Buffer → Buffer (data URL prefix 제거) */
  private toImageBuffer(image: Buffer | string): Buffer {
    if (Buffer.isBuffer(image)) return image;
    const raw = image.replace(/^data:image\/[^;]+;base64,/, '');
    return Buffer.from(raw, 'base64');
  }

  /** 프로필 생성 (동기) - 이미지 파일/Buffer로 AI 호출 후 profileUrl 반환 */
  async generateProfile(userId: number, image: Buffer | string) {
    console.log('[CharactersService.generateProfile] 진입', { userId, imageType: typeof image, bufferLength: Buffer.isBuffer(image) ? image.length : 'base64' });
    const imageBuffer = this.toImageBuffer(image);
    const blobPath = `profiles/${userId}/${randomUUID()}.png`;
    console.log('[CharactersService.generateProfile] blobPath', blobPath);
    const { uploadUrl, blobUrl } = this.azureStorage.createUploadSasUrl(blobPath);
    console.log('[CharactersService.generateProfile] Azure SAS 생성됨, blobUrl:', blobUrl);

    console.log('[CharactersService.generateProfile] AiService.generateProfile 호출 직전');
    await this.aiService.generateProfile({
      imageBuffer,
      uploadUrl,
      blobUrl,
    });
    console.log('[CharactersService.generateProfile] AiService.generateProfile 반환됨');

    const readUrl = this.azureStorage.createReadSasUrl(blobUrl);
    console.log('[CharactersService.generateProfile] 응답 반환', { readUrlLength: readUrl.length });
    return { profileUrl: readUrl };
  }

  /** 수락 → motion-queue에 job 추가 (모션 시트 1장 생성) */
  async accept(userId: number, profileUrl: string) {
    const jobId = randomUUID();
    const prefix = `motion/${userId}/${jobId}`;
    const { uploadUrl, blobUrl } = this.azureStorage.createMotionSheetUploadSasUrl(prefix);

    // SAS가 붙은 URL이 와도 DB에는 blob 기본 URL만 저장
    const profileUrlForStorage = profileUrl.split('?')[0];

    const pending = this.characterPendingRepo.create({
      jobId,
      userId,
      profileUrl: profileUrlForStorage,
      status: CharacterPendingStatus.MOTION_PROCESSING,
    });
    await this.characterPendingRepo.save(pending);

    // API 호출 시 전달받은 URL을 users.character_image에 바로 저장
    await this.userRepo.update({ id: userId }, { characterImage: profileUrlForStorage });

    await this.motionQueue.add(
      'generate-motion',
      {
        jobId,
        userId,
        profileUrl: profileUrlForStorage,
        uploadUrl,
        blobUrl,
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );

    return { jobId, status: 'motion_queued' };
  }

  /** 상태 조회 (polling용) */
  async getStatus(userId: number, jobId: string) {
    const pending = await this.characterPendingRepo.findOne({
      where: { jobId, userId },
    });
    if (!pending) {
      throw new NotFoundException('대기 중인 캐릭터를 찾을 수 없습니다.');
    }

    // 프론트에서 이미지 표시 가능하도록 읽기 SAS URL로 반환
    const toReadUrl = (url: string | null) =>
      url ? this.azureStorage.createReadSasUrl(url) : null;

    return {
      jobId,
      status: pending.status,
      profileUrl: toReadUrl(pending.profileUrl),
      motionSheetUrl: toReadUrl(pending.motionSheetUrl),
      errorMessage: pending.errorMessage ?? undefined,
    };
  }

  /** AI 서버가 모션 생성 완료/실패 시 호출 (콜백) */
  async handleMotionCallback(
    jobId: string,
    userId: number,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const pending = await this.characterPendingRepo.findOne({
      where: { jobId, userId },
    });
    if (!pending) {
      console.log('[handleMotionCallback] pending 없음, 무시:', { jobId, userId });
      return;
    }

    if (success) {
      const prefix = `motion/${userId}/${jobId}`;
      const { blobUrl } = this.azureStorage.createMotionSheetUploadSasUrl(prefix);
      await this.characterPendingRepo.update(
        { jobId, userId },
        { motionSheetUrl: blobUrl, status: CharacterPendingStatus.DONE, errorMessage: null },
      );
      console.log('[handleMotionCallback] DONE:', { jobId, userId });
    } else {
      await this.characterPendingRepo.update(
        { jobId, userId },
        { status: CharacterPendingStatus.FAILED, errorMessage: errorMessage ?? null },
      );
      console.log('[handleMotionCallback] FAILED:', { jobId, userId, errorMessage: errorMessage?.slice(0, 80) });
    }
  }
}
