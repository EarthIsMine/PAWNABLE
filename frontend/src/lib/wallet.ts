import { BrowserProvider, type JsonRpcSigner } from "ethers"

declare global {
  interface Window {
    ethereum?: any
  }
}

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

export class WalletService {
  private static instance: WalletService
  private provider: BrowserProvider | null = null
  private signer: JsonRpcSigner | null = null
  private mockAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService()
    }
    return WalletService.instance
  }

  async connect(): Promise<string> {
    if (USE_MOCK_DATA) {
      console.log("[v0] Using mock wallet address:", this.mockAddress)
      return this.mockAddress
    }

    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    try {
      this.provider = new BrowserProvider(window.ethereum)
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      this.signer = await this.provider.getSigner()
      return accounts[0]
    } catch (error: any) {
      throw new Error(error.message || "Failed to connect wallet")
    }
  }

  async getAccount(): Promise<string | null> {
    if (USE_MOCK_DATA) {
      return this.mockAddress
    }

    if (!this.provider) return null

    try {
      const accounts = await this.provider.listAccounts()
      return accounts[0]?.address || null
    } catch {
      return null
    }
  }

  async signMessage(message: string): Promise<string> {
    if (USE_MOCK_DATA) {
      console.log("[v0] Mock signing message:", message)
      return "0xmocksignature1234567890abcdef"
    }

    if (!this.signer) {
      throw new Error("Wallet not connected")
    }

    try {
      const signature = await this.signer.signMessage(message)
      return signature
    } catch (error: any) {
      throw new Error(error.message || "Failed to sign message")
    }
  }

  async switchNetwork(chainId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log("[v0] Mock network switch to:", chainId)
      return
    }

    if (!window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      })
    } catch (error: any) {
      throw new Error(error.message || "Failed to switch network")
    }
  }

  disconnect(): void {
    this.provider = null
    this.signer = null
  }
}

export const walletService = WalletService.getInstance()
