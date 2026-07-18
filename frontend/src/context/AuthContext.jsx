import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import logo from '../assets/healthbirch-logo.png'; // Import brand logo for loading screen.

const AuthContext = createContext({});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch additional user details from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data()
            });
          } else {
            // Fallback if document is not created yet
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'patient' // Default role
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0d1b3e] to-[#0a0a0f]">
          <img src={logo} alt="HEALTHBIRCH" className="mb-6 h-14 w-auto object-contain bg-white/10 rounded-xl p-2 opacity-90" />
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-[#60A5FA] shadow-sm" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[#60A5FA]" />
            </div>
          </div>
          <p className="mt-4 animate-pulse text-sm font-medium text-slate-400 tracking-wide">Initializing HEALTHBIRCH...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
