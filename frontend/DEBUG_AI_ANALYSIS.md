# Debug AI Analysis - Step by Step

## The Problem:
AI always shows 75 score (fallback) instead of real analysis.

## Why This Happens:
The Gemini API call is failing, so it returns the fallback score.

## How to Fix:

### Step 1: Restart Dev Server
```bash
# Press Ctrl+C to stop
npm run dev
```

### Step 2: Open Browser Console
1. Press F12
2. Click "Console" tab
3. Clear console (trash icon)

### Step 3: Submit a Proposal
Submit any climate proposal and watch the console.

### Step 4: Check Console Logs

**If API is working, you'll see:**
```
=== AI ANALYSIS START ===
API Key available: true
API Key length: 39
📤 Sending request to Gemini API...
📥 Response status: 200 OK
✅ Response received
📝 AI Response length: 1234
📝 AI Response preview: {...
✅ AI Analysis Score: 68
✅ AI Category: good
✅ Is Novel: false
=== AI ANALYSIS COMPLETE ===
```

**If API is failing, you'll see:**
```
=== AI ANALYSIS START ===
API Key available: true
❌ Gemini API error: 429 - Too Many Requests
❌ AI analysis error: Error: Gemini API error: 429
⚠️ Returning fallback analysis (score: 75)
```

## Common Errors & Solutions:

### Error 1: 429 Too Many Requests
**Problem**: API quota exceeded
**Solution**: 
1. Wait 24 hours OR
2. Get new API key from https://aistudio.google.com/apikey

### Error 2: 400 Bad Request
**Problem**: Invalid API key or wrong format
**Solution**:
1. Check .env.local has correct key
2. Restart dev server
3. Clear browser cache

### Error 3: API Key available: false
**Problem**: Environment variable not loaded
**Solution**:
1. Check .env.local exists in frontend folder
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R)

## Test Your API Key Manually:

Open browser console and paste:
```javascript
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY_HERE', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Say hello' }] }]
  })
})
.then(r => r.json())
.then(d => console.log('✅ API works!', d))
.catch(e => console.error('❌ API failed:', e))
```

Replace YOUR_API_KEY_HERE with your actual key.

## If Still Showing 75:

1. **Check the exact error** in console
2. **Copy the error message** and check what it says
3. **Verify API key** is correct in .env.local
4. **Check quota** at https://ai.dev/rate-limit

## Expected Behavior:

When working correctly:
- Score will be between 0-100 (not always 75)
- Will show existing real-world projects
- Will show innovative addons
- Will show if project is novel or exists

## Quick Test:

1. Submit proposal: "Solar panels for rural Kenya"
2. Check console for "=== AI ANALYSIS START ==="
3. Look for "✅ AI Analysis Score: XX" (should NOT be 75)
4. If you see "⚠️ Returning fallback", check the error above it

## Need Help?

Share the console error message to identify the exact issue.
