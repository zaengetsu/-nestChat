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
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté au chargement
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          try {
            // Vérifier si le token est valide
            await authApi.verifyToken(storedToken);
            
            // Mettre à jour l'état avec les données stockées
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
            
            // Si on est sur la page de login ou register, rediriger vers le chat
            if (window.location.pathname === '/login' || window.location.pathname === '/register') {
              router.push('/chat');
            }
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
        } else {
          // Si pas de token ou user dans le localStorage
          setIsAuthenticated(false);
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            router.push('/login');
          }
        }
      } finally {
        // Une fois la vérification terminée, on indique que le chargement est terminé
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      console.log('Réponse de login:', response); // Debug log
      
      // Vérifier la structure de la réponse
      if (!response || !response.access_token) {
        console.error('Format de réponse invalide:', response);
        throw new Error('Format de réponse invalide');
      }

      // Créer le token avec le préfixe Bearer
      const tokenWithBearer = `Bearer ${response.access_token}`;
      console.log('Token avec Bearer:', tokenWithBearer); // Debug log
      
      // Stocker le token et l'utilisateur dans localStorage
      localStorage.setItem('token', tokenWithBearer);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setToken(tokenWithBearer);
      setUser(response.user);
      setIsAuthenticated(true);
      
      toast.success('Connexion réussie');
      router.push('/chat');
      
      return response;
    } catch (error: any) {
      console.error('Erreur de connexion détaillée:', error);
      if (error.response) {
        console.error('Réponse du serveur:', error.response.data);
        console.error('Status:', error.response.status);
      }
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

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout, updateUser }}>
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
