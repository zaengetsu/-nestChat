export interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  userId: string;
  user: {
    id: string;
    username: string;
    color: string;
  };
} 