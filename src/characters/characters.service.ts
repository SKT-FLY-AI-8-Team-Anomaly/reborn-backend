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

  /** 프로필 생성 (동기) - AI 호출 후 profileUrl 반환 */
  async generateProfile(userId: number, imageBase64: string) {
    const blobPath = `profiles/${userId}/${randomUUID()}.png`;
    const { uploadUrl, blobUrl } = this.azureStorage.createUploadSasUrl(blobPath);

    await this.aiService.generateProfile({
      sourceImage: imageBase64,
      uploadUrl,
      blobUrl,
    });

    return { profileUrl: blobUrl };
  }

  /** 수락 → motion-queue에 job 추가 */
  async accept(userId: number, profileUrl: string) {
    const jobId = randomUUID();
    const prefix = `motion/${userId}/${jobId}`;
    const urls = this.azureStorage.createCharacterUploadSasUrls(prefix);

    const pending = this.characterPendingRepo.create({
      jobId,
      userId,
      profileUrl,
      status: CharacterPendingStatus.MOTION_PROCESSING,
    });
    await this.characterPendingRepo.save(pending);

    await this.motionQueue.add(
      'generate-motion',
      {
        jobId,
        userId,
        profileUrl,
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

    return {
      jobId,
      status: pending.status,
      profileUrl: pending.profileUrl,
      frontUrl: pending.frontUrl,
      backUrl: pending.backUrl,
      leftUrl: pending.leftUrl,
      rightUrl: pending.rightUrl,
    };
  }
}
