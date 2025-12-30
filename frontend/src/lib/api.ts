import { mockUsers, mockAssets, mockLoans } from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085/api";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
const TOKEN_KEY = "pawnable_token";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ----------------------------- */
/* Types (최소한의 공용 타입 정리) */
/* ----------------------------- */

export interface User {
  user_id: string;
  wallet_address: string;
  nickname?: string;
  email?: string;
}

export interface Asset {
  asset_id: string;
  blockchain: string;
  asset_type: string;
  symbol: string;
  name: string;
  contract_address?: string | null;
  decimals?: number | null;
}

export type LoanStatus = "pending" | "matched" | "active" | "repaid" | "liquidated" | "cancelled";

export interface CollateralInput {
  asset_id: string;
  amount: number;
  token_id?: string | null;
}

export interface Collateral extends CollateralInput {
  collateral_id?: string;
  loan_id?: string;
  locked_price?: number | null;
  locked_at?: string | null;
}

export interface Loan {
  loan_id: string;
  borrower_id: string;
  lender_id?: string | null;
  loan_asset_id: string;
  loan_amount: number;
  interest_rate_pct: number;
  total_repay_amount: number;
  repay_due_at: string;
  status: LoanStatus;
  created_at: string;
  matched_at?: string | null;
  closed_at?: string | null;
  collaterals?: Collateral[];
}

/* ----------------------------- */
/* internal helpers              */
/* ----------------------------- */

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type FetchOptions = RequestInit & {
  /** true면 Authorization 헤더를 강제 포함 */
  auth?: boolean;
};

async function mockFetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Auth
  if (endpoint === "/auth/message") {
    return {
      timestamp: Date.now(),
    } as T;
  }

  if (endpoint === "/auth/login") {
    return {
      token: "mock-jwt-token-12345",
      user_id: "mock-user-1",
    } as T;
  }

  if (endpoint === "/auth/verify") {
    return { valid: true, user_id: "mock-user-1" } as T;
  }

  // Users
  if (endpoint === "/users/me") return mockUsers[0] as T;

  if (endpoint.startsWith("/users/wallet/")) return mockUsers[0] as T;

  if (endpoint === "/users" && options.method === "POST") return mockUsers[0] as T;

  // Assets
  if (endpoint === "/assets") return mockAssets as T;

  if (endpoint.startsWith("/assets/")) {
    const assetId = endpoint.split("/").pop();
    return mockAssets.find((a) => a.asset_id === assetId) as T;
  }

  // Loans
  if (endpoint === "/loans/marketplace") {
    return mockLoans.filter((l) => l.status === "pending") as T;
  }

  if (endpoint === "/loans") return mockLoans as T;

  if (endpoint.startsWith("/loans/borrower/")) {
    const borrowerId = endpoint.split("/").pop();
    return mockLoans.filter((l) => l.borrower_id === borrowerId) as T;
  }

  if (endpoint.startsWith("/loans/lender/")) {
    const lenderId = endpoint.split("/").pop();
    return mockLoans.filter((l) => l.lender_id === lenderId) as T;
  }

  if (endpoint.match(/^\/loans\/[^/]+$/) && !endpoint.includes("/match") && !endpoint.includes("/activate")) {
    const loanId = endpoint.split("/").pop();
    return mockLoans.find((l) => l.loan_id === loanId) as T;
  }

  // Default
  return {} as T;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  if (USE_MOCK_DATA) return mockFetchAPI<T>(endpoint, options);

  const { auth, headers: optHeaders, ...rest } = options;

  // ✅ HeadersInit 인덱싱 문제 방지: Headers 객체 사용
  const headers = new Headers();

  headers.set("Content-Type", "application/json");

  if (optHeaders) {
    // optHeaders가 어떤 형태이든 Headers로 안전하게 병합
    new Headers(optHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers,
  });

  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Invalid server response", res.status);
  }

  if (!res.ok || payload.success === false) {
    throw new ApiError(payload.error || payload.message || "API request failed", res.status, payload);
  }

  return (payload.data as T) ?? (undefined as unknown as T);
}


/* ----------------------------- */
/* APIs                          */
/* ----------------------------- */

// Auth APIs
export const authAPI = {
  /**
   * 서명용 타임스탬프 발급
   * POST /api/auth/message
   * Response: { timestamp: number }
   */
  getMessage(walletAddress: string) {
    return fetchAPI<{ timestamp: number }>("/auth/message", {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress }),
      auth: false,
    });
  },

  /**
   * 로그인
   * POST /api/auth/login
   * { wallet_address, signature, timestamp }
   */
  login(walletAddress: string, signature: string, timestamp: number) {
    return fetchAPI<{ token: string; user_id: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        wallet_address: walletAddress,
        signature,
        timestamp,
      }),
      auth: false,
    });
  },

  /**
   * 토큰 검증
   * POST /api/auth/verify
   */
  verify() {
    return fetchAPI<{ valid: boolean; user_id: string }>("/auth/verify", {
      method: "POST",
      auth: true,
    });
  },
};

// User APIs
export const userAPI = {
  getMe() {
    return fetchAPI<User>("/users/me", { auth: true });
  },

  getAll() {
    return fetchAPI<User[]>("/users", { auth: true });
  },

  getById(userId: string) {
    return fetchAPI<User>(`/users/${userId}`, { auth: true });
  },

  getByWallet(walletAddress: string) {
    return fetchAPI<User>(`/users/wallet/${walletAddress}`, { auth: false });
  },

  create(data: { wallet_address: string; nickname?: string; email?: string }) {
    return fetchAPI<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
      auth: false,
    });
  },

  update(userId: string, data: { nickname?: string; email?: string }) {
    return fetchAPI<User>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      auth: true,
    });
  },

  delete(userId: string) {
    return fetchAPI<void>(`/users/${userId}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

// Asset APIs
export const assetAPI = {
  getAll() {
    return fetchAPI<Asset[]>("/assets", { auth: false });
  },

  getById(assetId: string) {
    return fetchAPI<Asset>(`/assets/${assetId}`, { auth: false });
  },

  getByBlockchain(blockchain: string) {
    return fetchAPI<Asset[]>(`/assets/blockchain/${blockchain}`, { auth: false });
  },

  create(data: Omit<Asset, "asset_id">) {
    return fetchAPI<Asset>("/assets", {
      method: "POST",
      body: JSON.stringify(data),
      auth: true,
    });
  },

  delete(assetId: string) {
    return fetchAPI<void>(`/assets/${assetId}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

// Loan APIs
export const loanAPI = {
  getAll() {
    return fetchAPI<Loan[]>("/loans", { auth: true });
  },

  getMarketplace() {
    return fetchAPI<Loan[]>("/loans/marketplace", { auth: false });
  },

  getById(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}`, { auth: true });
  },

  getByBorrower(borrowerId: string) {
    return fetchAPI<Loan[]>(`/loans/borrower/${borrowerId}`, { auth: true });
  },

  getByLender(lenderId: string) {
    return fetchAPI<Loan[]>(`/loans/lender/${lenderId}`, { auth: true });
  },

  create(data: {
    borrower_id: string;
    loan_asset_id: string;
    loan_amount: number;
    interest_rate_pct: number;
    total_repay_amount: number;
    repay_due_at: string;
    collaterals: CollateralInput[];
  }) {
    return fetchAPI<Loan>("/loans", {
      method: "POST",
      body: JSON.stringify(data),
      auth: true,
    });
  },

  match(loanId: string, lenderId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/match`, {
      method: "POST",
      body: JSON.stringify({ lender_id: lenderId }),
      auth: true,
    });
  },

  activate(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/activate`, {
      method: "POST",
      auth: true,
    });
  },

  repay(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/repay`, {
      method: "POST",
      auth: true,
    });
  },

  liquidate(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/liquidate`, {
      method: "POST",
      auth: true,
    });
  },

  cancel(loanId: string) {
    return fetchAPI<void>(`/loans/${loanId}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
