# How to Get a Free Gemini API Key

Google's Gemini API has a **very generous free tier**:
- ✅ **1,500 requests per day**
- ✅ **1 million tokens per minute**
- ✅ **No credit card required**
- ✅ **No time limit**

Perfect for ImpactGlobe!

---

## Step-by-Step Guide

### 1. Go to Google AI Studio
Visit: https://aistudio.google.com/app/apikey

### 2. Sign in with Google Account
Use any Google account (Gmail, Workspace, etc.)

### 3. Create API Key
1. Click **"Get API key"** or **"Create API key"**
2. Select **"Create API key in new project"** (or use existing project)
3. Copy the API key (starts with `AIza...`)

### 4. Add to .env.local
Open `.env.local` and replace:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

With your actual key:
```bash
GEMINI_API_KEY=AIzaSyC...your_actual_key_here
```

### 5. Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

---

## Test Your API Key

Run this command to test:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

You should get a response with generated text.

---

## Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Requests per day | 1,500 |
| Requests per minute | 15 |
| Tokens per minute | 1,000,000 |
| Tokens per request | 32,000 input + 8,000 output |

**For ImpactGlobe:**
- RSS poll every 15 minutes = 96 requests/day
- Well within the 1,500/day limit! ✅

---

## Why Gemini vs Claude?

| Feature | Gemini (Free) | Claude (Paid) |
|---------|---------------|---------------|
| Cost | **FREE** | $3 per 1M tokens |
| Daily limit | 1,500 requests | Pay-as-you-go |
| Speed | Very fast | Fast |
| Quality | Excellent | Excellent |
| Setup | No credit card | Credit card required |

**For a free project, Gemini is perfect!** 🎉

---

## Troubleshooting

### "API key not valid"
- Make sure you copied the entire key (starts with `AIza`)
- Check for extra spaces or quotes
- Regenerate the key if needed

### "Quota exceeded"
- You've hit the 1,500 requests/day limit
- Wait 24 hours for reset
- Or create a new Google account for another free tier

### "Model not found"
- Make sure you're using `gemini-1.5-flash` (not `gemini-pro`)
- Check the API endpoint is correct

---

## Next Steps

Once you've added your Gemini API key:

1. Restart the dev server
2. Trigger RSS poll: 
   ```bash
   curl -X GET "http://localhost:3000/api/rss/poll" -H "x-cron-secret: dev_cron_secret"
   ```
3. Watch events appear on the globe! 🌍

---

**Your ImpactGlobe is now powered by free AI!** 🚀
