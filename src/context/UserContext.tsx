import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch all users on mount
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        
        // Try to load from localStorage
        const savedUserId = localStorage.getItem('currentUserId');
        if (savedUserId) {
          const savedUser = data.find((u: User) => u.id === savedUserId);
          if (savedUser) {
            setCurrentUser(savedUser);
            return;
          }
        }
        
        // Default to first user if none saved
        if (data.length > 0) {
          setCurrentUser(data[0]);
          localStorage.setItem('currentUserId', data[0].id);
        }
      })
      .catch(err => console.error('Failed to load users', err));
  }, []);

  const handleSetUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUserId', user.id);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, users }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
