import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

interface UserResponse {
  id: string;
  email: string;
  username: string;
  color: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface UserWithPassword extends UserResponse {
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<UserResponse | null> {
    const user = await this.usersService.findByUsername(username) as UserWithPassword | null;
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, username: user.username };
    
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        color: user.color,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(email: string, username: string, password: string) {
    const existingUserByEmail = await this.usersService.findByEmail(email);
    if (existingUserByEmail) {
      throw new Error('Email already in use');
    }

    const existingUserByUsername = await this.usersService.findByUsername(username);
    if (existingUserByUsername) {
      throw new Error('Username already in use');
    }

    const user = await this.usersService.create(email, username, password);
    
    return this.login(user);
  }
}
