export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query, tunnel_url } = req.query;

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  // If no tunnel URL provided, return instructions
  if (!tunnel_url) {
    return res.status(400).json({
      error: 'Tunnel URL required',
      message: 'Your localhost server needs to be accessible from the internet',
      instructions: {
        option1: {
          title: 'Use ngrok (Recommended)',
          steps: [
            '1. Install ngrok: https://ngrok.com/download',
            '2. Run: ngrok http 8000',
            '3. Copy the https URL (e.g., https://abc123.ngrok.io)',
            '4. Use: /api/tunnel-bridge?query=test&tunnel_url=https://abc123.ngrok.io'
          ]
        },
        option2: {
          title: 'Use Cloudflare Tunnel',
          steps: [
            '1. Install cloudflared',
            '2. Run: cloudflared tunnel --url http://localhost:8000',
            '3. Copy the https URL',
            '4. Use that URL as tunnel_url parameter'
          ]
        },
        option3: {
          title: 'Use localtunnel',
          steps: [
            '1. Install: npm install -g localtunnel',
            '2. Run: lt --port 8000',
            '3. Copy the https URL',
            '4. Use that URL as tunnel_url parameter'
          ]
        }
      },
      example: 'https://movie-search-n8n.vercel.app/api/tunnel-bridge?query=rrr&tunnel_url=https://abc123.ngrok.io'
    });
  }

  try {
    console.log('🌐 Tunnel Bridge: Connecting to:', tunnel_url);
    
    // Clean the tunnel URL
    const baseUrl = tunnel_url.replace(/\/$/, ''); // Remove trailing slash
    const apiUrl = `${baseUrl}/api/search?query=${encodeURIComponent(query)}`;
    
    console.log('📡 Calling:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Tunnel-Bridge/1.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      timeout: 30000, // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Tunnel server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Received ${data.results?.length || 0} results from tunnel`);
    
    // Forward the response from your tunneled FastAPI server
    res.status(200).json(data);
    
  } catch (error) {
    console.error('🚨 Tunnel bridge error:', error);
    
    res.status(500).json({ 
      error: 'Tunnel connection failed',
      message: error.message,
      troubleshooting: {
        check1: 'Is your tunnel URL correct and accessible?',
        check2: 'Try accessing the tunnel URL directly in browser',
        check3: 'Is your FastAPI server running on localhost:8000?',
        check4: 'Is the tunnel service (ngrok/cloudflare) running?'
      },
      provided_url: tunnel_url
    });
  }
}