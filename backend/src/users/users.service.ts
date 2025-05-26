import { Injectable } from '@nestjs/common';
import { CsvService } from '../csv/csv.service';

interface UserResponse {
  id: string;
  email: string;
  username: string;
  color: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

@Injectable()
export class UsersService {
  constructor(private csvService: CsvService) {}

  async findByEmail(email: string): Promise<UserResponse | null> {
    return this.csvService.findUserByEmail(email);
  }

  async findByUsername(username: string): Promise<UserResponse | null> {
    return this.csvService.findUserByUsername(username);
  }

  async findById(id: string): Promise<UserResponse | null> {
    return this.csvService.findUserById(id);
  }

  async create(email: string, username: string, password: string): Promise<UserResponse> {
    return this.csvService.createUser(email, username, password);
  }

  async updateColor(userId: string, color: string): Promise<UserResponse | null> {
    return this.csvService.updateUserColor(userId, color);
  }

  async getAllUsers(): Promise<UserResponse[]> {
    return this.csvService.getAllUsers();
  }
}
