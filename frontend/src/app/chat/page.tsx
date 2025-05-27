'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useRouter } from 'next/navigation';

interface MessageProps {
  content: string;
  username: string;
  color: string;
  isCurrentUser: boolean;
  timestamp: string;
}

interface User {
  id: string;
  username: string;
  color: string;
}

interface ConnectedUser {
  id: string;
  username: string;
  color: string;
}

const Message = ({ content, username, color, isCurrentUser, timestamp }: MessageProps) => {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
          isCurrentUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-white border border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
            {username}
          </span>
          <span className="text-xs opacity-75">
            {formattedTime}
          </span>
        </div>
        <p className="mt-1 break-words" style={{ color: isCurrentUser ? 'white' : color }}>
          {content}
        </p>
      </div>
    </div>
  );
};

const UserList = ({ users }: { users: ConnectedUser[] }) => {
  return (
    <div className="h-full w-72 border-l border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-bold text-gray-800">
        Utilisateurs en ligne ({users.length})
      </h2>
      <ul className="space-y-3">
        {users.map((user) => (
          <li key={user.id} className="flex items-center rounded-lg p-2 hover:bg-gray-50">
            <div
              className="mr-3 h-4 w-4 rounded-full border border-gray-200"
              style={{ backgroundColor: user.color }}
            />
            <span className="font-medium text-gray-800">{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ColorPicker = ({ onColorChange, usedColors }: { onColorChange: (color: string) => void, usedColors: string[] }) => {
  const colors = [
    { id: 'red', value: '#FF5733' },
    { id: 'green', value: '#33FF57' },
    { id: 'blue', value: '#3357FF' },
    { id: 'pink', value: '#FF33A8' },
    { id: 'light-blue', value: '#33A8FF' },
    { id: 'purple', value: '#A833FF' },
    { id: 'gold', value: '#FFD700' },
    { id: 'cyan', value: '#00CED1' },
    { id: 'coral', value: '#FF6347' },
    { id: 'lavender', value: '#7B68EE' },
    { id: 'teal', value: '#20B2AA' },
    { id: 'orange', value: '#FF4500' }
  ];

  return (
    <div className="grid grid-cols-6 gap-2 p-2">
      {colors.map((color) => {
        const isUsed = usedColors.includes(color.value);
        return (
          <button
            key={color.id}
            className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isUsed ? 'opacity-50 cursor-not-allowed border-gray-300' : 'cursor-pointer border-white'
            }`}
            style={{ backgroundColor: color.value }}
            onClick={() => !isUsed && onColorChange(color.value)}
            title={isUsed ? `${color.id} (déjà utilisé)` : color.id}
            disabled={isUsed}
          />
        );
      })}
    </div>
  );
};

export default function Chat() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuth();
  const { messages, connectedUsers, sendMessage, updateColor } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Récupérer toutes les couleurs utilisées
  const usedColors = Array.from(new Set(connectedUsers.map(u => u.color)));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
    }
  };

  const handleColorChange = (color: string) => {
    if (user) {
      updateColor(color, (updatedUser) => {
        const newUser = { ...user, color };
        updateUser(newUser);
      });
      setShowColorPicker(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Nest Chat</h1>
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <button
              className="group flex items-center gap-2 rounded-full px-3 py-2 hover:bg-gray-100"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              <div
                className="h-4 w-4 rounded-full border border-gray-200 transition-transform group-hover:scale-110"
                style={{ backgroundColor: user.color }}
              />
              <span className="font-medium text-gray-900">{user.username}</span>
            </button>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {showColorPicker && (
        <div className="absolute right-4 top-16 z-10 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 p-3">
            <h3 className="text-lg font-semibold text-gray-900">Choisir une couleur</h3>
          </div>
          <ColorPicker onColorChange={handleColorChange} usedColors={usedColors} />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <Message
                key={message.id}
                content={message.content}
                username={message.user.username}
                color={message.user.color}
                isCurrentUser={message.user.id === user.id}
                timestamp={message.createdAt}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>

        <UserList users={connectedUsers} />
      </div>
    </div>
  );
}
