export interface Asset {
  symbol: string;
  type: "stock" | "etf" | "crypto";
  quantity: number;
  avgBuyPrice: number;
}

export const portfolio: Asset[] = JSON.parse(process.env.PORTFOLIO_JSON || "[]");

export const watchlist: string[] = [];
