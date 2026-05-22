"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getApiUrl } from "../utils/api";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export interface ApiSettings {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
}

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  isLoading: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  availableUsers: UserProfile[];
  apiSettings: ApiSettings;
  setApiSettings: (settings: ApiSettings) => void;
  isDemoMode: boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const defaultUsers: UserProfile[] = [
  { name: "Sarah Jenkins", email: "admin@neurocorp.com", role: "Admin" },
  { name: "John Miller", email: "hr@neurocorp.com", role: "HR" },
  { name: "David Vance", email: "finance@neurocorp.com", role: "Finance" },
  { name: "Alice Cooper", email: "staff@neurocorp.com", role: "General" }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiSettings, setApiSettingsState] = useState<ApiSettings>({
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: ""
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load user session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("neuro_rag_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user from localStorage:", e);
      }
    }
    setIsLoading(false);
  }, []);

  // Fetch API keys mask from backend on load
  useEffect(() => {
    fetch(getApiUrl("/api/settings"))
      .then(res => res.json())
      .then(data => {
        setApiSettingsState({
          GEMINI_API_KEY: data.GEMINI_API_KEY || "",
          OPENAI_API_KEY: data.OPENAI_API_KEY || ""
        });
      })
      .catch(err => console.error("Error connecting to backend settings:", err));
  }, []);

  const login = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    localStorage.setItem("neuro_rag_user", JSON.stringify(user));
    localStorage.setItem("neuro_rag_token", token);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("neuro_rag_user");
    localStorage.removeItem("neuro_rag_token");
  };

  const setApiSettings = (settings: ApiSettings) => {
    setApiSettingsState(settings);
    // Post to backend
    fetch(getApiUrl("/api/settings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    })
      .then(() => triggerRefresh())
      .catch(err => console.error("Failed to update backend keys:", err));
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const isDemoMode = !apiSettings.GEMINI_API_KEY && !apiSettings.OPENAI_API_KEY;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoading,
        login,
        logout,
        availableUsers: defaultUsers,
        apiSettings,
        setApiSettings,
        isDemoMode,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
