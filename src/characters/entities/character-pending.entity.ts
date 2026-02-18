import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CharacterPendingStatus } from '../constants/character-status.enum';

@Entity('character_pending')
export class CharacterPending {
  @PrimaryGeneratedColumn()
  id: number;

  /** motion-queue job id (수락 시 생성) */
  @Column({ name: 'job_id', comment: 'motion-queue job id', unique: true })
  jobId: string;

  @Column({ name: 'user_id', comment: '유저 아이디' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 32,
    default: CharacterPendingStatus.MOTION_PROCESSING,
    comment: 'motion_processing | done | failed',
  })
  status: CharacterPendingStatus;

  /** 프로필 1장 URL (수락 시 프론트에서 전달) */
  @Column({ name: 'profile_url', type: 'varchar', length: 1024, comment: '프로필 1장 url' })
  profileUrl: string;

  /** 4방향 URL (done 이후) */
  @Column({ name: 'front_url', type: 'varchar', length: 1024, nullable: true, comment: '정면 url' })
  frontUrl: string | null;

  @Column({ name: 'back_url', type: 'varchar', length: 1024, nullable: true, comment: '뒤로 url' })
  backUrl: string | null;

  @Column({ name: 'left_url', type: 'varchar', length: 1024, nullable: true, comment: '왼쪽 url' })
  leftUrl: string | null;

  @Column({ name: 'right_url', type: 'varchar', length: 1024, nullable: true, comment: '오른쪽 url' })
  rightUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
