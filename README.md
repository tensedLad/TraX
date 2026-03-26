# TradrX - Trading Platform

A full-stack cryptocurrency trading platform built with React, Node.js/Express, and MongoDB.

## Features

- **User Authentication**: Secure registration and login with JWT
- **Asset Listing**: Browse available cryptocurrency assets
- **Trading Marketplace**: Buy and sell assets in real-time
- **Portfolio Management**: Track your holdings and trading history
- **Responsive Design**: Works seamlessly on desktop and mobile

## Project Structure

```
TradrX/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── pages/     # Page components (Login, Register, Dashboard)
│   │   ├── components/# Reusable components
│   │   ├── store/     # Zustand state management
│   │   ├── utils/     # Utilities (API client)
│   │   └── App.js
│   └── package.json
│
└── backend/           # Node.js/Express backend API
    ├── src/
    │   ├── routes/    # API routes (auth, assets, trades)
    │   ├── models/    # MongoDB models (User, Asset, Trade)
    │   ├── controllers/ # Route handlers
    │   ├── middleware/  # Auth and other middleware
    │   └── server.js
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or Atlas)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration (MongoDB URI, JWT secret)

5. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Assets
- `GET /api/assets` - Get all available assets
- `GET /api/assets/:symbol` - Get specific asset details
- `POST /api/assets` - Create new asset (admin)

### Trades
- `POST /api/trades` - Create a new trade (buy/sell)
- `GET /api/trades` - Get user's trade history

## Next Steps for v1

- [ ] Add real-time price updates with WebSockets
- [ ] Implement portfolio dashboard with charts
- [ ] Add order history and detailed trade analytics
- [ ] Build admin panel for asset management
- [ ] Integrate Reddit API for community features
- [ ] Add payment processing
- [ ] Deploy to production (Heroku/AWS for backend, Vercel for frontend)

## Development

### Running Both Services

In two separate terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

## Testing

Sample user credentials after seeding:
- Email: test@example.com
- Password: password123

## Deployment

### Backend (Heroku)
1. Create a Heroku app
2. Set environment variables
3. Deploy using Git

### Frontend (Vercel)
1. Connect your repository to Vercel
2. Deploy automatically on push

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
