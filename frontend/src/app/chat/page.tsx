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

const Message = ({ content, username, color, isCurrentUser, timestamp }: MessageProps) => {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
        <div className="flex items-center">
          <span className="font-semibold text-gray-900">
            {username}
          </span>
          <span className="ml-2 text-xs" style={{ color: isCurrentUser ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}>
            {formattedTime}
          </span>
        </div>
        <p className="mt-1" style={{ color: isCurrentUser ? 'white' : color }}>{content}</p>
      </div>
    </div>
  );
};

const UserList = ({ users }: { users: User[] }) => {
  return (
    <div className="h-full w-64 border-l border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-bold text-gray-800">Utilisateurs en ligne ({users.length})</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="flex items-center">
            <div
              className="mr-2 h-3 w-3 rounded-full"
              style={{ backgroundColor: user.color }}
            ></div>
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
    <div className="mb-4 flex flex-wrap gap-2">
      {colors.map((color) => {
        const isUsed = usedColors.includes(color.value);
        return (
          <button
            key={color.id}
            className={`h-6 w-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isUsed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
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
  const { user, isAuthenticated, isLoading, logout } = useAuth();
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

  useEffect(() => {
    console.log('Messages dans le composant Chat:', messages);
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
    }
  };

  const handleColorChange = (color: string) => {
    updateColor(color);
    setShowColorPicker(false);
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
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Nest Chat [{user.username}]</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div
              className="mr-2 h-3 w-3 rounded-full cursor-pointer"
              style={{ backgroundColor: user.color }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Changer de couleur"
            ></div>
            <span className="font-semibold text-gray-900">{user.username}</span>
          </div>
          <button
            onClick={logout}
            className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {showColorPicker && (
        <div className="absolute right-4 top-16 z-10 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Choisir une couleur</h3>
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

          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4">
            <div className="flex">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 rounded-l-md border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-r-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
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
