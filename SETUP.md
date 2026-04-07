# Setup Instructions - Retail Intelligence Chatbot

Complete step-by-step setup guide for running the project locally.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **MongoDB** - [Install locally](https://www.mongodb.com/docs/manual/installation/) OR use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **Git** - [Download](https://git-scm.com/)

Optional:
- **OpenAI API Key** - For AI-powered responses (get from [platform.openai.com](https://platform.openai.com))
- **Expo Go** - Mobile app testing (iOS/Android app store)

---

## Quick Start (5 minutes)

### Step 1: Clone/Download the Project

If you have the project as a zip, extract it. Or clone from Git:

```bash
git clone <your-repo-url>
cd retail-intelligence-chatbot
```

### Step 2: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file (already exists, but review it)
# Edit backend/.env with your settings

# Start MongoDB (if running locally)
# Windows: MongoDB should auto-start, or run: net start MongoDB
# Mac: brew services start mongodb-community
# Or use MongoDB Atlas connection string

# Seed the database with sample data
npm run seed

# Start the backend server
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Retail Intelligence Chatbot API
📡 Server running on port 5000
```

### Step 3: Setup Web Frontend

Open a NEW terminal window:

```bash
# Navigate to web folder
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

You should see:
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

Open your browser to `http://localhost:5173`

### Step 4: Setup Mobile App (Optional)

Open a NEW terminal window:

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install

# Start Expo
npm start
```

Scan the QR code with:
- **iOS**: Camera app or Expo Go
- **Android**: Expo Go app from Play Store

---

## Detailed Setup

### MongoDB Setup Options

#### Option A: Local MongoDB (Recommended for development)

**Windows:**
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. MongoDB runs as a Windows service automatically

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
# Follow MongoDB documentation for your distribution
sudo systemctl start mongod
```

Verify MongoDB is running:
```bash
mongosh
# Should connect without errors
```

#### Option B: MongoDB Atlas (Cloud - Free Tier)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster (M0 Free tier)
4. Create database user (username/password)
5. Add IP address: `0.0.0.0/0` (allow all for development)
6. Get connection string
7. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/retail-intelligence
   ```

### Environment Variables

#### Backend (.env)

Location: `backend/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB (choose one)
MONGODB_URI=mongodb://localhost:27017/retail-intelligence
# OR
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/retail-intelligence

# OpenAI (optional - app works without it using rule-based responses)
OPENAI_API_KEY=

# CORS (add your production URLs later)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,exp://

# JWT Secret (change for production)
JWT_SECRET=change-this-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Web (.env)

Location: `web/.env` (create if doesn't exist)

```env
VITE_API_URL=http://localhost:5000/api
```

#### Mobile (app.json)

The default configuration uses `http://localhost:5000/api`.

For testing on physical device, use your computer's IP:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.XXX:5000/api"
    }
  }
}
```

Find your IP:
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

---

## Running the Application

### Development Mode

Start all three components:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

**Terminal 3 - Mobile (optional):**
```bash
cd mobile
npm start
```

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Web:**
```bash
cd web
npm run build
npm run preview
```

---

## Testing the Application

### 1. Test Backend API

Open browser or use curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Get products
curl http://localhost:5000/api/products

# Get inventory status
curl http://localhost:5000/api/inventory/status

# Get sales analytics
curl http://localhost:5000/api/sales/analytics
```

### 2. Test Web App

1. Open `http://localhost:5173`
2. Navigate to Dashboard
3. Click "AI Chatbot"
4. Try these queries:
   - "What is low stock?"
   - "Show sales trends"
   - "Recommend products"
   - "Top selling items"

### 3. Test Voice Features

**Web:**
1. Go to Chatbot page
2. Click microphone icon
3. Speak: "Show me the sales trend"
4. Enable auto-speak (speaker icon) for TTS responses

**Mobile:**
1. Open chatbot in Expo Go
2. Tap microphone to simulate voice input
3. Toggle speaker icon for auto-speak

---

## Common Issues & Solutions

### MongoDB Connection Error

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
```bash
# Check if MongoDB is running
# Windows:
net start MongoDB

# Mac:
brew services start mongodb-community

# Or restart MongoDB service
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

Or change port in `backend/.env`:
```
PORT=5001
```

### CORS Error

**Error:** `Access to fetch at 'http://localhost:5000' has been blocked by CORS policy`

**Solution:**
1. Check `backend/.env` has correct CORS_ORIGINS
2. Ensure backend is running before starting frontend
3. Restart backend after changing .env

### npm install fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Expo won't connect to localhost

**Solution:**
1. Find your computer's IP address
2. Update mobile app API URL to use IP instead of localhost
3. Or use tunnel mode: `npx expo start --tunnel`

---

## Project Commands Reference

### Backend

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (with nodemon) |
| `npm start` | Start production server |
| `npm run seed` | Seed database with sample data |

### Web

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

### Mobile

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in web browser |

---

## Next Steps

After setup:

1. **Explore the Dashboard** - View sales analytics and inventory
2. **Test the Chatbot** - Ask questions about your data
3. **Try Voice Input** - Use speech-to-text features
4. **Customize** - Modify colors, add features, integrate with your data
5. **Deploy** - Follow DEPLOYMENT.md for production setup

---

## Getting Help

If you encounter issues:

1. Check the error message carefully
2. Review this SETUP.md
3. Check backend logs for API errors
4. Verify MongoDB is running
5. Ensure all environment variables are set

---

## What's Included

After setup, you'll have:

✅ **30 Sample Products** - Electronics, Clothing, Home, Sports, etc.
✅ **Inventory Records** - With varying stock levels
✅ **60 Days of Sales** - Realistic sales history
✅ **Working Chatbot** - AI + rule-based responses
✅ **Interactive Dashboard** - Charts and analytics
✅ **Mobile App** - iOS and Android ready
✅ **Voice Features** - Speech-to-text and TTS

Enjoy building! 🚀
