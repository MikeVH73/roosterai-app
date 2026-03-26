import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '@/api/firebaseClient';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email,
          avatar: firebaseUser.photoURL,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError({ type: 'auth_required', message: error.message });
      throw error;
    }
  };

  const register = async (email, password) => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError({ type: 'register_error', message: error.message });
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Legacy compat: kept so RequireAuth and other components don't break
  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      login,
      register,
      logout,
      resetPassword,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
