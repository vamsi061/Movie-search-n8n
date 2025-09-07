export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { query } = req.query;

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    // Proxy request to your n8n instance using POST
    const n8nUrl = 'https://n8n-instance-vnyx.onrender.com/webhook/movie-scraper-villas';
    
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Movie-Search-UI/1.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query
      }),
      timeout: 60000, // 60 second timeout for n8n workflow
    });

    if (!response.ok) {
      throw new Error(`N8N API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the response for debugging
    console.log('N8N Response:', JSON.stringify(data, null, 2));
    
    // Handle different response formats from n8n
    let formattedResponse;
    
    // Check if n8n returned "Workflow was started" message (workflow not completing properly)
    if (data.message === "Workflow was started" || 
        (Array.isArray(data) && data[0]?.message === "Workflow was started")) {
      
      console.error('N8N workflow started but did not complete properly');
      return res.status(500).json({
        error: 'N8N workflow did not complete',
        message: 'The movie search workflow started but did not return results. Check n8n workflow configuration.',
        debug: data
      });
    }
    
    if (Array.isArray(data)) {
      // If n8n returns an array directly
      formattedResponse = {
        query: query,
        results: data,
        total: data.length,
        message: `Found ${data.length} movies`,
        source: "5movierulz.villas",
        success: true
      };
    } else if (data.results) {
      // If n8n returns an object with results property
      formattedResponse = data;
    } else {
      // If n8n returns a single object, wrap it in results array
      formattedResponse = {
        query: query,
        results: [data],
        total: 1,
        message: "Found 1 movie",
        source: "5movierulz.villas",
        success: true
      };
    }
    
    // Return the formatted data with CORS headers
    res.status(200).json(formattedResponse);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movies',
      message: error.message 
    });
  }
}