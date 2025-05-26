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

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, { socket: Socket; user: any }>();

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
          .find(([_, info]) => info.user.id === user.id);

        if (existingConnection) {
          // Déconnecter l'ancienne connexion
          this.logger.log(`Déconnexion de l'ancienne session pour ${user.username}`);
          existingConnection[1].socket.disconnect();
          this.connectedUsers.delete(existingConnection[0]);
        }

        this.connectedUsers.set(client.id, { 
          socket: client, 
          user: {
            id: user.id,
            username: user.username,
            color: user.color,
          }
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

      this.logger.log(`Création du message pour l'utilisateur ${userInfo.user.id}`);
      const message = await this.chatService.createMessage(
        data.content,
        userInfo.user.id,
      );

      this.logger.log(`Message créé avec succès: ${JSON.stringify(message)}`);
      this.server.emit('newMessage', message);
      this.logger.log('Message diffusé à tous les clients');
      
      return message;
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

      this.logger.log(`Mise à jour de la couleur pour l'utilisateur ${userInfo.user.id}: ${data.color}`);
      
      // Mettre à jour la couleur dans la base de données
      await this.usersService.updateColor(userInfo.user.id, data.color);
      
      // Mettre à jour la couleur dans la Map des utilisateurs connectés
      userInfo.user.color = data.color;
      
      // Diffuser la liste mise à jour des utilisateurs
      this.updateConnectedUsersList();
      
      this.logger.log('Couleur mise à jour avec succès');
    } catch (error) {
      this.logger.error(`Erreur de mise à jour de couleur: ${error.message}`);
      client.emit('error', { message: 'Erreur lors de la mise à jour de la couleur' });
    }
  }

  private updateConnectedUsersList() {
    const users = Array.from(this.connectedUsers.values()).map(({ user }) => user);
    this.server.emit('connectedUsers', users);
  }
}
