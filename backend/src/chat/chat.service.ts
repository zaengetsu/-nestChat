import { Injectable, Logger } from '@nestjs/common';
import { CsvService } from '../csv/csv.service';
import { Message } from '../interfaces/message.interface';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private csvService: CsvService) {}

  async createMessage(content: string, userId: string): Promise<Message> {
    this.logger.log(`ChatService: Création d'un message pour l'utilisateur ${userId}`);
    const message = await this.csvService.createMessage(content, userId);
    this.logger.log(`ChatService: Message créé avec succès: ${JSON.stringify(message)}`);
    return message;
  }

  async getMessages(limit = 50): Promise<Message[]> {
    this.logger.log(`ChatService: Récupération des ${limit} derniers messages`);
    const messages = await this.csvService.getMessages(limit);
    this.logger.log(`ChatService: ${messages.length} messages récupérés`);
    return messages;
  }
}
