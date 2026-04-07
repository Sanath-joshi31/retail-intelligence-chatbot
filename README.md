# Retail Intelligence Chatbot

A complete production-ready cross-platform retail management chatbot with AI-powered insights, inventory tracking, sales analytics, and voice interaction.

![Dashboard](./assets/dashboard-preview.png)

## Features

### Core Capabilities
- **AI-Powered Chatbot** - Natural language queries about your retail business
- **Voice Input/Output** - Speech-to-text and text-to-speech support
- **Inventory Management** - Real-time stock tracking and alerts
- **Sales Analytics** - Revenue trends, forecasts, and category breakdowns
- **Product Recommendations** - AI-driven product suggestions
- **Data Visualization** - Interactive charts and dashboards

### Platforms
- **Web App** - React.js with Vite (Modern, responsive UI)
- **Mobile App** - React Native with Expo (iOS + Android)
- **Backend API** - Node.js + Express + MongoDB

---

## Project Structure

```
retail-intelligence-chatbot/
├── backend/                 # Node.js Express API
│   ├── config/             # Database configuration
│   ├── controllers/        # Business logic
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Error handling, auth
│   ├── services/           # External services
│   ├── data/               # Seed data
│   ├── server.js           # Entry point
│   └── .env                # Environment variables
│
├── web/                    # React Web Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── styles/         # Global styles
│   │   └── App.jsx         # Main app component
│   └── package.json
│
├── mobile/                 # React Native Expo App
│   ├── app/                # Screen components
│   ├── components/         # Reusable components
│   ├── services/           # API client
│   └── package.json
│
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas URI
- (Optional) OpenAI API key for AI features

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and optional OpenAI key

# Start MongoDB (if running locally)
# Windows: mongod
# Mac: brew services start mongodb-community

# Seed the database with sample data
npm run seed

# Start the server
npm run dev
```

The API will be available at `http://localhost:5000`

### 2. Web Frontend Setup

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

The web app will be available at `http://localhost:5173`

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Scan QR code with Expo Go app (iOS/Android)
```

---

## Environment Variables

### Backend (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/retail-intelligence
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/retail-intelligence

# OpenAI API Key (optional)
OPENAI_API_KEY=sk-...

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,exp://

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Web (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get single product |
| GET | `/api/products/low-stock` | Get low stock products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | Get all inventory |
| GET | `/api/inventory/status` | Get stock status summary |
| GET | `/api/inventory/value` | Get inventory value |
| PUT | `/api/inventory/:id` | Update inventory |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | Get all sales |
| GET | `/api/sales/analytics` | Get sales analytics |
| GET | `/api/sales/trends` | Get sales trends |
| GET | `/api/sales/forecast` | Get sales forecast |
| POST | `/api/sales` | Create sale |

### Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot/message` | Send message |
| GET | `/api/chatbot/history` | Get chat history |
| POST | `/api/chatbot/history/clear` | Clear history |

---

## Chatbot Commands

The chatbot understands natural language queries:

### Inventory Queries
- "What is low stock?"
- "Show inventory status"
- "Which items need reordering?"
- "How many products are out of stock?"

### Sales Queries
- "Show sales trends"
- "What's our revenue?"
- "Forecast next week's sales"
- "How are we doing this month?"

### Product Queries
- "Recommend products"
- "Top selling items"
- "Best selling products"
- "What should I reorder?"

---

## Voice Features

### Web (Browser)
- **Speech-to-Text**: Uses Web Speech API (Chrome/Edge)
- **Text-to-Speech**: Uses SpeechSynthesis API

### Mobile (Expo)
- **Speech-to-Text**: Simulated (integrate with Google/Apple speech services)
- **Text-to-Speech**: Uses expo-speech module

---

## Sample Data

The seed script creates:
- **30 Products** across 8 categories
- **Inventory records** with varying stock levels
- **60 days of sales history** with realistic patterns

### Categories
- Electronics (iPhone, Samsung, MacBook, etc.)
- Clothing (Nike, Adidas, Levi's)
- Home & Garden (KitchenAid, Dyson)
- Sports (Peloton, Bowflex)
- Books, Toys, Beauty

---

## Deployment

### Backend (Render/Railway)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Set build command: `cd backend && npm install`
5. Set start command: `cd backend && npm start`
6. Add environment variables

### Web (Vercel/Netlify)

```bash
cd web
npm run build
# Deploy dist/ folder to Vercel
```

### Mobile (Expo EAS)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

---

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (real-time)
- OpenAI API (optional)
- NodeCache

### Web Frontend
- React 18 + Vite
- React Router v6
- Recharts (data visualization)
- Axios
- Socket.IO Client

### Mobile
- React Native
- Expo SDK 50
- expo-router (navigation)
- react-native-chart-kit
- expo-speech
- expo-av

---

## Troubleshooting

### MongoDB Connection Error
```
# Ensure MongoDB is running
# Windows: Check Services or run mongod
# Mac: brew services start mongodb-community
# Or use MongoDB Atlas cloud database
```

### CORS Error
```
# Update CORS_ORIGINS in backend/.env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### OpenAI Fallback
```
# If OPENAI_API_KEY is not set, the app uses rule-based responses
# This is fully functional for demo purposes
```

---

## License

MIT License - Feel free to use for personal or commercial projects.

---

## Support

For issues or questions, please open an issue on GitHub.
