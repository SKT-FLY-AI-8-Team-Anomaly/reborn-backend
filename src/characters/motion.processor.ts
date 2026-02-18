import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MOTION_QUEUE } from '../queues/queues.module';
import { CharacterPending } from './entities/character-pending.entity';
import { CharacterPendingStatus } from './constants/character-status.enum';
import { AiService } from '../ai/ai.service';

interface MotionJobData {
  jobId: string;
  userId: number;
  profileUrl: string;
  uploadUrls: {
    front: string;
    back: string;
    left: string;
    right: string;
  };
  blobUrls: {
    front: string;
    back: string;
    left: string;
    right: string;
  };
}

@Processor(MOTION_QUEUE)
export class MotionProcessor extends WorkerHost {
  constructor(
    @InjectRepository(CharacterPending)
    private readonly characterPendingRepo: Repository<CharacterPending>,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<MotionJobData>): Promise<void> {
    if (job.name !== 'generate-motion') return;

    const { jobId, userId, profileUrl, uploadUrls, blobUrls } = job.data;

    try {
      await this.aiService.generateMotion({
        profileUrl,
        uploadUrls,
      });

      await this.characterPendingRepo.update(
        { jobId, userId },
        {
          frontUrl: blobUrls.front,
          backUrl: blobUrls.back,
          leftUrl: blobUrls.left,
          rightUrl: blobUrls.right,
          status: CharacterPendingStatus.DONE,
        },
      );
    } catch (err) {
      await this.characterPendingRepo.update(
        { jobId, userId },
        { status: CharacterPendingStatus.FAILED },
      );
      throw err;
    }
  }
}
