import React, { createContext, useContext, ReactNode } from "react";
import { StorageProvider, BrowserStorageProvider } from "@atlas/core";

const defaultStorage = new BrowserStorageProvider();

const StorageContext = createContext<StorageProvider>(defaultStorage);

export const StorageProviderWrapper: React.FC<{ children: ReactNode; storage?: StorageProvider }> = ({ children, storage }) => {
  return (
    <StorageContext.Provider value={storage || defaultStorage}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => useContext(StorageContext);
