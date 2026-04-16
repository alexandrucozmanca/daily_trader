import dotenv from "dotenv";
dotenv.config();

import { portfolio, watchlist } from "./portfolio";
import { fetchMarketData } from "./fetchMarketData";
import { discoverAssets } from "./discoverAssets";
import { analyzeWithClaude } from "./analyzeWithClaude";
import { sendEmail } from "./sendEmail";

async function main() {
  console.log("Fetching market data...");
  const snapshots = await fetchMarketData(portfolio, watchlist);

  if (snapshots.length === 0) {
    throw new Error("No market data retrieved. Check your API key and symbols.");
  }

  console.log(`Retrieved data for ${snapshots.length} symbols.`);

  console.log("Discovering new assets...");
  const discovered = await discoverAssets(portfolio);
  console.log(`Discovered ${discovered.length} assets.`);

  // Skip discovered assets already fetched via portfolio or watchlist
  const alreadyFetched = new Set(snapshots.map((s) => s.symbol));
  const newDiscovered = discovered.filter((d) => !alreadyFetched.has(d.symbol));

  let discoverySnapshots = snapshots.filter(() => false); // empty typed array
  if (newDiscovered.length > 0) {
    console.log("Fetching prices for discovered assets...");
    discoverySnapshots = await fetchMarketData(
      newDiscovered.map((d) => ({ symbol: d.symbol, type: d.type, quantity: 0, avgBuyPrice: 0 })),
      []
    );
  }
  // For discovered assets already in snapshots, reuse their data
  const reusedSnapshots = snapshots.filter((s) =>
    discovered.some((d) => d.symbol === s.symbol) && !portfolio.some((p) => p.symbol === s.symbol)
  );
  discoverySnapshots = [...discoverySnapshots, ...reusedSnapshots];

  // Wait for rate limit window to reset between discovery and analysis calls
  console.log("Waiting 60s for rate limit cooldown...");
  await new Promise((resolve) => setTimeout(resolve, 60000));

  console.log("Requesting Claude analysis...");
  const analysis = await analyzeWithClaude(portfolio, snapshots, discovered, discoverySnapshots);

  console.log("Sending email...");
  await sendEmail(analysis);

  console.log("Done.");
}

main().catch((error) => {
  console.error("Market tracker failed:", error);
  process.exit(1);
});
