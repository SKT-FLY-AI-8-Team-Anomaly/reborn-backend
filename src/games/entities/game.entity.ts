import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '유저 아이디' })
  userId: number;

  @Column({ name: 'room_id', type: 'int', nullable: true, comment: '채팅방 아이디 (null이면 채팅방 미연결)' })
  roomId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100, comment: '게임 제목' })
  title: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true, comment: '썸네일 url' })
  thumbnailUrl: string | null;

  @Column({ name: 'background_url', type: 'text', nullable: true, comment: '배경 url' })
  backgroundUrl: string | null;

  @Column({ name: 'game_code', type: 'varchar', length: 100, nullable: true, comment: 'AI 생성 게임 코드' })
  gameCode: string | null;

  @Column({ name: 'storage_url', type: 'text', nullable: true, comment: '게임 blob 저장소 base URL' })
  storageUrl: string | null;

  @Column({ name: 'layout_json_url', type: 'text', nullable: true, comment: 'layout.json blob URL (play 시 fetch)' })
  layoutJsonUrl: string | null;

  @Column({ name: 'result_json_url', type: 'text', nullable: true, comment: 'result.json blob URL (play 시 fetch)' })
  resultJsonUrl: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: '언어 코드 (예: ko)' })
  language: string | null;

  @Column({ name: 'preview_json', type: 'text', nullable: true, comment: 'preview 객체 JSON' })
  previewJson: string | null;

  @Column({ name: 'object_scale', type: 'float', default: 1.0, comment: '오브젝트 스케일 (layout 없을 때 fallback)' })
  objectScale: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
