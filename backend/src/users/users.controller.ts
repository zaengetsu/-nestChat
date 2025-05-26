import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

interface UserResponse {
  id: string;
  email: string;
  username: string;
  color: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(): Promise<UserResponse[]> {
    return this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserResponse | null> {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/color')
  async updateUserColor(
    @Param('id') id: string,
    @Body('color') color: string,
  ): Promise<UserResponse | null> {
    return this.usersService.updateColor(id, color);
  }
}
