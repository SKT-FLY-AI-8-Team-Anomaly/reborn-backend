import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomParticipant } from './entities/chat-room-participant.entity';
import { UserFriend } from '../users/entities/user-friend.entity';
import { Character } from '../characters/entities/character.entity';
import { Game } from '../games/entities/game.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomParticipant)
    private readonly participantRepo: Repository<ChatRoomParticipant>,
    @InjectRepository(UserFriend)
    private readonly userFriendRepo: Repository<UserFriend>,
    @InjectRepository(Character)
    private readonly characterRepo: Repository<Character>,
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  /** 새 채팅방 생성 (방 이름 + 선택한 친구 userId). 친구만 초대 가능. */
  async createRoom(
    userId: number,
    dto: CreateChatRoomDto,
  ): Promise<{ roomId: number; name: string; participantUserIds: number[] }> {
    const { name, friendUserId } = dto;

    if (friendUserId === userId) {
      throw new BadRequestException('본인은 친구로 초대할 수 없습니다.');
    }

    const isFriend = await this.userFriendRepo.findOne({
      where: { userId, friendId: friendUserId },
    });
    if (!isFriend) {
      throw new BadRequestException('친구만 채팅방에 초대할 수 있습니다.');
    }

    const room = this.chatRoomRepo.create({ name });
    const savedRoom = await this.chatRoomRepo.save(room);

    await this.participantRepo.save([
      this.participantRepo.create({ roomId: savedRoom.id, userId }),
      this.participantRepo.create({ roomId: savedRoom.id, userId: friendUserId }),
    ]);

    return {
      roomId: savedRoom.id,
      name: savedRoom.name,
      participantUserIds: [userId, friendUserId],
    };
  }

  /** 내가 속한 채팅방 목록 (방 id, 이름, 멤버 수) */
  async getRooms(
    userId: number,
  ): Promise<Array<{ roomId: number; name: string; memberCount: number }>> {
    const myParticipants = await this.participantRepo.find({
      where: { userId },
      relations: ['room'],
    });
    if (myParticipants.length === 0) {
      return [];
    }

    const roomIds = myParticipants.map((p) => p.roomId);
    const counts = await this.participantRepo
      .createQueryBuilder('p')
      .select('p.room_id', 'roomId')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.room_id IN (:...roomIds)', { roomIds })
      .groupBy('p.room_id')
      .getRawMany<{ roomId: number; cnt: string }>();

    const countByRoomId = new Map(counts.map((c) => [c.roomId, Number(c.cnt)]));

    return myParticipants.map((p) => ({
      roomId: p.roomId,
      name: p.room.name,
      memberCount: countByRoomId.get(p.roomId) ?? 0,
    }));
  }

  /** 방 멤버 목록 (userId, nickname, profileUrl). 참여자만 조회 가능. */
  async getRoomMembers(
    roomId: number,
    userId: number,
  ): Promise<Array<{ userId: number; nickname: string; profileUrl: string | null }>> {
    const myParticipation = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!myParticipation) {
      throw new NotFoundException('채팅방을 찾을 수 없거나 참여자가 아닙니다.');
    }

    const participants = await this.participantRepo.find({
      where: { roomId },
      relations: ['user'],
    });
    if (participants.length === 0) {
      return [];
    }

    const userIds = participants.map((p) => p.userId);
    const characters = await this.characterRepo.find({
      where: userIds.map((id) => ({ userId: id })),
      order: { createdAt: 'DESC' },
    });
    const profileByUserId = new Map<number, string | null>();
    for (const c of characters) {
      if (!profileByUserId.has(c.userId)) {
        profileByUserId.set(c.userId, c.characterImageUrl);
      }
    }

    return participants.map((p) => ({
      userId: p.userId,
      nickname: p.user.nickname,
      profileUrl: profileByUserId.get(p.userId) ?? null,
    }));
  }

  /** 방에 멤버 추가. 참여자만 가능, 친구만 초대 가능. */
  async addMembers(
    roomId: number,
    userId: number,
    userIds: number[],
  ): Promise<{ addedUserIds: number[] }> {
    const myParticipation = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!myParticipation) {
      throw new NotFoundException('채팅방을 찾을 수 없거나 참여자가 아닙니다.');
    }

    const existing = await this.participantRepo.find({
      where: { roomId },
    });
    const existingUserIds = new Set(existing.map((p) => p.userId));

    const toAdd = [...new Set(userIds)].filter((id) => !existingUserIds.has(id));
    if (toAdd.length === 0) {
      return { addedUserIds: [] };
    }

    for (const friendId of toAdd) {
      if (friendId === userId) {
        throw new BadRequestException('본인은 이미 방에 있습니다.');
      }
      const isFriend = await this.userFriendRepo.findOne({
        where: { userId, friendId },
      });
      if (!isFriend) {
        throw new BadRequestException(
          `userId ${friendId}는 친구가 아니어서 초대할 수 없습니다.`,
        );
      }
    }

    await this.participantRepo.save(
      toAdd.map((uid) =>
        this.participantRepo.create({ roomId, userId: uid }),
      ),
    );

    return { addedUserIds: toAdd };
  }

  /** 해당 채팅방의 게임 목록. 참여자만 조회 가능. playCount는 랜덤. */
  async getRoomGames(
    roomId: number,
    userId: number,
  ): Promise<
    Array<{
      gameId: number;
      title: string;
      thumbnailUrl: string | null;
      authorNickname: string;
      playCount: number;
      createdAt: Date;
    }>
  > {
    const myParticipation = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!myParticipation) {
      throw new NotFoundException('채팅방을 찾을 수 없거나 참여자가 아닙니다.');
    }

    const games = await this.gameRepo.find({
      where: { roomId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return games.map((g) => ({
      gameId: g.id,
      title: g.title,
      thumbnailUrl: g.thumbnailUrl,
      authorNickname: g.user.nickname,
      playCount: Math.floor(Math.random() * 100) + 1,
      createdAt: g.createdAt,
    }));
  }

  /** 채팅방 삭제. 참여자만 삭제 가능. */
  async deleteRoom(roomId: number, userId: number): Promise<void> {
    const myParticipation = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!myParticipation) {
      throw new NotFoundException('채팅방을 찾을 수 없거나 참여자가 아닙니다.');
    }

    const room = await this.chatRoomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    await this.participantRepo.delete({ roomId });
    await this.chatRoomRepo.remove(room);
  }
}
