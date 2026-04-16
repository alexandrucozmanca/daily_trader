# Daily Market Tracker & AI Recommendation System

A TypeScript-based daily market tracker that fetches asset prices, sends data to the Claude API for analysis, and emails you a daily buy/sell/hold recommendation. Runs automatically via GitHub Actions.

## Prerequisites

- Node.js 20+
- GitHub account (for Actions scheduling)
- [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key) (free tier)
- [Anthropic API key](https://console.anthropic.com/)
- Gmail account with an App Password

## Local Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd market-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your API keys and email credentials in `.env`.

5. Run locally:
   ```bash
   npm run dev
   ```

## Configure Your Portfolio

Edit `src/portfolio.ts` to match your actual holdings:

```typescript
export const portfolio: Asset[] = [
  { symbol: "VOO",  type: "etf",    quantity: 1,    avgBuyPrice: 480 },
  { symbol: "AAPL", type: "stock",  quantity: 2,    avgBuyPrice: 170 },
  { symbol: "BTC",  type: "crypto", quantity: 0.01, avgBuyPrice: 55000 },
];

export const watchlist: string[] = ["NVDA", "MSFT", "ETH"];
```

## Gmail App Password Setup

1. Go to your [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** > **2-Step Verification** (enable it if not already)
3. Go to **App Passwords**
4. Generate a new app password for "Mail"
5. Use this generated password as `EMAIL_PASSWORD` — not your real Gmail password

## GitHub Actions Setup

1. Push this repo to GitHub

2. Go to your repo's **Settings** > **Secrets and variables** > **Actions**

3. Add these repository secrets:
   - `ALPHA_VANTAGE_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_TO`
   - `EMAIL_PASSWORD`

4. The workflow runs automatically at 7:00 AM UTC, Monday through Friday

5. To test manually: go to **Actions** > **Daily Market Tracker** > **Run workflow**

## Alpha Vantage Free Tier Limits

The free tier allows **25 API requests per day** and **500 per month**. Each symbol in your portfolio and watchlist uses one request. With the default configuration (3 portfolio + 3 watchlist = 6 symbols), you're well within limits.

If your portfolio + watchlist exceeds 20 symbols, the tracker will log a warning. Consider:
- Reducing the number of tracked symbols
- Upgrading to an Alpha Vantage premium plan
- Splitting symbols across multiple days

Note: there is a 12-second delay between API requests to respect rate limits.
