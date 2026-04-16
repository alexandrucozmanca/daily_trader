export interface Asset {
  symbol: string;
  type: "stock" | "etf" | "crypto";
  quantity: number;
  avgBuyPrice: number;
}

export const portfolio: Asset[] = [
  { symbol: "VWCE.DE", type: "etf", quantity: 7.63, avgBuyPrice: 151.66 }
];

export const watchlist: string[] = [];
