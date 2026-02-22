import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomParticipant } from './entities/chat-room-participant.entity';
import { UserFriend } from '../users/entities/user-friend.entity';
import { Character } from '../characters/entities/character.entity';
import { Game } from '../games/entities/game.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatRoomParticipant, UserFriend, Character, Game]),
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [TypeOrmModule, ChatService],
})
export class ChatModule {}
