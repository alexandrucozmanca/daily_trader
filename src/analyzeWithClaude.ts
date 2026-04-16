import Anthropic from "@anthropic-ai/sdk";
import { Asset } from "./portfolio";
import { MarketSnapshot } from "./fetchMarketData";
import { DiscoveredAsset } from "./discoverAssets";

const SYSTEM_PROMPT = `You are a straight-talking daily market assistant writing a brief for a regular person 
who invests on the side. Not a finance professional — someone who wants to understand 
what's happening and what to do about it, in plain language.

Write in a casual, clear tone. No jargon. Short sentences. Explain the "why" behind 
every number in everyday language.

Structure your briefing exactly like this:

---
📊 PORTFOLIO TODAY
For each holding, show: current value, today's change in € (+ or -) and %, and total 
P&L since purchase. One line per asset. End with total portfolio value and total P&L.

---
📈 WHAT MOVED TODAY
2-3 bullet points on the biggest movers in the portfolio and watchlist. For each one, 
say what moved, by how much (the delta: +X% / -X%), and in plain language WHY it moved 
(earnings, news, sector mood, etc).

---
🎯 WHAT TO DO WITH WHAT YOU HAVE
For each asset currently held, give a clear BUY MORE / SELL / HOLD verdict with 1-2 
sentences explaining why in plain language. If selling, suggest how much to trim.
If buying more, suggest a cap in € (e.g. "consider adding up to €100").

---
🔍 NEW THINGS WORTH BUYING
For each discovered asset, give:
- Name + ticker
- What the company actually does (one plain sentence — assume the reader has never 
  heard of it)
- Why it looks interesting right now
- Suggested entry price range
- Suggested max position size in € for a small retail portfolio (e.g. "start with €50-100")
- Confidence level: Safe bet / Worth a punt / Speculative

---
👀 ONE TO WATCH
One asset from the watchlist to keep an eye on today, and what specific price or event 
to watch for.
---

Keep the whole thing under 450 words. Do not use the words "robust", "compelling", 
or "leverage". Do not add any financial disclaimer.`;

function buildUserPrompt(
  assets: Asset[],
  snapshots: MarketSnapshot[],
  discovered: DiscoveredAsset[],
  discoverySnapshots: MarketSnapshot[]
): string {
  const today = new Date().toISOString().split("T")[0];
  const snapshotMap = new Map(snapshots.map((s) => [s.symbol, s]));

  let prompt = `Date: ${today}\n\n`;

  prompt += "## Current Portfolio\n\n";
  prompt += "| Symbol | Type | Qty | Avg Buy Price | Current Price | P&L | P&L % |\n";
  prompt += "|--------|------|-----|---------------|---------------|-----|-------|\n";

  for (const asset of assets) {
    const snap = snapshotMap.get(asset.symbol);
    if (snap) {
      const totalCost = asset.quantity * asset.avgBuyPrice;
      const currentValue = asset.quantity * snap.currentPrice;
      const pnl = currentValue - totalCost;
      const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      prompt += `| ${asset.symbol} | ${asset.type} | ${asset.quantity} | $${asset.avgBuyPrice.toFixed(2)} | $${snap.currentPrice.toFixed(2)} | $${pnl.toFixed(2)} | ${pnlPercent.toFixed(1)}% |\n`;
    } else {
      prompt += `| ${asset.symbol} | ${asset.type} | ${asset.quantity} | $${asset.avgBuyPrice.toFixed(2)} | N/A | N/A | N/A |\n`;
    }
  }

  const watchlistSnapshots = snapshots.filter(
    (s) => !assets.some((a) => a.symbol === s.symbol)
  );
  if (watchlistSnapshots.length > 0) {
    prompt += "\n## Watchlist\n\n";
    prompt += "| Symbol | Current Price | Daily Change |\n";
    prompt += "|--------|---------------|-------------|\n";
    for (const snap of watchlistSnapshots) {
      prompt += `| ${snap.symbol} | $${snap.currentPrice.toFixed(2)} | ${snap.changePercent.toFixed(2)}% |\n`;
    }
  }

  if (discovered.length > 0) {
    const discSnapshotMap = new Map(discoverySnapshots.map((s) => [s.symbol, s]));
    prompt += "\n## Discovered Assets (AI-sourced today)\n\n";
    prompt += "| Symbol | Type | Current Price | Confidence | Reason |\n";
    prompt += "|--------|------|---------------|------------|--------|\n";
    for (const d of discovered) {
      const snap = discSnapshotMap.get(d.symbol);
      const price = snap ? `$${snap.currentPrice.toFixed(2)}` : "N/A";
      prompt += `| ${d.symbol} | ${d.type} | ${price} | ${d.confidence} | ${d.reason} |\n`;
    }
  }

  prompt += "\nPlease provide your daily market briefing based on the above data.";
  return prompt;
}

export async function analyzeWithClaude(
  assets: Asset[],
  snapshots: MarketSnapshot[],
  discovered: DiscoveredAsset[],
  discoverySnapshots: MarketSnapshot[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const userPrompt = buildUserPrompt(assets, snapshots, discovered, discoverySnapshots);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response received from Claude");
    }
    return textBlock.text;
  } catch (error) {
    throw new Error(
      `Claude API error: ${error instanceof Error ? error.message : error}`
    );
  }
}
