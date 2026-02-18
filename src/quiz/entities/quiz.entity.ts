import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity';
import { GameObject } from '../../objects/entities/object.entity';

@Entity('quiz')
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '이야기' })
  story: string;

  @Column({ comment: '질문' })
  question: string;

  @Column({ comment: '정답' })
  answer: string;

  @Column({ name: 'game_id', comment: '게임 아이디' })
  gameId: number;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'object_id', comment: '오브젝트 아이디' })
  objectId: number;

  @ManyToOne(() => GameObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'object_id' })
  object: GameObject;
}
