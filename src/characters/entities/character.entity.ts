import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'front_url', comment: '정면 걷는 url' })
  frontUrl: string;

  @Column({ name: 'back_url', comment: '뒤로 걷는 url' })
  backUrl: string;

  @Column({ name: 'left_url', comment: '왼쪽 url' })
  leftUrl: string;

  @Column({ name: 'right_url', comment: '오른쪽 url' })
  rightUrl: string;

  @Column({ name: 'user_id', comment: '유저 아이디' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
