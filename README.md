# Daily Market Tracker & AI Recommendation System

A TypeScript-based daily market tracker that fetches asset prices, discovers trending assets via Claude's web search, and emails you a daily buy/sell/hold recommendation. Runs automatically via GitHub Actions.

## Prerequisites

- Node.js 20+
- GitHub account (for Actions scheduling)
- [Twelve Data API key](https://twelvedata.com/) (free tier)
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

4. Fill in your API keys, email credentials, and portfolio in `.env`.

5. Run locally:
   ```bash
   npm run dev
   ```

## Configure Your Portfolio

Your portfolio is defined via the `PORTFOLIO_JSON` environment variable. Set it in your `.env` file or as a GitHub Actions secret:

```json
[
  {"symbol": "VOO",  "type": "etf",    "quantity": 1,    "avgBuyPrice": 480},
  {"symbol": "AAPL", "type": "stock",  "quantity": 2,    "avgBuyPrice": 170},
  {"symbol": "BTC",  "type": "crypto", "quantity": 0.01, "avgBuyPrice": 55000}
]
```

The app will fail on startup if `PORTFOLIO_JSON` is missing or empty.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TWELVE_DATA_API_KEY` | API key from [Twelve Data](https://twelvedata.com/) |
| `ANTHROPIC_API_KEY` | API key from [Anthropic](https://console.anthropic.com/) |
| `PORTFOLIO_JSON` | JSON array of your holdings (see above) |
| `EMAIL_FROM` | Gmail address to send from |
| `EMAIL_TO` | Recipient email address |
| `EMAIL_PASSWORD` | Gmail App Password (not your real password) |

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
   - `TWELVE_DATA_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `PORTFOLIO_JSON`
   - `EMAIL_FROM`
   - `EMAIL_TO`
   - `EMAIL_PASSWORD`

4. The workflow runs automatically at 7:00 AM UTC, Monday through Friday

5. To test manually: go to **Actions** > **Daily Market Tracker** > **Run workflow**

## How It Works

1. **Fetch market data** — pulls quotes from [Twelve Data](https://twelvedata.com/) for your portfolio and watchlist. Supports US stocks, European tickers (e.g. `VWCE.DE`), and crypto.
2. **Discover assets** — asks Claude (with web search) to find 3-5 trending assets worth watching. Assets already in your portfolio or watchlist are not re-fetched.
3. **Analyze** — sends all data to Claude for a plain-language daily briefing with buy/sell/hold verdicts and new asset recommendations.
4. **Email** — delivers the briefing to your inbox.
