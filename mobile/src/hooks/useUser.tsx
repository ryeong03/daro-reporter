import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserId, getUserName, saveUser, clearUser } from '../storage/userStorage';

interface UserContextType {
  userId: string | null;
  userName: string | null;
  loading: boolean;
  setUserInfo: (user: { id: string; name: string; device_id: string; phone: string; baseline_bpm: number }) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  userName: null,
  loading: true,
  setUserInfo: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const id = await getUserId();
      const name = await getUserName();
      setUserId(id);
      setUserName(name);
      setLoading(false);
    })();
  }, []);

  const setUserInfo = async (user: { id: string; name: string; device_id: string; phone: string; baseline_bpm: number }) => {
    await saveUser(user);
    setUserId(user.id);
    setUserName(user.name);
  };

  const logout = async () => {
    await clearUser();
    setUserId(null);
    setUserName(null);
  };

  return (
    <UserContext.Provider value={{ userId, userName, loading, setUserInfo, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
