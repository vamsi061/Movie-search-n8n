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
    
    // Debug: N8N Response received
    console.log('Raw N8N Response:', JSON.stringify(data, null, 2));
    console.log('N8N Response keys:', Object.keys(data));
    if (Array.isArray(data) && data[0]) {
      console.log('First movie keys:', Object.keys(data[0]));
      console.log('First movie streamingUrls:', data[0].streamingUrls);
    }
    
    // Handle different response formats from n8n
    let formattedResponse;
    
    // Check if n8n returned "Workflow was started" message (workflow not completing properly)
    if (data.message === "Workflow was started" || 
        (Array.isArray(data) && data[0]?.message === "Workflow was started")) {
      
      // Debug: N8N workflow started but did not complete properly
      // For now, return empty results instead of error to avoid breaking UI
      return res.status(200).json({
        query: query,
        results: [],
        total: 0,
        message: 'N8N workflow did not complete properly. No results found.',
        source: "5movierulz.villas",
        success: false,
        error: 'Workflow incomplete'
      });
    }
    
    // Check if n8n returned an error response (ScrapingAnt or other errors)
    if (Array.isArray(data) && data[0]?.status === "error") {
      console.log('N8N returned error:', data[0]);
      return res.status(200).json({
        query: query,
        results: [],
        total: 0,
        message: `Scraping service error: ${data[0].message}`,
        source: "5movierulz.villas",
        success: false,
        error: data[0].message,
        debug: data[0].debug
      });
    }
    
    
    // Format response to match the expected structure
    let results = [];
    
    console.log('Data type check:', typeof data, 'Is array:', Array.isArray(data));
    console.log('Data structure:', data);
    
    if (Array.isArray(data)) {
      results = data;
      console.log('Using data as array, results:', results.length);
    } else if (data.results && Array.isArray(data.results)) {
      results = data.results;
      console.log('Using data.results, results:', results.length);
    } else if (data.title) {
      // Single movie object
      results = [data];
      console.log('Using single movie object');
    } else {
      console.log('No valid data structure found');
    }
    
    // Simply pass through the results without complex formatting that might lose data
    const formattedResults = results.map((movie, index) => {
      console.log(`Processing movie ${index}:`, movie.title);
      console.log(`Movie ${index} has streamingUrls:`, !!movie.streamingUrls, 'Count:', movie.streamingUrls?.length);
      
      // Return the movie object with minimal changes to preserve all data
      return {
        ...movie, // Keep everything exactly as received
        // Only add missing fields, don't override existing ones
        source: movie.source || '5movierulz.villas',
        moviePageUrl: movie.moviePageUrl || movie.originalUrl,
        error: movie.error || null
      };
    });
    
    formattedResponse = {
      query: query,
      results: formattedResults,
      total: formattedResults.length,
      message: `Found ${formattedResults.length} movies`,
      source: "5movierulz.villas",
      success: true
    };
    
    // Return the formatted data with CORS headers
    res.status(200).json(formattedResponse);

  } catch (error) {
    // Debug: Proxy error occurred
    res.status(500).json({ 
      error: 'Failed to fetch movies',
      message: error.message 
    });
  }
}