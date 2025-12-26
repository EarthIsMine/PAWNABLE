"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authAPI, userAPI } from "@/lib/api"
import { walletService } from "@/lib/wallet"

interface User {
  user_id: string
  wallet_address: string
  nickname?: string
  email?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("pawnable_token")
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      await authAPI.verify()
      const userData = await userAPI.getMe()
      setUser(userData)
      setIsConnected(true)
    } catch (error) {
      console.error("[v0] Auth check failed:", error)
      localStorage.removeItem("pawnable_token")
    } finally {
      setIsLoading(false)
    }
  }

  const connect = async () => {
    setIsLoading(true)
    try {
      // Connect wallet
      const walletAddress = await walletService.connect()
      console.log("[v0] Connected wallet:", walletAddress)

      // Check if user exists
      let userData: User | null = null
      try {
        userData = await userAPI.getByWallet(walletAddress)
        console.log("[v0] User found:", userData)
      } catch (error) {
        // User doesn't exist, create new user
        console.log("[v0] Creating new user")
        userData = await userAPI.create({
          wallet_address: walletAddress,
        })
      }

      // Get auth message
      const { message, timestamp } = await authAPI.getMessage(walletAddress)
      console.log("[v0] Got auth message")

      // Sign message
      const signature = await walletService.signMessage(message)
      console.log("[v0] Message signed")

      // Login
      const { token, user_id } = await authAPI.login(walletAddress, message, signature, timestamp)
      console.log("[v0] Login successful")

      // Save token
      localStorage.setItem("pawnable_token", token)

      // Get user data
      const finalUserData = await userAPI.getMe()
      setUser(finalUserData)
      setIsConnected(true)
      console.log("[v0] Auth complete:", finalUserData)
    } catch (error: any) {
      console.error("[v0] Connection failed:", error)
      alert(`연결 실패: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    localStorage.removeItem("pawnable_token")
    walletService.disconnect()
    setUser(null)
    setIsConnected(false)
    console.log("[v0] Disconnected")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
