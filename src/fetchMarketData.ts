import axios from "axios";
import { Asset } from "./portfolio";

export interface MarketSnapshot {
  symbol: string;
  currentPrice: number;
  changePercent: number;
  previousClose: number;
  volume?: number;
}

const API_BASE = "https://api.twelvedata.com/quote";

const KNOWN_CRYPTO = ["BTC", "ETH", "SOL", "ADA", "XRP", "DOGE", "DOT", "AVAX", "MATIC", "LINK"];

function isCrypto(symbol: string, assets: Asset[]): boolean {
  const asset = assets.find((a) => a.symbol === symbol);
  if (asset) return asset.type === "crypto";
  return KNOWN_CRYPTO.includes(symbol);
}

function toTwelveDataSymbol(symbol: string, assets: Asset[]): string {
  // Crypto symbols need /USD suffix for Twelve Data
  if (isCrypto(symbol, assets)) {
    return `${symbol}/USD`;
  }
  // European tickers like VWCE.DE → VWCE:XETRA (Twelve Data uses exchange suffix)
  const exchangeMap: Record<string, string> = {
    DE: "XETRA",
    L: "LSE",
    PA: "Euronext",
    AS: "Euronext",
    MI: "MIL",
    SW: "SIX",
  };
  const dotIndex = symbol.lastIndexOf(".");
  if (dotIndex !== -1) {
    const suffix = symbol.substring(dotIndex + 1);
    const exchange = exchangeMap[suffix];
    if (exchange) {
      return `${symbol.substring(0, dotIndex)}:${exchange}`;
    }
  }
  return symbol;
}

async function fetchQuote(
  symbol: string,
  apiKey: string,
  assets: Asset[]
): Promise<MarketSnapshot | null> {
  const tdSymbol = toTwelveDataSymbol(symbol, assets);
  try {
    const response = await axios.get(API_BASE, {
      params: {
        symbol: tdSymbol,
        apikey: apiKey,
      },
    });

    const data = response.data;
    console.log(`[DEBUG] ${symbol}:`, JSON.stringify(data, null, 2)); // TODO: remove
    if (data.code === 400 || data.status === "error" || !data.close) {
      console.warn(`No data returned for ${symbol}`);
      return null;
    }

    const currentPrice = parseFloat(data.close);
    const previousClose = parseFloat(data.previous_close);
    const changePercent = parseFloat(data.percent_change);

    return {
      symbol,
      currentPrice,
      changePercent,
      previousClose,
      volume: data.volume ? parseInt(data.volume, 10) : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function fetchMarketData(
  assets: Asset[],
  watchlist: string[]
): Promise<MarketSnapshot[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not set");
  }

  const allSymbols = [
    ...assets.map((a) => a.symbol),
    ...watchlist,
  ];
  const uniqueSymbols = [...new Set(allSymbols)];

  const snapshots: MarketSnapshot[] = [];

  for (let i = 0; i < uniqueSymbols.length; i++) {
    const symbol = uniqueSymbols[i];
    console.log(`  Fetching ${symbol} (${i + 1}/${uniqueSymbols.length})...`);

    const snapshot = await fetchQuote(symbol, apiKey, assets);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return snapshots;
}
