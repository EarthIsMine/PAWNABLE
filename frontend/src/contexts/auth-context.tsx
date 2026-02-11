"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { walletService } from "@/lib/wallet";
import { contractService } from "@/lib/contracts";

export interface User {
  user_id: string;
  wallet_address: string;
  nickname?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DISCONNECTED_KEY = "pawnable_disconnected";

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined" && localStorage.getItem(DISCONNECTED_KEY) === "true") {
        setUser(null);
        setIsConnected(false);
        return;
      }

      const account = await walletService.getAccount();
      if (account) {
        setUser({ user_id: account, wallet_address: account });
        setIsConnected(true);
      } else {
        setUser(null);
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const next = accounts?.[0];
      if (next) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(DISCONNECTED_KEY);
        }
        setUser({ user_id: next, wallet_address: next });
        setIsConnected(true);
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem(DISCONNECTED_KEY, "true");
        }
        setUser(null);
        setIsConnected(false);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connect = async () => {
    setIsLoading(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECTED_KEY);
      }

      // Wallet connect (address 확보)
      const walletAddress = await walletService.connect();

      // 서버 로그인 제거. 지갑 주소만 로컬 상태로 유지.
      setUser({ user_id: walletAddress, wallet_address: walletAddress });
      setIsConnected(true);

      // Initialize smart contracts
      try {
        await contractService.initialize();
        console.log("Smart contracts initialized");
      } catch (error) {
        console.warn("Contract initialization failed:", error);
        // Don't throw - user can still use the app without contracts
      }
    } catch (error: unknown) {
      console.error("Connection failed:", error);

      setUser(null);
      setIsConnected(false);

      // UI 레이어(버튼)에서 toast로 처리할 수 있도록 throw
      const message = getErrorMessage(error);
      throw new Error(message ?? "AUTH_CONNECT_FAILED");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECTED_KEY, "true");
    }

    walletService.disconnect();
    setUser(null);
    setIsConnected(false);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isConnected,
      connect,
      disconnect,
    }),
    [user, isLoading, isConnected],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
