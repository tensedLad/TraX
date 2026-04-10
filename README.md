# 📊 TraX — The Virtual Trading Exchange

A modern **virtual stock exchange** where you can trade anything — from bananas to trending internet memes — using virtual TraX Tokens (₮). Built with React 19, Vite, Supabase, and TradingView Lightweight Charts. Features real order book matching, professional charting, and a leaderboard system. Designed with a premium dark-mode aesthetic for professional-grade trading simulation.

Every new user gets **₮10,000** in virtual currency to start trading immediately.

---

## 📖 Quick Navigation

- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [FAQs](#-frequently-asked-questions)
- [Contributing](#-contributing)

---

## ⚡ Key Features

| Feature                    | Description                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| 💱 **Real Order Book**     | Live market order matching with bid/ask spreads                          |
| 📊 **Professional Charts** | TradingView Lightweight Charts with multiple timeframes (1m, 5m, 1h, 1D) |
| 🎯 **Order Types**         | Market, Limit, and Stop Loss orders with Take Profit                     |
| 🏆 **Leaderboard**         | Real-time ranking by net worth + "Rekt Board" for losses                 |
| 🗳️ **Community Proposals** | Propose new assets and vote (50 votes = auto-approval)                   |
| 🔐 **Secure Auth**         | Email/password + Google OAuth via Supabase                               |
| 📱 **Responsive Design**   | Works seamlessly on desktop, tablet, and mobile                          |
| 🌙 **Premium UI**          | Dark-mode trading terminal with professional aesthetics                  |
| 💼 **Portfolio Tracking**  | Monitor holdings, trade history, and P&L in real-time                    |
| ⚙️ **Real-Time Updates**   | Supabase broadcasts for instant price and order updates                  |

---

## 🛠 Technology Stack

### Frontend

- **React 19** — Latest React with hooks and concurrent features
- **Vite 8** — Lightning-fast build tool and dev server
- **TailwindCSS 4** — Utility-first dark-mode styling
- **React Router 7** — Client-side navigation
- **TradingView Lightweight Charts** — Professional candlestick charts
- **Supabase JS Client** — Real-time API and authentication

### Backend & Database

- **Supabase** — PostgreSQL + Auth + Real-time subscriptions
- **PostgreSQL 14** — Relational database
- **JWT** — Stateless token authentication
- **Row-Level Security (RLS)** — Database-enforced access control

### Infrastructure & Deployment

- **Vercel** — Frontend hosting with automatic deployments
- **GitHub** — Version control and CI/CD

---

## 🔄 How It Works

### **Step 1: Sign Up**

- Register with email/password or Google OAuth
- Instant ₮10,000 virtual currency allocation
- Profile automatically created in Supabase

### **Step 2: Explore the Market**

- Browse all available assets (Physical goods, Commodities, Meme stocks)
- View real-time prices with professional candlestick charts
- Check order book (bids/asks) and recent trades

### **Step 3: Trade**

- **Market Orders**: Buy/sell immediately at current best price
- **Limit Orders**: Wait on the order book until price matches
- **Stop Loss**: Automatically sell if price drops below your target
- **Take Profit**: Automatically sell if price reaches your profit target
- All orders execute against a live order book with real matching

### **Step 4: Monitor Portfolio**

- Track holdings, balance, and trade history
- Monitor P&L in real-time
- Receive instant notifications on order fills

### **Step 5: Climb the Leaderboard**

- Ranked by net worth (balance + portfolio value)
- Top 20 traders on "Rich List"
- Bottom 3 on "Rekt Board" (those below ₮10,000)

### **Step 6: Propose New Assets (Optional)**

- Submit a proposal with asset details (name, ticker, category, IPO price, supply)
- Community votes on your proposal
- 50+ votes = automatic approval and listing on the exchange

---

## 🗄 Database Overview

TraX uses PostgreSQL via Supabase with the following main tables:

| Table           | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `profiles`      | User account data (username, avatar, balance, net worth)     |
| `assets`        | Tradable assets (ticker, price, category, market cap)        |
| `orders`        | User orders (buy/sell, market/limit/stop, status)            |
| `trades`        | Completed trades (buyer, seller, price, quantity, timestamp) |
| `holdings`      | User positions (what asset they own, how much)               |
| `price_history` | Historical price data for charting                           |
| `proposals`     | Community asset proposals                                    |
| `votes`         | Votes on proposals                                           |
| `leaderboard`   | Cached leaderboard rankings (net worth, trade count)         |

All data is protected with **Row-Level Security (RLS)** — users can only see their own data.

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+
- npm or yarn

### **1. Clone & Install**

```bash
git clone https://github.com/your-username/TraX.git
cd TraX
npm install
```

### **2. Environment Setup**

Create `.env.local` in project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3. Run**

```bash
npm run dev
```

Visit http://localhost:5173

### **4. Build for Production**

```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```
TraX/
├── src/
│   ├── App.jsx                   # Main app entry + routing
│   ├── main.jsx                  # React DOM render
│   ├── index.css                 # Global styles
│   │
│   ├── components/               # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Layout.jsx
│   │   ├── Skeleton.jsx
│   │   ├── Toast.jsx
│   │   └── Ticker.jsx
│   │
│   ├── context/
│   │   └── AuthContext.jsx       # User auth + profile state
│   │
│   ├── lib/
│   │   └── supabase.js           # Supabase client
│   │
│   └── pages/                    # Full page components
│       ├── Landing.jsx           # Homepage
│       ├── Auth.jsx              # Login/Signup
│       ├── Market.jsx            # Asset listing
│       ├── AssetDetail.jsx       # Trading interface
│       ├── Portfolio.jsx         # User holdings
│       ├── Leaderboard.jsx       # Rankings
│       ├── Propose.jsx           # Asset proposals
│       ├── HowItWorks.jsx        # Tutorial
│       ├── Profile.jsx           # User settings
│       ├── FAQ.jsx
│       ├── Privacy.jsx
│       ├── Terms.jsx
│       └── NotFound.jsx
│       ├── Leaderboard.jsx          # User rankings
│       ├── Propose.jsx              # Asset proposal interface
│       ├── HowItWorks.jsx           # Tutorial / guide page
│       ├── Profile.jsx              # User profile settings
│       ├── FAQ.jsx                  # Frequently asked questions
│       ├── Privacy.jsx              # Privacy policy
│       ├── Terms.jsx                # Terms of service
│       └── NotFound.jsx             # 404 error page
│
├── public/                          # Static assets
│
├── package.json                     # Dependencies & scripts
├── vite.config.js                   # Vite bundler config
├── eslint.config.js                 # ESLint rules
├── vercel.json                      # Vercel deployment config
├── .env.local                       # Environment variables (local, not committed)
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── README.md                        # This file
├── LICENSE                          # MIT License
└── CONTRIBUTING.md                  # Contribution guidelines
```

---

## 📄 API Documentation

### **Base URL:** `https://your-supabase-url.supabase.co`

All API calls use Supabase REST API with JWT authentication in headers:

```bash
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

### 🔐 Authentication Endpoints

| Method | Endpoint          | Auth      | Description              |
| ------ | ----------------- | --------- | ------------------------ |
| `POST` | `/auth/v1/signup` | ❌ Public | Register a new user      |
| `POST` | `/auth/v1/signin` | ❌ Public | Login and get JWT token  |
| `POST` | `/auth/v1/logout` | 🔒 User   | Logout and revoke token  |
| `GET`  | `/auth/v1/user`   | 🔒 User   | Get current user profile |

#### **POST** `/auth/v1/signup`

**Request:**

```json
{
  "email": "trader@example.com",
  "password": "SecurePass123!",
  "data": {
    "name": "John Trader"
  }
}
```

**Success (200):**

```json
{
  "user": {
    "id": "user-uuid-here",
    "email": "trader@example.com",
    "user_metadata": {
      "name": "John Trader"
    }
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 604800
  }
}
```

---

### 📊 Asset Endpoints

| Method | Endpoint                             | Auth   | Description               |
| ------ | ------------------------------------ | ------ | ------------------------- |
| `GET`  | `/rest/v1/assets`                    | Public | Get all tradable assets   |
| `GET`  | `/rest/v1/assets/:id`                | Public | Get detailed asset info   |
| `GET`  | `/rest/v1/assets?category=eq.crypto` | Public | Filter assets by category |

#### **GET** `/rest/v1/assets?select=*`

**Response (200):**

```json
[
  {
    "id": "asset-uuid",
    "symbol": "BANANA",
    "name": "Banana Futures",
    "category": "commodity",
    "current_price": 45.5,
    "market_cap": 2250000,
    "volatility": 12.5,
    "listed": true,
    "status": "ACTIVE",
    "created_at": "2026-01-15T10:00:00Z"
  },
  {
    "id": "asset-uuid-2",
    "symbol": "DOGE",
    "name": "DogeMeme Coin",
    "category": "meme",
    "current_price": 0.85,
    "market_cap": 5000000,
    "volatility": 25.3,
    "listed": true,
    "status": "ACTIVE",
    "created_at": "2026-02-01T08:30:00Z"
  }
]
```

---

### 📈 Order Management Endpoints

| Method  | Endpoint                             | Auth    | Description       |
| ------- | ------------------------------------ | ------- | ----------------- |
| `POST`  | `/rest/v1/orders`                    | 🔒 User | Place a new order |
| `GET`   | `/rest/v1/orders?user_id=eq.USER_ID` | 🔒 User | Get user's orders |
| `PATCH` | `/rest/v1/orders/:id`                | 🔒 User | Cancel an order   |

#### **POST** `/rest/v1/orders`

**Request:**

```json
{
  "user_id": "user-uuid",
  "asset_id": "asset-uuid",
  "order_type": "LIMIT",
  "side": "BUY",
  "quantity": 10,
  "price": 42.5,
  "time_in_force": "GTC"
}
```

**Success (201):**

```json
{
  "id": "order-uuid",
  "user_id": "user-uuid",
  "asset_id": "asset-uuid",
  "order_type": "LIMIT",
  "side": "BUY",
  "quantity": 10,
  "price": 42.5,
  "status": "PENDING",
  "time_in_force": "GTC",
  "created_at": "2026-03-25T14:30:00Z",
  "expires_at": null,
  "filled_at": null
}
```

**Error (400):**

```json
{
  "code": "INVALID_QUANTITY",
  "message": "Order quantity must be positive"
}
```

---

### 💼 Portfolio Endpoints

| Method | Endpoint                                 | Auth    | Description            |
| ------ | ---------------------------------------- | ------- | ---------------------- |
| `GET`  | `/rest/v1/portfolios?user_id=eq.USER_ID` | 🔒 User | Get portfolio summary  |
| `GET`  | `/rest/v1/positions?user_id=eq.USER_ID`  | 🔒 User | Get all user positions |

#### **GET** `/rest/v1/portfolios`

**Response (200):**

```json
{
  "id": "portfolio-uuid",
  "user_id": "user-uuid",
  "cash_balance": 10000.0,
  "total_value": 45750.25,
  "daily_pnl": 1250.5,
  "updated_at": "2026-03-25T15:45:00Z"
}
```

---

### 🗳️ Asset Proposal Endpoints

| Method | Endpoint                              | Auth    | Description               |
| ------ | ------------------------------------- | ------- | ------------------------- |
| `POST` | `/rest/v1/proposals`                  | 🔒 User | Create new asset proposal |
| `GET`  | `/rest/v1/proposals?status=eq.VOTING` | Public  | Get active proposals      |
| `POST` | `/rest/v1/proposals_votes`            | 🔒 User | Vote on a proposal        |

#### **POST** `/rest/v1/proposals`

**Request:**

```json
{
  "proposer_id": "user-uuid",
  "asset_name": "Avocado Futures",
  "description": "High-demand tropical fruit trading pair",
  "category": "commodity"
}
```

**Success (201):**

```json
{
  "id": "proposal-uuid",
  "proposer_id": "user-uuid",
  "asset_name": "Avocado Futures",
  "description": "High-demand tropical fruit trading pair",
  "status": "PENDING",
  "votes_for": 0,
  "votes_against": 0,
  "created_at": "2026-03-25T16:00:00Z",
  "voting_ends_at": "2026-04-01T16:00:00Z"
}
```

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Password Security                                 │
│  ├── bcryptjs with 10 salt rounds                           │
│  ├── Password never returned in API responses               │
│  └── Supabase handles secure storage                        │
│                                                             │
│  Layer 2: JWT Authentication                                │
│  ├── HS256 signing algorithm                                │
│  ├── 7-day token expiry                                     │
│  ├── Token stored in browser (httpOnly cookie or storage)   │
│  └── Sent with every authenticated request                  │
│                                                             │
│  Layer 3: Row-Level Security (RLS)                          │
│  ├── Database-enforced access control                       │
│  ├── Users can only view own data                           │
│  ├── Trading bots verified via system roles                 │
│  └── No data leakage between users                          │
│                                                             │
│  Layer 4: HTTPS/TLS Encryption                              │
│  ├── All API calls encrypted in transit                     │
│  ├── Supabase enforces HTTPS                                │
│  └── No sensitive data in URLs                              │
│                                                             │
│  Layer 5: Input Validation                                  │
│  ├── Client-side validation with Vite build system          │
│  ├── Server-side validation at Supabase layer               │
│  ├── XSS prevention via React sanitization                  │
│  └── SQL injection prevention via parameterized queries     │
│                                                             │
│  Layer 6: Rate Limiting & Bot Prevention                    │
│  ├── API rate limits enforced by Supabase                   │
│  ├── Automated trading bots verified                        │
│  └── Suspicious activity logging                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Security Practices:**

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ JWT tokens with 7-day expiry
- ✅ Row-Level Security enforced at database level
- ✅ HTTPS only, TLS 1.3+
- ✅ Environment variables for sensitive data
- ✅ CORS configured for trusted origins only
- ✅ Regular security audits and dependency updates

---

## 🌍 Deployment Guide

### **Frontend Deployment (Vercel)**

1. **Push code to GitHub**:

```bash
git add .
git commit -m "Deploy TraX frontend"
git push origin main
```

2. **Connect Vercel to GitHub**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select `TraX` project

3. **Configure Environment Variables** in Vercel dashboard:

| Variable                 | Description                   |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key |
| `VITE_API_URL`           | Backend API URL (production)  |

4. **Deploy**:
   - Vercel auto-deploys on every push to `main`
   - Preview deployments available for PRs
   - Production URL: `https://trax-trading.vercel.app`

### **Database (Supabase)**

1. **Create Free Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Region: Choose closest to your users

2. **Configure Security**:
   - Enable **Row-Level Security** on all tables
   - Create RLS policies for user isolation
   - Enable **JWT authentication**
   - Configure **CORS** for your domain

3. **Initialize Schema**:
   - Run SQL migrations from `supabase_schema.sql`
   - Execute audit fixes from `supabase_audit_fixes.sql`
   - Apply price updates from `supabase_price_fix.sql`

4. **Enable Real-Time**:
   - Configure real-time tables for live updates
   - Subscribe from React components

### **Continuous Integration/Deployment**

TraX includes GitHub Actions workflow in `vercel.json` for:

- Automated testing
- ESLint linting
- Deployment previews
- Production deployment on merge to `main`

---

## 🐛 Troubleshooting

### Common Issues

**1. Supabase Connection Error**

```
Error: Failed to fetch from Supabase
```

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
- Ensure Supabase project is active (not paused)
- Check browser console for detailed error message
- Verify CORS settings in Supabase dashboard

**Solution:**

```bash
# Double-check environment variables
cat .env.local | grep VITE_SUPABASE

# Restart dev server
npm run dev
```

---

**2. Real-Time Updates Not Working**

```
WebSocket connection failed
```

- Ensure real-time is enabled on target table in Supabase
- Check browser DevTools → Network → WebSocket
- Verify Row-Level Security policies allow subscriptions
- Check if WebSocket connection is being blocked by firewall/VPN

**Solution:**

```javascript
// In lib/supabase.js, verify subscription setup:
const subscription = supabase
  .channel("public:assets")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "assets" },
    (payload) => console.log(payload),
  )
  .subscribe();
```

---

**3. Authentication Token Expired**

```
Invalid JWT token or Session expired
```

- JWT tokens expire after **7 days**
- User must re-login to get fresh token
- Clear browser localStorage: `localStorage.clear()`
- Check that token is being sent in Authorization header

**Solution:**

```javascript
// Add token refresh logic in AuthContext.jsx
useEffect(() => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      setUser(session.user);
      setToken(session.access_token);
    }
  });
  return () => data.subscription.unsubscribe();
}, []);
```

---

**4. Insufficient Balance for Trade**

```
Error: Insufficient balance for this order
```

- Start with virtual ₮1,000,000 (pre-funded test account)
- Check portfolio cash balance: `/rest/v1/portfolios`
- Check if funds are locked in pending orders
- Close or cancel pending limit orders to free up cash

---

**5. Asset Price Updates Stalled**

```
Ticker shows stale prices
```

- AI trading bots may be temporarily offline
- Check Supabase up-status: [status.supabase.io](https://status.supabase.io)
- Refresh browser: `Ctrl + R` (or `Cmd + R`)
- Check real-time subscription in browser console

**Solution:**

```bash
# Restart development server
npm run dev

# Or manually trigger price update
npm run update-prices
```

---

**6. Build Errors with Vite**

```
Error: Module not found or unexpected token
```

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Verify all imports use correct paths (case-sensitive on Linux/Mac)
- Update to latest Vite: `npm install vite@latest`

---

## 📜 License & Trademark

This project is **open-source** under the [MIT License](./LICENSE). You are free to use, modify, and distribute the code.

### ⚠️ Trademark Notice

The **"TraX"** name, logo, brand identity, and visual assets are **not** covered by the MIT License. These remain the exclusive intellectual property of the original creators.

You **may not**:

- Use the "TraX" name or branding to promote or sell a derivative product.
- Register, claim ownership of, or trademark the "TraX" name or any confusingly similar name.
- Present a fork or derivative as the official TraX platform.

You **may**:

- Fork and modify the code for personal or educational use.
- Contribute back to this repository via Pull Requests.
- Build your own project using the codebase, under a **different name and branding**.

**© 2026 TraX. The "TraX" brand and identity are protected.**

## ⚖️ Legal Disclaimer: Virtual Market Simulation

> **IMPORTANT NOTICE:** TraX is a **simulated, virtual trading platform** created solely for educational and entertainment purposes.
>
> - **No Real Money:** The assets, prices, matching engines, and trading features presented on this platform **do not reflect real-world financial markets**.
> - **No Financial Value:** No actual cryptocurrency, fiat currency, or digital assets are traded, deposited, or withdrawn. The platform and its internal balances hold **zero financial value**.
> - **No Financial Advice:** This platform is not a financial service, broker, or exchange. Its usage should not be considered financial advice or an alternative to real-world trading.
>
> The creators of TraX assume no liability for any actions taken based on the use of this simulation.

## 📜 License & Trademark

This project is **open-source** under the [MIT License](./LICENSE). You are free to use, modify, and distribute the code.

### ⚠️ Trademark Notice

The **"TraX"** name, logo, brand identity, and visual assets are **not** covered by the MIT License. These remain the exclusive intellectual property of the original creators.

You **may not**:

- Use the "TraX" name or branding to promote or sell a derivative product.
- Register, claim ownership of, or trademark the "TraX" name or any confusingly similar name.
- Present a fork or derivative as the official TraX platform.

You **may**:

- Fork and modify the code for personal or educational use.
- Contribute back to this repository via Pull Requests.
- Build your own project using the codebase, under a **different name and branding**.

**© 2026 TraX. The "TraX" brand and identity are protected.**

---

_Precision in every trade. Excellence in every line of code._
