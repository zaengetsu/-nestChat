'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  username: string;
  color: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté au chargement
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Le token est déjà stocké avec le préfixe Bearer
          await authApi.verifyToken(storedToken);
          
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token invalide:', error);
          // Si le token est invalide, déconnecter l'utilisateur
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          router.push('/login');
        }
      }
    };

    checkAuth();
  }, []);

  // Ajouter un effet séparé pour la redirection
  useEffect(() => {
    if (!isAuthenticated && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      console.log('Réponse de login:', response); // Debug log
      
      // Vérifier la structure de la réponse
      if (!response || !response.access_token) {
        throw new Error('Format de réponse invalide');
      }

      // Créer le token avec le préfixe Bearer
      const tokenWithBearer = `Bearer ${response.access_token}`;
      
      // Stocker le token et l'utilisateur dans localStorage
      localStorage.setItem('token', tokenWithBearer);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setToken(tokenWithBearer);
      setUser(response.user);
      setIsAuthenticated(true);
      
      toast.success('Connexion réussie');
      router.push('/chat');
      
      return response;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast.error('Échec de la connexion. Vérifiez vos identifiants.');
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await authApi.register(email, username, password);
      
      if (!response || !response.access_token) {
        throw new Error('Format de réponse invalide');
      }

      const tokenWithBearer = `Bearer ${response.access_token}`;
      
      setUser(response.user);
      setToken(tokenWithBearer);
      setIsAuthenticated(true);
      
      localStorage.setItem('token', tokenWithBearer);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success('Inscription réussie');
      router.push('/chat');
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      toast.error('Échec de l\'inscription. Cet email ou nom d\'utilisateur existe peut-être déjà.');
      throw error;
    }
  };

  const logout = () => {
    // Supprimer le token et l'utilisateur du localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};
