import { apiRequest } from "@/services/api";
import { fetchProperties } from "@/services/property";
import type { Investment, Listing } from "@/types";

type NumericLike = number | string | null;

type PurchasedTotalsResponse = {
  propertiesCount: NumericLike;
  totalSharesOwned: NumericLike;
  totalPurchasePrice: NumericLike;
  totalCurrentValue: NumericLike;
  totalYieldEarned: NumericLike;
  totalClaimableYield: NumericLike;
};

type PurchasedInvestmentResponse = {
  propertyId: string;
  propertyName: string;
  propertyStatus: string;
  sharesOwned: NumericLike;
  avgCostPerShare: NumericLike;
  purchasePrice: NumericLike;
  currentValue: NumericLike;
  yieldEarned: NumericLike;
  claimableYield: NumericLike;
  investedAt: string;
  isOwner: boolean;
  currentPricePerShare: NumericLike;
};

type OwnedListingResponse = {
  propertyId: string;
  propertyName: string;
  status: string;
  totalShares: NumericLike;
  availableShares: NumericLike;
  soldShares: NumericLike;
  pricePerShare: NumericLike;
  createdAt: string;
};

type InvestmentsMeResponse = {
  walletAddress: string;
  purchasedTotals: PurchasedTotalsResponse;
  purchasedInvestments: PurchasedInvestmentResponse[];
  ownedListingsTotals: {
    propertiesCount: NumericLike;
    totalSharesIssued: NumericLike;
    totalSharesAvailable: NumericLike;
    totalSharesSold: NumericLike;
  };
  ownedListings: OwnedListingResponse[];
};

export type WalletInvestmentsSummary = {
  walletAddress: string;
  totals: {
    propertiesCount: number;
    totalSharesOwned: number;
    totalPurchasePrice: number;
    totalCurrentValue: number;
    totalYieldEarned: number;
    totalClaimableYield: number;
  };
  investments: Investment[];
  listings: Listing[];
};

function toNumber(value: NumericLike, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toListingStatus(rawStatus: string): Listing["status"] {
  const normalized = rawStatus?.trim().toLowerCase();
  if (normalized === "live") return "live";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "pending") return "pending";
  return "draft";
}

export async function fetchMyInvestments(): Promise<WalletInvestmentsSummary> {
  const response = await apiRequest<InvestmentsMeResponse>(
    "/api/investments/me",
    {
      method: "GET",
      requiresAuth: true,
    },
  );

  let properties: Awaited<ReturnType<typeof fetchProperties>> = [];
  try {
    properties = await fetchProperties(1, 100);
  } catch {
    // Keep portfolio usable even if public property feed is temporarily unavailable.
    properties = [];
  }
  const propertiesById = new Map(
    properties.map((property) => [property.id, property]),
  );

  const investments: Investment[] = (response.purchasedInvestments ?? []).map(
    (item) => {
      const sharesOwned = toNumber(item.sharesOwned);
      const purchasePrice = toNumber(item.purchasePrice);
      const currentValue = toNumber(item.currentValue);
      const yieldEarned = toNumber(item.yieldEarned);
      const claimableYield = toNumber(item.claimableYield);

      const property = propertiesById.get(item.propertyId);
      const roi =
        purchasePrice > 0
          ? ((currentValue + yieldEarned - purchasePrice) / purchasePrice) * 100
          : 0;

      return {
        id: `${item.propertyId}-${item.investedAt}`,
        propertyId: item.propertyId,
        propertyName: item.propertyName,
        propertyLocation: property?.location ?? "Location unavailable",
        propertyImage:
          property?.image ??
          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
        sharesOwned,
        pricePerShare: toNumber(
          item.currentPricePerShare,
          toNumber(item.avgCostPerShare),
        ),
        purchasePrice,
        currentValue,
        yieldEarned,
        claimableYield,
        roi,
        investedAt: item.investedAt,
      };
    },
  );

  const listings: Listing[] = (response.ownedListings ?? []).map((item) => {
    const totalShares = toNumber(item.totalShares);
    const soldShares = toNumber(item.soldShares);
    const pricePerShare = toNumber(item.pricePerShare);

    return {
      id: item.propertyId,
      propertyName: item.propertyName,
      status: toListingStatus(item.status),
      investors: 0,
      amountRaised: soldShares * pricePerShare,
      totalTarget: totalShares * pricePerShare,
      createdAt: item.createdAt,
    };
  });

  return {
    walletAddress: response.walletAddress,
    totals: {
      propertiesCount: toNumber(response.purchasedTotals?.propertiesCount),
      totalSharesOwned: toNumber(response.purchasedTotals?.totalSharesOwned),
      totalPurchasePrice: toNumber(
        response.purchasedTotals?.totalPurchasePrice,
      ),
      totalCurrentValue: toNumber(response.purchasedTotals?.totalCurrentValue),
      totalYieldEarned: toNumber(response.purchasedTotals?.totalYieldEarned),
      totalClaimableYield: toNumber(
        response.purchasedTotals?.totalClaimableYield,
      ),
    },
    investments,
    listings,
  };
}
