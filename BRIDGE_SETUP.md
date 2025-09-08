# 🌉 Localhost Bridge Setup Guide

This bridge connects your deployed Vercel UI to your working localhost FastAPI server with real Playwright browser automation.

## 🚀 Quick Setup

### Step 1: Start Your Working FastAPI Server
```bash
cd /Users/vamsi/Desktop/Movie_Agent/github_dir/playwright_n8n
python main.py
```

**Expected output:**
```
🚀 FastAPI app starting up...
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
✅ Ultra-lightweight browser created for Render
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Verify Server is Running
Open in browser: http://localhost:8000/api/search?query=rrr

**Expected response:**
```json
{
  "query": "rrr",
  "results": [
    {
      "title": "RRR (2022) BRRip Telugu Movie",
      "url": "https://ww7.vcdnlare.com/v/...",
      ...
    }
  ]
}
```

### Step 3: Use Deployed UI
Go to: https://movie-search-n8n.vercel.app/

The bridge will automatically connect to your localhost server!

## 🔧 How It Works

```
Vercel UI → /api/localhost-bridge → Your localhost:8000 → Real Playwright → Working StreamLare URLs
```

### Bridge Features:
- ✅ **Auto-detects** localhost server on multiple ports
- ✅ **CORS handling** for cross-origin requests  
- ✅ **Error messages** with troubleshooting steps
- ✅ **Timeout handling** for unresponsive servers
- ✅ **Fallback instructions** if server is offline

## 🧪 Testing

### Test Bridge Connection:
```bash
curl "https://movie-search-n8n.vercel.app/api/localhost-bridge?query=rrr"
```

### Expected Flow:
1. **Search "rrr"** on deployed UI
2. **Bridge connects** to your localhost:8000
3. **Real Playwright** extracts movie data
4. **Working StreamLare URLs** returned
5. **Click movie cards** → StreamLare videos work!

## 🚨 Troubleshooting

### If Bridge Shows "Localhost server not accessible":

1. **Check server is running:**
   ```bash
   curl http://localhost:8000/api/search?query=test
   ```

2. **Check server logs** for errors

3. **Verify port 8000** is not blocked by firewall

4. **Try different port** if needed (bridge auto-detects)

### If StreamLare URLs still don't work:
- Your localhost server uses **real Playwright browser**
- Bridge preserves **exact response format**
- URLs should work because they come from **real browser context**

## 💡 Benefits

- ✅ **Use your working Playwright backend**
- ✅ **Keep deployed UI for easy access**
- ✅ **Real browser automation** for StreamLare URLs
- ✅ **No code changes** to your working server
- ✅ **Best of both worlds** - deployed UI + working backend

## 🔄 Development Workflow

1. **Keep FastAPI server running** on localhost:8000
2. **Use deployed UI** at movie-search-n8n.vercel.app
3. **Bridge automatically connects** them
4. **StreamLare URLs work** because of real Playwright backend!

---

**Note:** Your localhost server must be running for the bridge to work. The bridge will show helpful error messages if the server is not accessible.