export interface Asset {
  symbol: string;
  type: "stock" | "etf" | "crypto";
  quantity: number;
  avgBuyPrice: number;
}

if (!process.env.PORTFOLIO_JSON) {
  throw new Error("PORTFOLIO_JSON environment variable is not set");
}

export const portfolio: Asset[] = JSON.parse(process.env.PORTFOLIO_JSON);

export const watchlist: string[] = [];
