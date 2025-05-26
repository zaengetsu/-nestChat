'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    color: string;
  };
}

interface ConnectedUser {
  id: string;
  username: string;
  color: string;
}

interface ChatContextType {
  socket: Socket | null;
  messages: Message[];
  connectedUsers: ConnectedUser[];
  sendMessage: (content: string) => void;
  updateColor: (color: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token || !user) return;

    // Connexion au serveur WebSocket
    const socketInstance = io('http://localhost:3000', {
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(socketInstance);

    // Gestion des événements WebSocket
    socketInstance.on('connect', () => {
      console.log('Connecté au serveur WebSocket');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error);
      toast.error('Erreur de connexion au chat. Tentative de reconnexion...');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Reconnecté après ${attemptNumber} tentatives`);
      toast.success('Reconnecté au chat');
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('Erreur de reconnexion:', error);
      toast.error('Impossible de se reconnecter au chat');
    });

    socketInstance.on('messageHistory', (history: Message[]) => {
      console.log('Historique des messages reçu:', history);
      setMessages(history);
    });

    socketInstance.on('newMessage', (message: Message) => {
      console.log('Nouveau message reçu:', message);
      setMessages((prev) => {
        console.log('Messages précédents:', prev);
        const newMessages = [...prev, message];
        console.log('Nouveaux messages:', newMessages);
        return newMessages;
      });
    });

    socketInstance.on('connectedUsers', (users: ConnectedUser[]) => {
      setConnectedUsers(users);
    });

    socketInstance.on('error', (error: { message: string }) => {
      toast.error(error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Déconnecté du serveur WebSocket:', reason);
      if (reason === 'io server disconnect') {
        // Le serveur a forcé la déconnexion, on essaie de se reconnecter
        socketInstance.connect();
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  const sendMessage = (content: string) => {
    if (socket && content.trim()) {
      console.log('Envoi du message:', content);
      socket.emit('sendMessage', { content });
    }
  };

  const updateColor = (color: string) => {
    if (socket && color) {
      console.log('Mise à jour de la couleur:', color);
      socket.emit('updateColor', { color });
      
      // Mettre à jour la couleur dans localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.color = color;
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        messages,
        connectedUsers,
        sendMessage,
        updateColor,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat doit être utilisé à l\'intérieur d\'un ChatProvider');
  }
  return context;
};
