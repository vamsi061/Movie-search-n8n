export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    console.log('Proxying N8N request for:', query);
    
    // Call N8N webhook with POST method
    const n8nUrl = 'https://n8n-instance-vnyx.onrender.com/webhook/movie-scraper-villas';
    console.log('N8N URL:', n8nUrl);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Movie-Search-App/1.0'
      },
      body: JSON.stringify({
        query: query
      })
    });

    console.log('N8N response status:', response.status);

    if (!response.ok) {
      console.log('N8N response not OK:', response.status, response.statusText);
      
      // Try to get error details
      let errorText;
      try {
        errorText = await response.text();
        console.log('N8N error response:', errorText);
      } catch (e) {
        errorText = 'Unknown error';
      }

      return res.status(200).json({
        success: false,
        error: `N8N webhook error: ${response.status}`,
        message: errorText,
        results: [],
        total: 0
      });
    }

    const data = await response.json();
    console.log('N8N response data:', data);

    // Ensure consistent response format
    const formattedResponse = {
      success: true,
      results: data.results || data || [],
      total: data.total || (data.results ? data.results.length : 0),
      query: query,
      source: '5movierulz.villas',
      message: `Found ${data.results ? data.results.length : 0} movies from 5MovieRulz`
    };

    res.status(200).json(formattedResponse);

  } catch (error) {
    console.error('N8N proxy error:', error);
    res.status(200).json({ 
      success: false,
      error: 'Failed to fetch from N8N webhook',
      message: error.message,
      results: [],
      total: 0,
      query: query
    });
  }
}