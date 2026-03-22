import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "shelf-control-active-group";

interface GroupContextType {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  isPersonalMode: boolean;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveGroupId = (id: string | null) => {
    setActiveGroupIdState(id);
    try {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
      }
    } catch {
      // localStorage unavailable
    }
  };

  // Future-ready: when we migrate to first-class private groups,
  // change this check to compare against a known private group ID
  const isPersonalMode = activeGroupId === null;

  return (
    <GroupContext.Provider value={{ activeGroupId, setActiveGroupId, isPersonalMode }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroupContext = () => {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroupContext must be used within GroupProvider");
  return ctx;
};
