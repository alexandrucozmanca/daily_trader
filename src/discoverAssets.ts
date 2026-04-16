import axios from "axios";
import { Asset } from "./portfolio";

export interface DiscoveredAsset {
  symbol: string;
  type: "stock" | "etf" | "crypto";
  reason: string;
  confidence: "high" | "medium" | "speculative";
}

function buildDiscoveryPrompt(portfolioSymbols: string[]): string {
  const today = new Date().toISOString().split("T")[0];
  return `Today is ${today}. Search the web for the most interesting stock, ETF, or crypto assets to consider buying right now. Focus on:
- Assets with strong momentum or a recent catalyst (earnings, news, sector trend)
- Undervalued assets showing signs of recovery
- Any emerging sector or theme gaining traction this week

Return ONLY a JSON array (no markdown, no preamble) of 3-5 assets in this format:
[
  {
    "symbol": "NVDA",
    "type": "stock",
    "reason": "Strong earnings beat + AI infrastructure demand continuing",
    "confidence": "high"
  }
]

Confidence must be one of: "high", "medium", "speculative".
Do not include assets already in this portfolio: ${portfolioSymbols.join(", ")}.`;
}

function parseDiscoveryResponse(text: string): DiscoveredAsset[] {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array");
  }

  return parsed.slice(0, 5).map((item: Record<string, unknown>) => ({
    symbol: String(item.symbol),
    type: item.type as "stock" | "etf" | "crypto",
    reason: String(item.reason),
    confidence: item.confidence as "high" | "medium" | "speculative",
  }));
}

export async function discoverAssets(
  portfolio: Asset[]
): Promise<DiscoveredAsset[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const portfolioSymbols = portfolio.map((a) => a.symbol);
  const prompt = buildDiscoveryPrompt(portfolioSymbols);

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    const content = response.data.content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((block) => block.type === "text");
    if (!textBlock || !textBlock.text) {
      console.warn("No text response from discovery call");
      return [];
    }

    return parseDiscoveryResponse(textBlock.text);
  } catch (error) {
    console.error(
      "Asset discovery failed:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
