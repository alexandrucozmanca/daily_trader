import axios from "axios";
import { Asset } from "./portfolio";

export interface MarketSnapshot {
  symbol: string;
  currentPrice: number;
  changePercent: number;
  previousClose: number;
  volume?: number;
}

const API_BASE = "https://www.alphavantage.co/query";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStockQuote(
  symbol: string,
  apiKey: string
): Promise<MarketSnapshot | null> {
  try {
    const response = await axios.get(API_BASE, {
      params: {
        function: "GLOBAL_QUOTE",
        symbol,
        apikey: apiKey,
      },
    });

    const quote = response.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      console.warn(`No data returned for ${symbol}`);
      return null;
    }

    return {
      symbol,
      currentPrice: parseFloat(quote["05. price"]),
      changePercent: parseFloat(quote["10. change percent"]?.replace("%", "") || "0"),
      previousClose: parseFloat(quote["08. previous close"]),
      volume: parseInt(quote["06. volume"], 10),
    };
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchCryptoQuote(
  symbol: string,
  apiKey: string
): Promise<MarketSnapshot | null> {
  try {
    const response = await axios.get(API_BASE, {
      params: {
        function: "CURRENCY_EXCHANGE_RATE",
        from_currency: symbol,
        to_currency: "USD",
        apikey: apiKey,
      },
    });

    const rate = response.data["Realtime Currency Exchange Rate"];
    if (!rate || !rate["5. Exchange Rate"]) {
      console.warn(`No data returned for ${symbol}`);
      return null;
    }

    const currentPrice = parseFloat(rate["5. Exchange Rate"]);
    const bidPrice = parseFloat(rate["8. Bid Price"] || "0");
    const changePercent = bidPrice > 0 ? ((currentPrice - bidPrice) / bidPrice) * 100 : 0;

    return {
      symbol,
      currentPrice,
      changePercent,
      previousClose: bidPrice,
    };
  } catch (error) {
    console.error(`Failed to fetch crypto data for ${symbol}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function isCrypto(symbol: string, assets: Asset[]): boolean {
  const asset = assets.find((a) => a.symbol === symbol);
  if (asset) return asset.type === "crypto";
  return ["BTC", "ETH", "SOL", "ADA", "XRP", "DOGE", "DOT", "AVAX", "MATIC", "LINK"].includes(symbol);
}

export async function fetchMarketData(
  assets: Asset[],
  watchlist: string[]
): Promise<MarketSnapshot[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not set");
  }

  const allSymbols = [
    ...assets.map((a) => a.symbol),
    ...watchlist,
  ];
  const uniqueSymbols = [...new Set(allSymbols)];

  if (uniqueSymbols.length > 22) {
    console.warn(
      `Warning: ${uniqueSymbols.length} symbols exceeds the recommended limit of 22 for Alpha Vantage free tier (25 requests/day). Budget: ~15 portfolio+watchlist, ~5 discovered assets. Consider reducing symbols or upgrading your API plan.`
    );
  }

  const snapshots: MarketSnapshot[] = [];

  for (let i = 0; i < uniqueSymbols.length; i++) {
    const symbol = uniqueSymbols[i];
    console.log(`  Fetching ${symbol} (${i + 1}/${uniqueSymbols.length})...`);

    const snapshot = isCrypto(symbol, assets)
      ? await fetchCryptoQuote(symbol, apiKey)
      : await fetchStockQuote(symbol, apiKey);

    if (snapshot) {
      snapshots.push(snapshot);
    }

    if (i < uniqueSymbols.length - 1) {
      await delay(12000);
    }
  }

  return snapshots;
}
