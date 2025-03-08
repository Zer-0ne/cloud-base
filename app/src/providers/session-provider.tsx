'use client'
import React, { createContext, useEffect, ReactNode } from 'react';
import { getData } from "@/utils/fetch-from-api";
import { SessionContextType, User } from '@/utils/Interfaces';
import useFetch from '@/hooks/useFetch';

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { data: session, refetch, loading, error } = useFetch(() => getData('api/user/profile'));
  useEffect(() => {
    if (!session) {
      refetch();
    }
  }, [])

  const value: SessionContextType = {
    session,
    loading,
    error,
    refetchSession: refetch
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};