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
    
    // Function to fix StreamLare URLs
    function fixStreamingUrls(results) {
      if (!Array.isArray(results)) return results;
      
      return results.map(movie => {
        if (movie.streamingUrls && Array.isArray(movie.streamingUrls)) {
          movie.streamingUrls = movie.streamingUrls.map(stream => {
            let url = stream.url;
            
            // Fix StreamLare/VCDNLare URLs
            if (url.includes('vcdnlare.com') || url.includes('streamlare.com')) {
              // Remove query parameters that might cause 404
              const baseUrl = url.split('?')[0];
              
              // If it's a direct video URL, convert to player URL
              if (baseUrl.includes('/v/')) {
                const videoId = baseUrl.split('/v/')[1];
                url = `https://streamlare.com/v/${videoId}`;
              }
            }
            
            return {
              ...stream,
              url: url,
              originalUrl: stream.url // Keep original for debugging
            };
          });
        }
        
        // Also fix the main URL if it's a streaming URL
        if (movie.url && (movie.url.includes('vcdnlare.com') || movie.url.includes('streamlare.com'))) {
          const baseUrl = movie.url.split('?')[0];
          if (baseUrl.includes('/v/')) {
            const videoId = baseUrl.split('/v/')[1];
            movie.url = `https://streamlare.com/v/${videoId}`;
          }
        }
        
        return movie;
      });
    }
    
    if (Array.isArray(data)) {
      // If n8n returns an array directly
      const fixedResults = fixStreamingUrls(data);
      formattedResponse = {
        query: query,
        results: fixedResults,
        total: fixedResults.length,
        message: `Found ${fixedResults.length} movies`,
        source: "5movierulz.villas",
        success: true
      };
    } else if (data.results) {
      // If n8n returns an object with results property
      const fixedResults = fixStreamingUrls(data.results);
      formattedResponse = {
        ...data,
        results: fixedResults
      };
    } else {
      // If n8n returns a single object, wrap it in results array
      const fixedResults = fixStreamingUrls([data]);
      formattedResponse = {
        query: query,
        results: fixedResults,
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