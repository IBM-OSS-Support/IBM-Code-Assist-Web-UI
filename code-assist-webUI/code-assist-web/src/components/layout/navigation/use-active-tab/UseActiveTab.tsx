// UseActiveTab.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ActiveTabContext = createContext<string | null>(null);

export const useActiveTab = () => useContext(ActiveTabContext);

interface ActiveTabProviderProps {
    value: string;
    children?: React.ReactNode;
}  

export const ActiveTabProvider: React.FC<ActiveTabProviderProps> = ({ value, children }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  console.log("ActiveTabProvider activeTab", activeTab);
  

  useEffect(() => {
    // Assuming you want to set the initial active tab based on route
    const pathname = window.location.hash;
    console.log("pathname", pathname);
    
    if (pathname === '#/' || pathname === '#/dashboard') {
      setActiveTab('Dashboard');
    } else if (pathname === '#/summary') {
      setActiveTab('Summary');
    } else if (pathname === '#/leaderboard') {
      setActiveTab('BigCodeBench Leaderboard');
    } else if (pathname === '#/model-comparison') {
      setActiveTab('Model Comparison');
    }
  }, []);

  return (
    <ActiveTabContext.Provider value={activeTab}>
      {children}
    </ActiveTabContext.Provider>
  );
};