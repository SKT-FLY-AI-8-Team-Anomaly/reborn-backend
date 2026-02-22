import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '유저 아이디' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'motion_sheet_url', type: 'text', comment: '모션 시트 url' })
  motionSheetUrl: string;

  @Column({ name: 'character_image_url', type: 'text', comment: '캐릭터 이미지 url' })
  characterImageUrl: string;

  @Column({ name: 'character_detail_url', type: 'text', nullable: true, comment: '캐릭터 상세 url' })
  characterDetailUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
