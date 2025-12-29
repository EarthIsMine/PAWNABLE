"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authAPI, userAPI } from "@/lib/api";
import { walletService } from "@/lib/wallet";

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

const TOKEN_KEY = "pawnable_token";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      await authAPI.verify();
      const me = await userAPI.getMe();
      setUser(me);
      setIsConnected(true);
    } catch (error: unknown) {
      console.error("Auth check failed:", error);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    setIsLoading(true);

    try {
      // 1) Wallet connect (address 확보)
      const walletAddress = await walletService.connect();

      // 2) 사용자 존재 확인 → 없으면 생성
      try {
        await userAPI.getByWallet(walletAddress);
      } catch {
        await userAPI.create({ wallet_address: walletAddress });
      }

      // 3) 인증 메시지 발급
      const { message, timestamp } = await authAPI.getMessage(walletAddress);

      // 4) 서명
      const signature = await walletService.signMessage(message);

      // 5) 로그인 → 토큰 저장
      const { token } = await authAPI.login(walletAddress, message, signature, timestamp);
      localStorage.setItem(TOKEN_KEY, token);

      // 6) 최종 사용자 정보 확정
      const me = await userAPI.getMe();
      setUser(me);
      setIsConnected(true);
    } catch (error: unknown) {
      console.error("Connection failed:", error);

      // 연결 실패 시 중간 토큰이 남지 않게 정리
      localStorage.removeItem(TOKEN_KEY);
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
    localStorage.removeItem(TOKEN_KEY);
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
