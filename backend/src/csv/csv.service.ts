import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
}

@Injectable()
export class CsvService implements OnModuleInit {
  private readonly logger = new Logger(CsvService.name);
  private usersFilePath: string;
  private messagesFilePath: string;
  private users: User[] = [];
  private messages: Message[] = [];

  constructor() {
    this.usersFilePath = path.join(process.cwd(), 'data', 'users.csv');
    this.messagesFilePath = path.join(process.cwd(), 'data', 'messages.csv');
  }

  async onModuleInit() {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Créer les fichiers CSV s'ils n'existent pas
    if (!fs.existsSync(this.usersFilePath)) {
      fs.writeFileSync(this.usersFilePath, 'id,email,username,password,color,createdAt,updatedAt\n');
    }

    if (!fs.existsSync(this.messagesFilePath)) {
      fs.writeFileSync(this.messagesFilePath, 'id,content,createdAt,userId\n');
    }

    // Charger les données
    await this.loadUsers();
    await this.loadMessages();
  }

  // Méthodes pour les utilisateurs
  async loadUsers(): Promise<void> {
    const content = fs.readFileSync(this.usersFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Ignorer l'en-tête
    const dataLines = lines.slice(1);
    
    this.users = dataLines.map(line => {
      const [id, email, username, password, color, createdAt, updatedAt] = line.split(',');
      return { id, email, username, password, color, createdAt, updatedAt };
    });
  }

  async saveUsers(): Promise<void> {
    let content = 'id,email,username,password,color,createdAt,updatedAt\n';
    
    this.users.forEach(user => {
      content += `${user.id},${user.email},${user.username},${user.password},${user.color},${user.createdAt},${user.updatedAt}\n`;
    });
    
    fs.writeFileSync(this.usersFilePath, content);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return this.users.find(user => user.username === username) || null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async createUser(email: string, username: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    
    const newUser: User = {
      id: uuidv4(),
      email,
      username,
      password: hashedPassword,
      color: '#1E90FF', // Couleur par défaut
      createdAt: now,
      updatedAt: now,
    };
    
    this.users.push(newUser);
    await this.saveUsers();
    
    return newUser;
  }

  async updateUserColor(userId: string, color: string): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return null;
    }
    
    this.users[userIndex].color = color;
    this.users[userIndex].updatedAt = new Date().toISOString();
    
    await this.saveUsers();
    
    return this.users[userIndex];
  }

  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    return this.users.map(({ password, ...rest }) => rest);
  }

  // Méthodes pour les messages
  async loadMessages(): Promise<void> {
    this.logger.log('Chargement des messages depuis le fichier CSV');
    const content = fs.readFileSync(this.messagesFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Ignorer l'en-tête
    const dataLines = lines.slice(1);
    
    const loadedMessages = dataLines.map(line => {
      const [id, content, createdAt, userId] = line.split(',');
      if (!id || !content || !createdAt || !userId) {
        this.logger.warn(`Ligne de message invalide ignorée: ${line}`);
        return null;
      }
      return { 
        id, 
        content: content.replace(/\\,/g, ','), // Restaurer les virgules échappées
        createdAt, 
        userId 
      } as Message;
    }).filter((msg): msg is Message => msg !== null);
    
    this.messages = loadedMessages;
    this.logger.log(`${this.messages.length} messages chargés avec succès`);
  }

  async saveMessages(): Promise<void> {
    this.logger.log(`Sauvegarde de ${this.messages.length} messages`);
    
    let content = 'id,content,createdAt,userId\n';
    
    this.messages.forEach(message => {
      // Échapper les virgules dans le contenu du message
      const escapedContent = message.content.replace(/,/g, '\\,');
      content += `${message.id},${escapedContent},${message.createdAt},${message.userId}\n`;
    });
    
    try {
    fs.writeFileSync(this.messagesFilePath, content);
      this.logger.log('Messages sauvegardés avec succès');
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde des messages: ${error.message}`);
      throw error;
    }
  }

  async createMessage(content: string, userId: string): Promise<Message & { user: any }> {
    this.logger.log(`Création d'un message: content=${content}, userId=${userId}`);
    
    const now = new Date().toISOString();
    
    const newMessage: Message = {
      id: uuidv4(),
      content,
      createdAt: now,
      userId,
    };
    
    this.logger.log(`Nouveau message créé: ${JSON.stringify(newMessage)}`);
    
    this.messages.push(newMessage);
    await this.saveMessages();
    
    const user = await this.findUserById(userId);
    
    this.logger.log(`Message sauvegardé avec succès. Utilisateur trouvé: ${!!user}`);
    
    return {
      ...newMessage,
      user: user ? {
        id: user.id,
        username: user.username,
        color: user.color,
      } : {
        id: 'unknown',
        username: 'Unknown User',
        color: '#808080'
      }
    };
  }

  async getMessages(limit = 50): Promise<(Message & { user: any })[]> {
    // Trier les messages par date (du plus ancien au plus récent)
    const sortedMessages = [...this.messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    // Limiter le nombre de messages
    const limitedMessages = sortedMessages.slice(0, limit);
    
    // Ajouter les informations utilisateur à chaque message
    const messagesWithUser = await Promise.all(
      limitedMessages.map(async message => {
        const user = await this.findUserById(message.userId);
        return {
          ...message,
          user: user ? {
            id: user.id,
            username: user.username,
            color: user.color,
          } : {
            id: 'unknown',
            username: 'Unknown User',
            color: '#808080'
          }
        };
      })
    );
    
    return messagesWithUser;
  }
}
