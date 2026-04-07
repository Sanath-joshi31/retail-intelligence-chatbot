# Quick Start Guide

Get the Retail Intelligence Chatbot running in under 5 minutes!

---

## Prerequisites Check

```bash
# Verify Node.js is installed (v18+)
node --version

# Verify npm is installed
npm --version
```

If not installed, download from [nodejs.org](https://nodejs.org/)

---

## 1. Install Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

✅ Backend running at http://localhost:5000

---

## 2. Install Web (New Terminal)

```bash
cd web
npm install
npm run dev
```

✅ Web running at http://localhost:5173

---

## 3. Install Mobile (Optional - New Terminal)

```bash
cd mobile
npm install
npm start
```

✅ Scan QR code with Expo Go app

---

## Test It!

1. Open http://localhost:5173
2. Click "AI Chatbot" in sidebar
3. Try: "What is low stock?"
4. Try: "Show sales trends"
5. Try: "Recommend products"

---

## That's It!

You're ready to explore:
- 📊 Dashboard with analytics
- 💬 AI Chatbot with voice
- 📦 Inventory management
- 📈 Sales forecasting

For detailed setup, see SETUP.md
For deployment, see DEPLOYMENT.md
