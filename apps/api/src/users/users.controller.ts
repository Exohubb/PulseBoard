import { Controller, Get, Put, Body, UseGuards, Request, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Get('me/workspaces')
  async getMyWorkspaces(@Request() req: any) {
    return this.usersService.getUserWorkspaces(req.user.id);
  }

  @Put('me')
  async updateProfile(@Request() req: any, @Body() body: { name?: string; avatarUrl?: string }) {
    return this.usersService.update(req.user.id, body);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: any, @Body() body: { password: string }) {
    await this.authService.deleteAccount(req.user.id, body.password);
    return { message: 'Account deleted' };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}