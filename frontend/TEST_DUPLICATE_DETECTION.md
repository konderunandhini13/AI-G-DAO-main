# Test Duplicate Detection

## How It Works Now:

The duplicate detection has 2 layers:

### Layer 1: Simple Text Matching (No AI needed)
- Checks for exact title matches (100% similarity)
- Checks for similar words in titles (60%+ similarity)
- Works instantly, no API calls

### Layer 2: AI-Powered Check (Optional)
- Only runs if Layer 1 finds no duplicates
- Uses Gemini API for deep analysis
- Compares descriptions and context

## Test Steps:

### Test 1: Exact Duplicate
1. Create a proposal with title: "Solar Power for Rural Kenya"
2. Try to create another with SAME title: "Solar Power for Rural Kenya"
3. **Expected**: Popup shows "100% similar - Exact title match"

### Test 2: Similar Duplicate
1. Create a proposal: "Wind Energy Project in California"
2. Try to create: "Wind Energy California Project"
3. **Expected**: Popup shows "70-80% similar"

### Test 3: Different Proposal
1. Create a proposal: "Ocean Cleanup Initiative"
2. Try to create: "Forest Reforestation Program"
3. **Expected**: No popup, submission proceeds

## Console Logs to Check:

Open browser console (F12) and look for:
```
Checking duplicates against X proposals
```

If you see this, duplicate detection is running.

## If Popup Still Doesn't Show:

1. **Check browser console** for errors
2. **Verify proposals exist**:
   - Open console (F12)
   - Type: `localStorage.getItem('climate_dao_proposals')`
   - Should show JSON with your proposals

3. **Clear cache and restart**:
   ```bash
   # Stop server (Ctrl+C)
   # Clear browser cache (Ctrl+Shift+Delete)
   npm run dev
   ```

## Manual Test in Console:

Open console (F12) and paste:
```javascript
// Check if proposals exist
const proposals = JSON.parse(localStorage.getItem('climate_dao_proposals') || '[]');
console.log('Total proposals:', proposals.length);
console.log('Proposals:', proposals.map(p => p.title));
```

This will show you all existing proposals.
