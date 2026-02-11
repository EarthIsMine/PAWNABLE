const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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
/* Types                         */
/* ----------------------------- */

export interface Token {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
  isAllowed: boolean;
}

export type LoanRequestStatus = "OPEN" | "FUNDED" | "CANCELLED";

export interface LoanRequest {
  id: string;
  chainId: number;
  contractAddress: string;
  onchainRequestId: string;
  borrowerAddress: string;
  collateralTokenAddress: string;
  collateralAmount: string;
  principalTokenAddress: string;
  principalAmount: string;
  interestBps: number;
  durationSeconds: number;
  status: LoanRequestStatus;
  createTxHash: string;
  cancelTxHash?: string | null;
  createdAtBlock: string;
  indexedAt: string;
  borrower?: { address: string };
  collateralToken?: { symbol: string; decimals: number; isNative?: boolean; address?: string };
  principalToken?: { symbol: string; decimals: number; isNative?: boolean; address?: string };
  loan?: LoanIndex | null;
}

export interface LoanRequestListResponse {
  loanRequests: LoanRequest[];
  total: number;
  limit: number;
  offset: number;
}

export type LoanIndexStatus = "ONGOING" | "REPAID" | "CLAIMED";

export interface LoanIndex {
  id: string;
  onchainLoanId: string;
  status: LoanIndexStatus;
  borrower: { address: string };
  lender: { address: string };
  request?: {
    id?: string;
    collateralTokenAddress: string;
    collateralAmount: string;
    principalTokenAddress: string;
    principalAmount: string;
    interestBps: number;
    collateralToken: { symbol: string; decimals: number };
    principalToken: { symbol: string; decimals: number };
  };
  startTimestamp: string;
  dueTimestamp: string;
  fundTxHash: string;
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

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { headers: optHeaders, ...rest } = options;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (optHeaders) {
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

// Loan Request APIs
export const loanRequestAPI = {
  getAll(params?: {
    status?: LoanRequestStatus;
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
    return fetchAPI<LoanRequestListResponse>(`/loan-requests${query ? `?${query}` : ""}`);
  },

  getById(id: string) {
    return fetchAPI<LoanRequest>(`/loan-requests/${id}`);
  },

  create(data: {
    chainId: number;
    contractAddress: string;
    onchainRequestId: string;
    borrower: string;
    collateralToken: string;
    collateralAmount: string;
    principalToken: string;
    principalAmount: string;
    interestBps: number;
    durationSeconds: number;
    createTxHash: string;
    createdAtBlock: string;
  }) {
    return fetchAPI<LoanRequest>("/loan-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  cancel(id: string, cancelTxHash: string) {
    return fetchAPI<LoanRequest>(`/loan-requests/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ cancelTxHash }),
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

  getById(id: string) {
    return fetchAPI<LoanIndex>(`/loans/${id}`);
  },

  create(data: {
    chainId: number;
    contractAddress: string;
    onchainLoanId: string;
    onchainRequestId: string;
    borrower: string;
    lender: string;
    startTimestamp: string;
    dueTimestamp: string;
    fundTxHash: string;
  }) {
    return fetchAPI<LoanIndex>("/loans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateStatus(id: string, status: "REPAID" | "CLAIMED", txHash: string) {
    return fetchAPI<LoanIndex>(`/loans/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, txHash }),
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
