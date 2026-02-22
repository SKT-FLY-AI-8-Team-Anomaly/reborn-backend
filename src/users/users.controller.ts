import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AddFriendDto } from './dto/add-friend.dto';
import { ApiSignUp, ApiUsersTag, ApiGetProfile, ApiAddFriend, ApiGetFriends } from './decorators/users-swagger.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/current-user.decorator';

@ApiUsersTag()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sign-up')
  @ApiSignUp()
  async signUp(@Body() dto: CreateUserDto) {
    return this.usersService.signUp(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiGetProfile()
  async getProfile(@UserId() userId: number | undefined) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.usersService.getProfile(userId);
  }

  @Get('friends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiGetFriends()
  async getFriends(@UserId() userId: number | undefined) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.usersService.getFriends(userId);
  }

  @Post('friends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiAddFriend()
  async addFriend(
    @UserId() userId: number | undefined,
    @Body() dto: AddFriendDto,
  ) {
    if (userId == null) {
      throw new Error('userId is required');
    }
    return this.usersService.addFriend(userId, dto.nickname);
  }
}
