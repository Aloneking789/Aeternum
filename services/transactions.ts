import { apiRequest } from "@/services/api";

type NumericLike = number | string | null;

export type PropertyQuote = {
  pricePerShare: number;
  platformFeeRate: number;
  usdcRequired: number;
  platformFee: number;
  availableShares: number;
};

type QuoteResponse = {
  pricePerShare: NumericLike;
  platformFeeRate: NumericLike;
  usdcRequired: NumericLike;
  platformFee: NumericLike;
  availableShares: NumericLike;
};

export type InitiateBuyResponse = {
  escrowPDA: string;
  usdcAmount: string;
  platformFee: string;
  unsignedTx: string;
};

export type SellQuote = {
  proceedsUsdc: number;
  feeAmount: number;
  netProceeds: number;
  pnl: number;
};

type SellQuoteResponse = {
  proceedsUsdc: NumericLike;
  feeAmount: NumericLike;
  netProceeds: NumericLike;
  pnl: NumericLike;
};

export type InitiateSellResponse = {
  unsignedTx: string;
};

export type ConfirmBuyResponse = {
  success: boolean;
  investmentRecord?: {
    id: string;
    userWallet: string;
    propertyId: string;
    sharesOwned: number;
  };
  updatedInvestment?: {
    id: string;
    sharesOwned: number;
  };
  tokenAccountAddress?: string;
};

function toNumber(value: NumericLike, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export async function fetchPropertyQuote(
  propertyId: string,
  shares: number,
): Promise<PropertyQuote> {
  const response = await apiRequest<QuoteResponse>(
    `/api/properties/${propertyId}/quote?shares=${shares}`,
    {
      method: "GET",
      requiresAuth: true,
    },
  );

  return {
    pricePerShare: toNumber(response.pricePerShare),
    platformFeeRate: toNumber(response.platformFeeRate),
    usdcRequired: toNumber(response.usdcRequired),
    platformFee: toNumber(response.platformFee),
    availableShares: toNumber(response.availableShares),
  };
}

export async function initiateBuyTransaction(params: {
  propertyId: string;
  shares: number;
  walletAddress: string;
}): Promise<InitiateBuyResponse> {
  return apiRequest<InitiateBuyResponse>("/api/transactions/initiate-buy", {
    method: "POST",
    body: params,
    requiresAuth: true,
  });
}

export async function fetchSellQuote(params: {
  propertyId: string;
  shares: number;
  walletAddress: string;
}): Promise<SellQuote> {
  const response = await apiRequest<SellQuoteResponse>(
    `/api/investments/${params.propertyId}/sell-quote?shares=${params.shares}&walletAddress=${encodeURIComponent(params.walletAddress)}`,
    {
      method: "GET",
      requiresAuth: true,
    },
  );

  return {
    proceedsUsdc: toNumber(response.proceedsUsdc),
    feeAmount: toNumber(response.feeAmount),
    netProceeds: toNumber(response.netProceeds),
    pnl: toNumber(response.pnl),
  };
}

export async function initiateSellTransaction(params: {
  propertyId: string;
  shares: number;
  walletAddress: string;
}): Promise<InitiateSellResponse> {
  return apiRequest<InitiateSellResponse>("/api/transactions/initiate-sell", {
    method: "POST",
    body: params,
    requiresAuth: true,
  });
}

export async function confirmTransaction(params: {
  txSignature: string;
  propertyId: string;
  shares: number;
  side: "buy" | "sell";
}): Promise<ConfirmBuyResponse> {
  return apiRequest<ConfirmBuyResponse>("/api/transactions/confirm", {
    method: "POST",
    body: params,
    requiresAuth: true,
  });
}
