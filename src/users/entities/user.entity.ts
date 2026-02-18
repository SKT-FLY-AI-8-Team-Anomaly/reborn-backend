import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '닉네임' })
  nickname: string;

  @Column({ comment: '비밀번호' })
  password: string;

  @Column({ name: 'character_image', comment: '캐릭터이미지 url' })
  characterImage: string;
}
