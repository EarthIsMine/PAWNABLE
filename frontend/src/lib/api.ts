import { mockAssets, mockLoans } from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085/api";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

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

export interface Asset {
  asset_id: string;
  blockchain: string;
  asset_type: string;
  symbol: string;
  name: string;
  contract_address?: string | null;
  decimals?: number | null;
}

export interface Token {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
  isAllowed: boolean;
}

export interface Intent {
  id: string;
  chainId: number;
  borrowerAddress: string;
  status: "ACTIVE" | "UNAVAILABLE" | "EXPIRED" | "CANCELLED" | "EXECUTED";
  verifyingContract: string;
  collateralTokenAddress: string;
  collateralAmount: string;
  principalTokenAddress: string;
  principalAmount: string;
  interestBps: number;
  durationSeconds: number;
  intentNonce: string;
  deadlineTimestamp: string;
  intentHash: string;
  signature: string;
  borrower?: { address: string };
  collateralToken?: { symbol: string; decimals: number; isNative?: boolean; address?: string };
  principalToken?: { symbol: string; decimals: number; isNative?: boolean; address?: string };
}

export interface IntentListResponse {
  intents: Intent[];
  total: number;
  limit: number;
  offset: number;
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

export type LoanIndexStatus = "ONGOING" | "REPAID" | "CLAIMED";

export interface LoanIndex {
  id: string;
  loanId: string;
  status: LoanIndexStatus;
  borrower: { address: string };
  lender: { address: string };
  intent?: {
    collateralToken: { symbol: string; decimals: number };
    principalToken: { symbol: string; decimals: number };
    principalAmount?: string;
    collateralAmount?: string;
    interestBps?: number;
  };
  startTimestamp: string;
  dueTimestamp: string;
}

export interface LoanListResponse {
  loans: LoanIndex[];
  total: number;
  limit: number;
  offset: number;
}

/* ----------------------------- */
/* internal helpers              */
/* ----------------------------- */

type FetchOptions = RequestInit;

async function mockFetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 250));

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

  // Tokens (mock from assets if present)
  if (endpoint === "/tokens") {
    const tokens = mockAssets
      .filter((a) => Boolean(a.contract_address))
      .map((a) => ({
        chainId: 1337,
        address: a.contract_address as string,
        symbol: a.symbol,
        decimals: a.decimals ?? 18,
        isNative: false,
        isAllowed: true,
      }));
    return tokens as T;
  }

  // Default
  return {} as T;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  if (USE_MOCK_DATA) return mockFetchAPI<T>(endpoint, options);

  const { headers: optHeaders, ...rest } = options;

  // ✅ HeadersInit 인덱싱 문제 방지: Headers 객체 사용
  const headers = new Headers();

  headers.set("Content-Type", "application/json");

  if (optHeaders) {
    // optHeaders가 어떤 형태이든 Headers로 안전하게 병합
    new Headers(optHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
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

// Asset APIs
export const assetAPI = {
  getAll() {
    return fetchAPI<Asset[]>("/assets");
  },

  getById(assetId: string) {
    return fetchAPI<Asset>(`/assets/${assetId}`);
  },

  getByBlockchain(blockchain: string) {
    return fetchAPI<Asset[]>(`/assets/blockchain/${blockchain}`);
  },

  create(data: Omit<Asset, "asset_id">) {
    return fetchAPI<Asset>("/assets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  delete(assetId: string) {
    return fetchAPI<void>(`/assets/${assetId}`, {
      method: "DELETE",
    });
  },
};

// Loan APIs
export const loanAPI = {
  getAll(params?: {
    status?: LoanIndexStatus;
    borrower?: string;
    lender?: string;
    limit?: number;
    offset?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.borrower) search.set("borrower", params.borrower);
    if (params?.lender) search.set("lender", params.lender);
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const query = search.toString();
    return fetchAPI<LoanListResponse>(`/loans${query ? `?${query}` : ""}`);
  },

  getMarketplace() {
    return fetchAPI<Loan[]>("/loans/marketplace");
  },

  getById(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}`);
  },

  getByBorrower(borrowerAddress: string) {
    return loanAPI.getAll({ borrower: borrowerAddress });
  },

  getByLender(lenderAddress: string) {
    return loanAPI.getAll({ lender: lenderAddress });
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
    });
  },

  match(loanId: string, lenderId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/match`, {
      method: "POST",
      body: JSON.stringify({ lender_id: lenderId }),
    });
  },

  activate(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/activate`, {
      method: "POST",
    });
  },

  repay(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/repay`, {
      method: "POST",
    });
  },

  liquidate(loanId: string) {
    return fetchAPI<Loan>(`/loans/${loanId}/liquidate`, {
      method: "POST",
    });
  },

  cancel(loanId: string) {
    return fetchAPI<void>(`/loans/${loanId}`, {
      method: "DELETE",
    });
  },
};

// Token APIs
export const tokenAPI = {
  getAll(params?: { isAllowed?: boolean }) {
    const query = params?.isAllowed == null ? "" : `?isAllowed=${String(params.isAllowed)}`;
    return fetchAPI<Token[]>(`/tokens${query}`);
  },

  getByAddress(address: string, chainId?: number) {
    const query = chainId == null ? "" : `?chainId=${chainId}`;
    return fetchAPI<Token>(`/tokens/${address}${query}`);
  },
};

// Intent APIs
export const intentAPI = {
  getById(id: string) {
    return fetchAPI<Intent>(`/intents/${id}`);
  },
  getAll(params?: {
    status?: Intent["status"];
    borrower?: string;
    collateralToken?: string;
    principalToken?: string;
    limit?: number;
    offset?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.borrower) search.set("borrower", params.borrower);
    if (params?.collateralToken) search.set("collateralToken", params.collateralToken);
    if (params?.principalToken) search.set("principalToken", params.principalToken);
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const query = search.toString();
    return fetchAPI<IntentListResponse>(`/intents${query ? `?${query}` : ""}`);
  },
  create(data: {
    chainId: number;
    verifyingContract: string;
    borrower: string;
    collateralToken: string;
    collateralAmount: string;
    principalToken: string;
    principalAmount: string;
    interestBps: number;
    durationSeconds: number;
    nonce: string;
    deadline: string;
    intentHash: string;
    signature: string;
  }) {
    return fetchAPI<Intent>("/intents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
