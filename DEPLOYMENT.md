# Deployment Guide

Complete guide for deploying the Retail Intelligence Chatbot to production.

---

## Table of Contents

1. [Backend Deployment (Render)](#backend-deployment-render)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Web Deployment (Vercel)](#web-deployment-vercel)
4. [Web Deployment (Netlify)](#web-deployment-netlify)
5. [Mobile Deployment (Expo EAS)](#mobile-deployment-expo-eas)
6. [MongoDB Atlas Setup](#mongodb-atlas-setup)
7. [Environment Variables Checklist](#environment-variables-checklist)

---

## Backend Deployment (Render)

### Step 1: Prepare Repository

```bash
# Ensure your code is in a GitHub repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/retail-intelligence-chatbot.git
git push -u origin main
```

### Step 2: Create Render Service

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| Name | retail-intelligence-api |
| Environment | Node |
| Region | Choose closest to your users |
| Branch | main |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free (or paid for production) |

### Step 3: Add Environment Variables

In Render dashboard, go to Environment tab and add:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/retail-intelligence
OPENAI_API_KEY=sk-...
CORS_ORIGINS=https://your-app.vercel.app
NODE_ENV=production
PORT=5000
```

### Step 4: Deploy

Click "Create Web Service" - Render will build and deploy automatically.

The API will be available at: `https://retail-intelligence-api.onrender.com`

---

## Backend Deployment (Railway)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Create Project

```bash
cd backend
railway init
railway up
```

### Step 3: Add MongoDB Plugin

```bash
railway add mongodb
```

### Step 4: Set Environment Variables

```bash
railway variables set MONGODB_URI=<your-mongo-uri>
railway variables set OPENAI_API_KEY=<your-key>
railway variables set CORS_ORIGINS=https://your-app.vercel.app
```

---

## Web Deployment (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Configure Build

Create `web/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/$1"
    }
  ]
}
```

### Step 3: Update API Configuration

Create `web/.env.production`:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

### Step 4: Deploy

```bash
cd web
vercel --prod
```

Or use the Vercel web interface:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `web`
4. Add environment variable: `VITE_API_URL`

---

## Web Deployment (Netlify)

### Step 1: Create netlify.toml

Create `web/netlify.toml`:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/api/*"
  to = "https://your-backend.onrender.com/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Step 2: Deploy via CLI

```bash
npm install -g netlify-cli
cd web
netlify deploy --prod
```

### Step 3: Configure Build Settings

In Netlify dashboard:
- Base directory: `web`
- Build command: `npm run build`
- Publish directory: `dist`

---

## Mobile Deployment (Expo EAS)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Step 2: Configure EAS

Create `mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id",
        "ascAppId": "your-app-store-id"
      }
    }
  }
}
```

### Step 3: Update app.json

Update API URL in `mobile/app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-backend.onrender.com/api"
    }
  }
}
```

### Step 4: Build for Production

```bash
cd mobile

# Build Android APK
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Step 5: Create Standalone App

For testing without app stores:

```bash
# Generate QR code for distribution
eas build --platform android --profile preview
```

Users can scan the QR code to install via Expo Go.

---

## MongoDB Atlas Setup

### Step 1: Create Cluster

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Choose region closest to your users

### Step 2: Configure Access

1. **Database Access**: Create database user
   - Username: `retail-admin`
   - Password: (save securely)

2. **Network Access**: Add IP address
   - For development: Add your IP
   - For production: Add `0.0.0.0/0` (all IPs)

### Step 3: Get Connection String

Click "Connect" → "Connect your application"

Copy the connection string:
```
mongodb+srv://retail-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with your actual password.

### Step 4: Seed Production Database

```bash
# Update .env with Atlas URI
MONGODB_URI=mongodb+srv://retail-admin:password@cluster0.xxxxx.mongodb.net/retail-intelligence

# Run seed script
npm run seed
```

---

## Environment Variables Checklist

### Backend (.env)

```bash
# Required
MONGODB_URI=                    # MongoDB connection string
PORT=5000                       # Server port
NODE_ENV=production             # Environment

# Optional but recommended
OPENAI_API_KEY=sk-...           # OpenAI API key for AI features
CORS_ORIGINS=https://your-app.com  # Allowed origins

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Web (.env.production)

```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

### Mobile (app.json)

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-backend.onrender.com/api"
    }
  }
}
```

---

## Post-Deployment Checklist

- [ ] Backend is responding to health checks
- [ ] Database is seeded with initial data
- [ ] CORS is configured for production URLs
- [ ] SSL certificates are valid (automatic with Render/Vercel)
- [ ] Environment variables are set correctly
- [ ] MongoDB Atlas network access allows your backend
- [ ] Web app can connect to backend API
- [ ] Mobile app API URL is updated
- [ ] Error logging is configured
- [ ] Rate limiting is enabled

---

## Monitoring

### Backend Logs

- **Render**: Dashboard → Logs tab
- **Railway**: Dashboard → Deployments → View logs

### Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Uptime monitoring (UptimeRobot, Pingdom)

---

## Scaling Considerations

### Database
- Enable MongoDB Atlas backups
- Add indexes for frequently queried fields
- Consider read replicas for high traffic

### API
- Enable caching (Redis)
- Add CDN for static assets
- Configure auto-scaling

### Frontend
- Enable code splitting
- Optimize images and assets
- Use service workers for offline support

---

## Cost Estimates

### Free Tier (Development)
- Render: Free (with limitations)
- Vercel: Free for personal projects
- MongoDB Atlas: Free 512MB
- Expo: Free for development

### Production (~$50-100/month)
- Render: $7-25/month (Basic plan)
- Vercel: Free or $20/month (Pro)
- MongoDB Atlas: $9-25/month (M10)
- Domain: $10-15/year

---

## Support

For deployment issues:
1. Check provider documentation
2. Review logs for errors
3. Verify environment variables
4. Test API endpoints directly
