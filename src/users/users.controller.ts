import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiSignUp, ApiUsersTag } from './decorators/users-swagger.decorators';

@ApiUsersTag()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sign-up')
  @ApiSignUp()
  async signUp(@Body() dto: CreateUserDto) {
    return this.usersService.signUp(dto);
  }
}
