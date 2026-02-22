import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { GameObject } from '../../objects/entities/object.entity';

@Entity('quiz')
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'object_id', comment: '오브젝트 아이디' })
  objectId: number;

  @ManyToOne(() => GameObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'object_id' })
  object: GameObject;

  @Column({ type: 'text', comment: '이야기' })
  story: string;

  @Column({ type: 'text', comment: '질문' })
  question: string;

  @Column({ type: 'varchar', length: 255, comment: '정답' })
  answer: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
