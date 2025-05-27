import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface ConnectedUser {
  username: string;
  color: string;
  socket: Socket;
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      
      if (!token) {
        this.logger.error('Token manquant');
        client.disconnect();
        return;
      }

      // Extraire le token du format "Bearer <token>"
      const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      try {
        // Utiliser la même clé secrète que dans auth.module.ts
        const payload = this.jwtService.verify(tokenValue, { secret: 'nest-chat-secret-key' });
        const user = await this.usersService.findById(payload.sub);
        
        if (!user) {
          this.logger.error('Utilisateur non trouvé');
          client.disconnect();
          return;
        }

        // Vérifier si l'utilisateur est déjà connecté
        const existingConnection = Array.from(this.connectedUsers.entries())
          .find(([_, info]) => info.username === user.username);

        if (existingConnection) {
          // Déconnecter l'ancienne connexion
          this.logger.log(`Déconnexion de l'ancienne session pour ${user.username}`);
          existingConnection[1].socket.disconnect();
          this.connectedUsers.delete(existingConnection[0]);
        }

        this.connectedUsers.set(client.id, { 
          socket: client, 
          username: user.username,
          color: user.color,
        });

        // Envoyer la liste des utilisateurs connectés à tous les clients
        this.updateConnectedUsersList();
        
        // Envoyer l'historique des messages au client qui vient de se connecter
        const messages = await this.chatService.getMessages();
        client.emit('messageHistory', messages);
        
        this.logger.log(`Client connecté: ${client.id} - ${user.username}`);
      } catch (error) {
        this.logger.error(`Erreur de vérification du token: ${error.message}`);
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Erreur de connexion: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.updateConnectedUsersList();
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('messageSeen')
  async handleMessageSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      if (!userInfo) {
        this.logger.error(`Utilisateur non trouvé pour le client ${client.id}`);
        return;
      }

      this.logger.log(`Message ${data.messageId} vu par ${userInfo.username}`);
      this.server.emit('messageSeen', {
        messageId: data.messageId,
        username: userInfo.username
      });
    } catch (error) {
      this.logger.error(`Erreur de marquage de message vu: ${error.message}`);
      client.emit('error', { message: 'Erreur lors du marquage du message comme vu' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { content: string },
  ) {
    try {
      this.logger.log(`Message reçu de ${client.id}: ${data.content}`);
      
      const userInfo = this.connectedUsers.get(client.id);
      
      if (!userInfo) {
        this.logger.error(`Utilisateur non trouvé pour le client ${client.id}`);
        return;
      }

      // Récupérer l'utilisateur complet pour avoir son ID
      const user = await this.usersService.findByUsername(userInfo.username);
      if (!user) {
        this.logger.error(`Utilisateur non trouvé dans la base de données: ${userInfo.username}`);
        return;
      }

      this.logger.log(`Création du message pour l'utilisateur ${userInfo.username}`);
      const message = await this.chatService.createMessage(
        data.content,
        user.id,
      );

      // Ajouter le champ seenBy au message (sans l'expéditeur)
      const messageWithSeenBy = {
        ...message,
        seenBy: [] // On ne met plus l'expéditeur dans la liste des vus
      };

      this.logger.log(`Message créé avec succès: ${JSON.stringify(messageWithSeenBy)}`);
      this.server.emit('newMessage', messageWithSeenBy);
      this.logger.log('Message diffusé à tous les clients');
      
      return messageWithSeenBy;
    } catch (error) {
      this.logger.error(`Erreur d'envoi de message: ${error.message}`);
      client.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  }

  @SubscribeMessage('updateColor')
  async handleColorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { color: string },
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      
      if (!userInfo) {
        this.logger.error(`Utilisateur non trouvé pour le client ${client.id}`);
        return;
      }

      this.logger.log(`Mise à jour de la couleur pour l'utilisateur ${userInfo.username}: ${data.color}`);
      
      // Récupérer l'utilisateur complet pour avoir son ID
      const user = await this.usersService.findByUsername(userInfo.username);
      if (!user) {
        this.logger.error(`Utilisateur non trouvé dans la base de données: ${userInfo.username}`);
        return;
      }

      // Mettre à jour la couleur dans la base de données
      await this.usersService.updateColor(user.id, data.color);
      
      // Mettre à jour la couleur dans la Map des utilisateurs connectés
      userInfo.color = data.color;
      
      // Diffuser la liste mise à jour des utilisateurs
      this.updateConnectedUsersList();
      
      this.logger.log('Couleur mise à jour avec succès');
    } catch (error) {
      this.logger.error(`Erreur de mise à jour de couleur: ${error.message}`);
      client.emit('error', { message: 'Erreur lors de la mise à jour de la couleur' });
    }
  }

  private async updateConnectedUsersList() {
    const users = await Promise.all(
      Array.from(this.connectedUsers.values()).map(async ({ username, color }) => {
        const user = await this.usersService.findByUsername(username);
        return {
          id: user?.id || '',
          username,
          color
        };
      })
    );
    this.server.emit('connectedUsers', users);
  }
}
