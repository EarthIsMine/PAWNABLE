import { mockUsers, mockAssets, mockLoans } from "@/lib/mock-data"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085/api"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function mockFetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  console.log("[v0] Mock API call:", endpoint, options.method || "GET")

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Handle different endpoints
  if (endpoint === "/auth/message") {
    return {
      message: "Sign this message to authenticate with PAWNABLE",
      timestamp: Date.now(),
    } as T
  }

  if (endpoint === "/auth/login") {
    return {
      token: "mock-jwt-token-12345",
      user_id: "mock-user-1",
    } as T
  }

  if (endpoint === "/auth/verify") {
    return {
      valid: true,
      user_id: "mock-user-1",
    } as T
  }

  if (endpoint === "/users/me") {
    return mockUsers[0] as T
  }

  if (endpoint.startsWith("/users/wallet/")) {
    return mockUsers[0] as T
  }

  if (endpoint === "/users" && options.method === "POST") {
    return mockUsers[0] as T
  }

  if (endpoint === "/assets") {
    return mockAssets as T
  }

  if (endpoint.startsWith("/assets/")) {
    const assetId = endpoint.split("/").pop()
    return mockAssets.find((a) => a.asset_id === assetId) as T
  }

  if (endpoint === "/loans/marketplace") {
    return mockLoans.filter((l) => l.status === "pending") as T
  }

  if (endpoint === "/loans") {
    return mockLoans as T
  }

  if (endpoint.startsWith("/loans/borrower/")) {
    const borrowerId = endpoint.split("/").pop()
    return mockLoans.filter((l) => l.borrower_id === borrowerId) as T
  }

  if (endpoint.startsWith("/loans/lender/")) {
    const lenderId = endpoint.split("/").pop()
    return mockLoans.filter((l) => l.lender_id === lenderId) as T
  }

  if (endpoint.match(/^\/loans\/[^/]+$/) && !endpoint.includes("/match") && !endpoint.includes("/activate")) {
    const loanId = endpoint.split("/").pop()
    return mockLoans.find((l) => l.loan_id === loanId) as T
  }

  console.warn("[v0] Unhandled mock endpoint:", endpoint)
  return {} as T
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use mock data if enabled
  if (USE_MOCK_DATA) {
    return mockFetchAPI<T>(endpoint, options)
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("pawnable_token") : null

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data: ApiResponse<T> = await response.json()

    if (!response.ok || !data.success) {
      throw new ApiError(data.error || data.message || "API request failed", response.status, data)
    }

    return data.data as T
  } catch (error) {
    console.error("[v0] API fetch error:", error)
    // If fetch fails and we're in development, suggest using mock data
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn("[v0] API 연결 실패. NEXT_PUBLIC_USE_MOCK_DATA=true를 설정하여 목 데이터를 사용하세요.")
    }
    throw error
  }
}

// Auth APIs
export const authAPI = {
  async getMessage(walletAddress: string) {
    return fetchAPI<{ message: string; timestamp: number }>("/auth/message", {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress }),
    })
  },

  async login(walletAddress: string, message: string, signature: string, timestamp: number) {
    return fetchAPI<{ token: string; user_id: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        wallet_address: walletAddress,
        message,
        signature,
        timestamp,
      }),
    })
  },

  async verify() {
    return fetchAPI<{ valid: boolean; user_id: string }>("/auth/verify", {
      method: "POST",
    })
  },
}

// User APIs
export const userAPI = {
  async getMe() {
    return fetchAPI<any>("/users/me")
  },

  async getByWallet(walletAddress: string) {
    return fetchAPI<any>(`/users/wallet/${walletAddress}`)
  },

  async create(data: { wallet_address: string; nickname?: string; email?: string }) {
    return fetchAPI<any>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async update(userId: string, data: { nickname?: string; email?: string }) {
    return fetchAPI<any>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
}

// Asset APIs
export const assetAPI = {
  async getAll() {
    return fetchAPI<any[]>("/assets")
  },

  async getById(assetId: string) {
    return fetchAPI<any>(`/assets/${assetId}`)
  },

  async getByBlockchain(blockchain: string) {
    return fetchAPI<any[]>(`/assets/blockchain/${blockchain}`)
  },
}

// Loan APIs
export const loanAPI = {
  async getAll() {
    return fetchAPI<any[]>("/loans")
  },

  async getMarketplace() {
    return fetchAPI<any[]>("/loans/marketplace")
  },

  async getById(loanId: string) {
    return fetchAPI<any>(`/loans/${loanId}`)
  },

  async getByBorrower(borrowerId: string) {
    return fetchAPI<any[]>(`/loans/borrower/${borrowerId}`)
  },

  async getByLender(lenderId: string) {
    return fetchAPI<any[]>(`/loans/lender/${lenderId}`)
  },

  async create(data: {
    borrower_id: string
    loan_asset_id: string
    loan_amount: number
    interest_rate_pct: number
    total_repay_amount: number
    repay_due_at: string
    collaterals: Array<{
      asset_id: string
      amount: number
      token_id?: string
    }>
  }) {
    return fetchAPI<any>("/loans", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async match(loanId: string, lenderId: string) {
    return fetchAPI<any>(`/loans/${loanId}/match`, {
      method: "POST",
      body: JSON.stringify({ lender_id: lenderId }),
    })
  },

  async activate(loanId: string) {
    return fetchAPI<any>(`/loans/${loanId}/activate`, {
      method: "POST",
    })
  },

  async repay(loanId: string) {
    return fetchAPI<any>(`/loans/${loanId}/repay`, {
      method: "POST",
    })
  },

  async liquidate(loanId: string) {
    return fetchAPI<any>(`/loans/${loanId}/liquidate`, {
      method: "POST",
    })
  },

  async cancel(loanId: string) {
    return fetchAPI<any>(`/loans/${loanId}`, {
      method: "DELETE",
    })
  },
}
