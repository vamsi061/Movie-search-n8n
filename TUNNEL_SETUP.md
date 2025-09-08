# 🌐 Tunnel Setup Guide - Make Localhost Accessible

The issue: Vercel can't access your localhost:8000 because it's only available on your local machine.

**Solution: Create a tunnel to make your localhost accessible from the internet.**

## 🚀 Quick Setup with ngrok (Recommended)

### Step 1: Install ngrok
- Go to: https://ngrok.com/download
- Download and install ngrok
- Sign up for free account (optional but recommended)

### Step 2: Start Your FastAPI Server
```bash
cd /Users/vamsi/Desktop/Movie_Agent/github_dir/playwright_n8n
python main.py
```

### Step 3: Create Tunnel
```bash
ngrok http 8000
```

**You'll see output like:**
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:8000
```

### Step 4: Test Your Tunnel
Copy the https URL (e.g., `https://abc123.ngrok.io`) and test:
```
https://abc123.ngrok.io/api/search?query=rrr
```

Should return your movie data!

### Step 5: Use with Deployed UI
Go to: https://movie-search-n8n.vercel.app/api/tunnel-bridge?query=rrr&tunnel_url=https://abc123.ngrok.io

Replace `abc123.ngrok.io` with your actual ngrok URL.

## 🔄 Alternative: Update Frontend to Use Tunnel

Or I can update the frontend to automatically use your tunnel URL. Just provide your ngrok URL!

## 🛠️ Other Tunnel Options

### Option 2: Cloudflare Tunnel (Free)
```bash
# Install cloudflared
brew install cloudflared  # macOS
# or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Create tunnel
cloudflared tunnel --url http://localhost:8000
```

### Option 3: localtunnel (npm)
```bash
npm install -g localtunnel
lt --port 8000
```

## 🎯 Final Result

Once tunnel is set up:
```
Internet → ngrok tunnel → Your localhost:8000 → Real Playwright → Working StreamLare URLs
```

Your deployed UI will finally be able to access your working FastAPI server with real browser automation!

## 🧪 Quick Test Flow

1. **Start FastAPI**: `python main.py`
2. **Start tunnel**: `ngrok http 8000`
3. **Copy tunnel URL**: `https://abc123.ngrok.io`
4. **Test tunnel**: Visit tunnel URL in browser
5. **Use with bridge**: Add `&tunnel_url=https://abc123.ngrok.io` to API calls

Let me know your ngrok URL and I'll update the frontend to use it automatically! 🚀