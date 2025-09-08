export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query } = req.query;

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    console.log('🌉 Bridge: Connecting to localhost FastAPI server for query:', query);
    
    // Try multiple localhost URLs where your FastAPI server might be running
    const localhostUrls = [
      'http://localhost:8000/api/search',
      'http://127.0.0.1:8000/api/search',
      'http://localhost:3000/api/search',
      'http://127.0.0.1:3000/api/search'
    ];
    
    let response = null;
    let workingUrl = null;
    
    // Try each localhost URL until one works
    for (const url of localhostUrls) {
      try {
        console.log(`🔗 Trying: ${url}`);
        
        response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Vercel-Bridge/1.0',
            'Accept': 'application/json',
            'Connection': 'keep-alive',
          },
          timeout: 10000, // 10 second timeout
        });
        
        if (response.ok) {
          workingUrl = url;
          console.log(`✅ Connected to: ${url}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}: ${error.message}`);
        continue;
      }
    }
    
    if (!response || !response.ok) {
      // If localhost is not accessible, return instructions
      return res.status(503).json({
        error: 'Localhost server not accessible',
        message: 'Please ensure your FastAPI server is running on localhost:8000',
        instructions: {
          step1: 'Navigate to: /Users/vamsi/Desktop/Movie_Agent/github_dir/playwright_n8n',
          step2: 'Run: python main.py',
          step3: 'Ensure server starts on http://localhost:8000',
          step4: 'Try the search again'
        },
        fallback: 'You can also test directly at http://localhost:8000 in your browser'
      });
    }
    
    const data = await response.json();
    console.log(`📦 Received ${data.results?.length || 0} results from ${workingUrl}`);
    
    // Forward the response from your working FastAPI server
    res.status(200).json(data);
    
  } catch (error) {
    console.error('🚨 Bridge error:', error);
    
    res.status(500).json({ 
      error: 'Bridge connection failed',
      message: error.message,
      troubleshooting: {
        check1: 'Is your FastAPI server running? (python main.py)',
        check2: 'Is it accessible at http://localhost:8000?',
        check3: 'Are there any firewall restrictions?',
        check4: 'Try accessing http://localhost:8000/api/search?query=test directly'
      }
    });
  }
}