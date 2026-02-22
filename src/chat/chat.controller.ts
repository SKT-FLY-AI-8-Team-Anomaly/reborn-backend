import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { AddChatRoomMembersDto } from './dto/add-chat-room-members.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/current-user.decorator';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 채팅방 목록',
    description: '로그인한 유저가 속한 채팅방 목록을 방 id, 이름, 멤버 수와 함께 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          roomId: { type: 'number', example: 1 },
          name: { type: 'string', example: '가족 톡방' },
          memberCount: { type: 'number', example: 4 },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getRooms(@UserId() userId: number | undefined) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.chatService.getRooms(userId);
  }

  @Get('rooms/:roomId/games')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 게임 목록',
    description: '해당 방에 연결된 게임 목록을 반환합니다. playCount는 랜덤 값입니다. 참여자만 조회 가능합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gameId: { type: 'number', example: 1 },
          title: { type: 'string', example: '아이디어 회의' },
          thumbnailUrl: { type: 'string', nullable: true },
          authorNickname: { type: 'string', example: '김혜인' },
          playCount: { type: 'number', example: 21 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '채팅방 없음 또는 참여자가 아님' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getRoomGames(
    @Param('roomId', ParseIntPipe) roomId: number,
    @UserId() userId: number | undefined,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.chatService.getRoomGames(roomId, userId);
  }

  @Get('rooms/:roomId/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 멤버 목록',
    description: '해당 방의 멤버 목록을 userId, 닉네임, 프로필 URL과 함께 반환합니다. 참여자만 조회 가능합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'number', example: 1 },
          nickname: { type: 'string', example: 'Anomaly' },
          profileUrl: { type: 'string', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '채팅방 없음 또는 참여자가 아님' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getRoomMembers(
    @Param('roomId', ParseIntPipe) roomId: number,
    @UserId() userId: number | undefined,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.chatService.getRoomMembers(roomId, userId);
  }

  @Delete('rooms/:roomId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 삭제',
    description: '해당 채팅방을 삭제합니다. 참여자만 삭제할 수 있습니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '채팅방 없음 또는 참여자가 아님' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async deleteRoom(
    @Param('roomId', ParseIntPipe) roomId: number,
    @UserId() userId: number | undefined,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    await this.chatService.deleteRoom(roomId, userId);
  }

  @Post('rooms/:roomId/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방에 멤버 추가',
    description: '해당 방에 친구를 초대합니다. 참여자만 추가할 수 있고, 친구인 유저만 초대할 수 있습니다.',
  })
  @ApiResponse({
    status: 201,
    description: '멤버 추가 성공',
    schema: {
      type: 'object',
      properties: {
        addedUserIds: { type: 'array', items: { type: 'number' }, example: [3, 4] },
      },
    },
  })
  @ApiResponse({ status: 400, description: '본인 중복 / 친구가 아님' })
  @ApiResponse({ status: 404, description: '채팅방 없음 또는 참여자가 아님' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async addRoomMembers(
    @Param('roomId', ParseIntPipe) roomId: number,
    @UserId() userId: number | undefined,
    @Body() dto: AddChatRoomMembersDto,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.chatService.addMembers(roomId, userId, dto.userIds);
  }

  @Post('rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 생성',
    description: '방 이름과 선택한 친구의 userId로 새 채팅방을 만듭니다. 친구인 유저만 초대할 수 있습니다.',
  })
  @ApiResponse({
    status: 201,
    description: '채팅방 생성 성공',
    schema: {
      type: 'object',
      properties: {
        roomId: { type: 'number', example: 1 },
        name: { type: 'string', example: '우리 방' },
        participantUserIds: { type: 'array', items: { type: 'number' }, example: [1, 2] },
      },
    },
  })
  @ApiResponse({ status: 400, description: '본인 초대 불가 / 친구가 아님' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async createRoom(
    @UserId() userId: number | undefined,
    @Body() dto: CreateChatRoomDto,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.chatService.createRoom(userId, dto);
  }
}
