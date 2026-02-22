import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserFriend } from './entities/user-friend.entity';
import { Character } from '../characters/entities/character.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserFriend)
    private readonly userFriendRepository: Repository<UserFriend>,
    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,
  ) {}

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async signUp(dto: CreateUserDto): Promise<{ id: number; nickname: string }> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    const existing = await this.userRepository.findOne({
      where: { nickname: dto.nickname },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = this.userRepository.create({
      nickname: dto.nickname,
      password: hashedPassword,
    });

    const saved = await this.userRepository.save(user);
    return { id: saved.id, nickname: saved.nickname };
  }

  /** 로그인 유저의 프로필 (닉네임 + 프로필 이미지 URL) */
  async getProfile(userId: number): Promise<{ nickname: string; profileUrl: string | null }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    const latestCharacter = await this.characterRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return {
      nickname: user.nickname,
      profileUrl: latestCharacter?.characterImageUrl ?? null,
    };
  }

  /** 닉네임으로 친구 추가 */
  async addFriend(
    userId: number,
    nickname: string,
  ): Promise<{ message: string; friendId: number; friendNickname: string }> {
    const friend = await this.findByNickname(nickname);
    if (!friend) {
      throw new NotFoundException('해당 닉네임의 유저를 찾을 수 없습니다.');
    }
    if (friend.id === userId) {
      throw new BadRequestException('본인은 친구로 추가할 수 없습니다.');
    }

    const existing = await this.userFriendRepository.findOne({
      where: { userId, friendId: friend.id },
    });
    if (existing) {
      throw new ConflictException('이미 친구인 유저입니다.');
    }

    // 양방향 친구: 나→친구, 친구→나 둘 다 저장
    await this.userFriendRepository.save([
      this.userFriendRepository.create({ userId, friendId: friend.id }),
      this.userFriendRepository.create({ userId: friend.id, friendId: userId }),
    ]);

    return {
      message: '친구가 추가되었습니다.',
      friendId: friend.id,
      friendNickname: friend.nickname,
    };
  }

  /** 친구 목록 (닉네임, 프로필 URL) - addFriend와 동일한 테이블/컬럼으로 조회 */
  async getFriends(
    userId: number,
  ): Promise<Array<{ friendId: number; nickname: string; profileUrl: string | null }>> {
    const uid = Number(userId);
    if (Number.isNaN(uid)) {
      return [];
    }

    const raw = await this.userFriendRepository.query<{ userId: number; friendId: number }[]>(
      'SELECT userId, friendId FROM user_friends WHERE userId = ?',
      [uid],
    );
    if (process.env.NODE_ENV !== 'production') {
      console.log('[getFriends]', { uid, rawRowCount: raw.length });
    }

    if (raw.length === 0) {
      return [];
    }

    const friendIds = raw.map((r) => r.friendId);
    const friends = await this.userRepository.find({ where: { id: In(friendIds) } });
    const userById = new Map(friends.map((u) => [u.id, u]));

    const allChars = await this.characterRepository.find({
      where: friendIds.map((id) => ({ userId: id })),
      order: { createdAt: 'DESC' },
    });
    const profileByUserId = new Map<number, string | null>();
    for (const c of allChars) {
      if (!profileByUserId.has(c.userId)) {
        profileByUserId.set(c.userId, c.characterImageUrl);
      }
    }

    return raw
      .map((r) => {
        const user = userById.get(r.friendId);
        if (!user) return null;
        return {
          friendId: r.friendId,
          nickname: user.nickname,
          profileUrl: profileByUserId.get(r.friendId) ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }
}
