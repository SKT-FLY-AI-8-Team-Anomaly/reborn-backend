import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity';

@Entity('objects')
export class GameObject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'object_url', comment: '오브젝트 저장된 url' })
  objectUrl: string;

  @Column({ name: 'game_id', comment: '게임아이디' })
  gameId: number;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;
}
