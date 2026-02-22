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

  @Column({ name: 'object_scale', type: 'float', default: 1.0, comment: '오브젝트 스케일' })
  objectScale: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
