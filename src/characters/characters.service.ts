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
import { CharacterPendingStatus } from './constants/character-status.enum';
import { MOTION_QUEUE } from '../queues/queues.module';
import { AzureStorageService } from '../azure/azure-storage.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(CharacterPending)
    private readonly characterPendingRepo: Repository<CharacterPending>,
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
    const imageBuffer = this.toImageBuffer(image);
    const blobPath = `profiles/${userId}/${randomUUID()}.png`;
    const { uploadUrl, blobUrl } = this.azureStorage.createUploadSasUrl(blobPath);

    await this.aiService.generateProfile({
      imageBuffer,
      uploadUrl,
      blobUrl,
    });

    // 프론트에서 이미지 표시 가능하도록 읽기 SAS URL 반환 (DB에는 저장 안 함)
    return { profileUrl: this.azureStorage.createReadSasUrl(blobUrl) };
  }

  /** 수락 → motion-queue에 job 추가 */
  async accept(userId: number, profileUrl: string) {
    const jobId = randomUUID();
    const prefix = `motion/${userId}/${jobId}`;
    const urls = this.azureStorage.createCharacterUploadSasUrls(prefix);

    // SAS가 붙은 URL이 와도 DB에는 blob 기본 URL만 저장
    const profileUrlForStorage = profileUrl.split('?')[0];

    const pending = this.characterPendingRepo.create({
      jobId,
      userId,
      profileUrl: profileUrlForStorage,
      status: CharacterPendingStatus.MOTION_PROCESSING,
    });
    await this.characterPendingRepo.save(pending);

    await this.motionQueue.add(
      'generate-motion',
      {
        jobId,
        userId,
        profileUrl: profileUrlForStorage,
        uploadUrls: {
          front: urls.front.uploadUrl,
          back: urls.back.uploadUrl,
          left: urls.left.uploadUrl,
          right: urls.right.uploadUrl,
        },
        blobUrls: {
          front: urls.front.blobUrl,
          back: urls.back.blobUrl,
          left: urls.left.blobUrl,
          right: urls.right.blobUrl,
        },
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
      frontUrl: toReadUrl(pending.frontUrl),
      backUrl: toReadUrl(pending.backUrl),
      leftUrl: toReadUrl(pending.leftUrl),
      rightUrl: toReadUrl(pending.rightUrl),
    };
  }
}
