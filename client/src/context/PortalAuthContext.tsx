import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface PortalEmployee {
  id: number;
  name: string;
  cpf: string;
  email: string;
  photo_url: string | null;
  department: string;
  position: string;
}

interface PortalAuthContextType {
  employee: PortalEmployee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  hasSeenOnboarding: boolean;
  login: (cpf: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setOnboardingComplete: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

// ==========================================
// PERSISTÊNCIA MELHORADA PARA iOS/Safari
// ==========================================

// IndexedDB para persistência mais confiável no Safari
const DB_NAME = 'rhf_portal_db';
const DB_VERSION = 1;
const STORE_NAME = 'auth_store';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

const saveToIndexedDB = async (key: string, value: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, value, timestamp: Date.now() });
    db.close();
  } catch (error) {
    console.warn('IndexedDB save failed:', error);
  }
};

const getFromIndexedDB = async (key: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        db.close();
        resolve(request.result?.value || null);
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (error) {
    console.warn('IndexedDB read failed:', error);
    return null;
  }
};

const removeFromIndexedDB = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    db.close();
  } catch (error) {
    console.warn('IndexedDB remove failed:', error);
  }
};

// Funções de persistência híbridas (localStorage + IndexedDB)
const saveAuthData = async (key: string, value: string) => {
  localStorage.setItem(key, value);
  await saveToIndexedDB(key, value);
};

const getAuthData = async (key: string): Promise<string | null> => {
  // Tentar localStorage primeiro (mais rápido)
  let value = localStorage.getItem(key);
  
  // Se não encontrar, tentar IndexedDB (Safari pode ter limpado localStorage)
  if (!value) {
    value = await getFromIndexedDB(key);
    // Se encontrar no IndexedDB, restaurar no localStorage
    if (value) {
      localStorage.setItem(key, value);
    }
  }
  
  return value;
};

const removeAuthData = async (key: string) => {
  localStorage.removeItem(key);
  await removeFromIndexedDB(key);
};

// Função para verificar se o token JWT está expirado
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Converter para milissegundos
    return Date.now() >= expiry;
  } catch {
    return true; // Se não conseguir decodificar, considerar expirado
  }
};

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<PortalEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getAuthData('portal_token');
        const savedEmployee = await getAuthData('portal_employee');
        const savedMustChange = await getAuthData('portal_must_change_password');
        const savedOnboarding = await getAuthData('portal_onboarding_complete');
        
        if (token && savedEmployee) {
          // Verificar se o token ainda é válido
          if (isTokenExpired(token)) {
            // Token expirado - limpar dados
            await removeAuthData('portal_token');
            await removeAuthData('portal_employee');
            await removeAuthData('portal_must_change_password');
            delete axios.defaults.headers.common['Authorization'];
          } else {
            setEmployee(JSON.parse(savedEmployee));
            setMustChangePassword(savedMustChange === 'true');
            setHasSeenOnboarding(savedOnboarding === 'true');
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Erro ao restaurar autenticação:', error);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (cpf: string, password: string) => {
    const response = await axios.post('/api/portal/login', { cpf, password });
    const { token, employee: emp, mustChangePassword: mustChange } = response.data;
    
    // Salvar com persistência híbrida (localStorage + IndexedDB para iOS)
    await saveAuthData('portal_token', token);
    await saveAuthData('portal_employee', JSON.stringify(emp));
    await saveAuthData('portal_must_change_password', String(mustChange));
    await saveAuthData('portal_login_time', String(Date.now()));
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setEmployee(emp);
    setMustChangePassword(mustChange);
    
    // Verificar se já viu o onboarding
    const savedOnboarding = await getAuthData('portal_onboarding_complete');
    setHasSeenOnboarding(savedOnboarding === 'true');
  };

  const logout = async () => {
    // Limpar caches do Service Worker e parar verificação de notificações
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Enviar comando de logout para limpar todos os caches
        registration.active?.postMessage({
          type: 'PORTAL_LOGOUT'
        });
      } catch (error) {
        console.error('Erro ao limpar caches do Service Worker:', error);
      }
    }
    
    // Limpar caches do navegador (se disponível)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('rhf-offline') || cacheName.includes('rhf-notifications')) {
            await caches.delete(cacheName);
            console.log(`Cache ${cacheName} removido`);
          }
        }
      } catch (error) {
        console.error('Erro ao limpar caches do navegador:', error);
      }
    }
    
    // Remover dados de ambos os storages
    await removeAuthData('portal_token');
    await removeAuthData('portal_employee');
    await removeAuthData('portal_must_change_password');
    await removeAuthData('portal_login_time');
    // Não removemos portal_onboarding_complete para lembrar que já viu
    delete axios.defaults.headers.common['Authorization'];
    setEmployee(null);
    setMustChangePassword(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await axios.post('/api/portal/change-password', { currentPassword, newPassword });
    setMustChangePassword(false);
    await saveAuthData('portal_must_change_password', 'false');
  };

  const setOnboardingComplete = async () => {
    await saveAuthData('portal_onboarding_complete', 'true');
    setHasSeenOnboarding(true);
  };

  return (
    <PortalAuthContext.Provider
      value={{
        employee,
        isAuthenticated: !!employee,
        isLoading,
        mustChangePassword,
        hasSeenOnboarding,
        login,
        logout,
        changePassword,
        setOnboardingComplete
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (context === undefined) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
}
