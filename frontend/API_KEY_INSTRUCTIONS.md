# How to Get a New Gemini API Key

## Your current API key has exceeded its quota!

Error: `429 Too Many Requests - You exceeded your current quota`

## Steps to Fix:

### 1. Get New API Key
1. Open: https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Select "Create API key in new project"
4. Copy the new key

### 2. Update .env.local
Open `frontend/.env.local` and replace:
```
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyA8VVCkbC3EFjlcOg0r3Dwv42WUTsTXWH4
```

With your new key:
```
NEXT_PUBLIC_GEMINI_API_KEY=YOUR_NEW_KEY_HERE
```

### 3. Restart Dev Server
```bash
# Press Ctrl+C to stop
npm run dev
```

## Why This Happened:
- Gemini free tier has limits: 15 requests per minute, 1500 per day
- You've been testing a lot, so you hit the limit
- Each proposal submission makes 2 API calls (duplicate check + AI analysis)

## Tips to Avoid This:
1. Use multiple API keys for testing
2. Add rate limiting to your code
3. Cache AI results to avoid repeated calls
4. Upgrade to paid plan for production

## Current Quota Limits (Free Tier):
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per minute

## Check Your Usage:
https://ai.dev/rate-limit
