export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, query } = req.query;

  if (!url || !query) {
    res.status(400).json({ error: 'URL and query parameters are required' });
    return;
  }

  try {
    console.log('Proxy fetching MoviezWap for:', query);
    
    // Use a more sophisticated approach to bypass restrictions
    const searchUrl = `${url}?q=${encodeURIComponent(query)}`;
    
    // Simulate a real browser session
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'identity', // Avoid compression issues
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    // Add delay to appear more human-like
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Simple extraction for MoviezWap
    const movies = extractMoviesFromHtml(html);
    
    res.status(200).json({
      success: true,
      source: 'moviezwap.care',
      query: query,
      results: movies,
      total: movies.length,
      message: `Found ${movies.length} movies from MoviezWap via proxy`
    });

  } catch (error) {
    console.error('Proxy fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch via proxy',
      message: error.message,
      source: 'moviezwap.care'
    });
  }
}

function extractMoviesFromHtml(html) {
  const movies = [];
  
  try {
    // Look for the specific pattern in MoviezWap search results
    const moviePattern = /<div class='mylist'>\s*<img[^>]*>\s*<a href='([^']+)'>([^<]+)<\/a>\s*<\/div>/gi;
    let match;
    
    while ((match = moviePattern.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();
      
      if (title && title.length > 3) {
        movies.push({
          title: cleanTitle(title),
          url: resolveUrl(url, 'https://www.moviezwap.care'),
          source: 'moviezwap.care',
          year: extractYear(title),
          quality: extractQuality(title),
          language: extractLanguage(title),
          genre: 'Unknown',
          poster: generatePlaceholderPoster(title),
          streamingUrls: []
        });
      }
    }

    // Fallback: look for any links that might be movies
    if (movies.length === 0) {
      const linkPattern = /<a href='([^']+)'>([^<]+)<\/a>/gi;
      let linkMatch;
      
      while ((linkMatch = linkPattern.exec(html)) !== null) {
        const url = linkMatch[1];
        const title = linkMatch[2].trim();
        
        // Filter for movie-like content
        if (title.length > 5 && 
            !title.toLowerCase().includes('home') &&
            !title.toLowerCase().includes('search') &&
            url.includes('.html')) {
          
          movies.push({
            title: cleanTitle(title),
            url: resolveUrl(url, 'https://www.moviezwap.care'),
            source: 'moviezwap.care',
            year: extractYear(title),
            quality: extractQuality(title),
            language: extractLanguage(title),
            genre: 'Unknown',
            poster: generatePlaceholderPoster(title),
            streamingUrls: []
          });
        }
      }
    }

    return movies.slice(0, 15); // Limit results

  } catch (error) {
    console.error('Error extracting movies:', error);
    return [];
  }
}

function cleanTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\(\)\[\]:]/g, '')
    .trim()
    .substring(0, 100);
}

function extractYear(text) {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : 'Unknown';
}

function extractQuality(text) {
  const qualityPatterns = [
    /\b(4K|2160p)\b/i,
    /\b(1080p|FHD|Full HD)\b/i,
    /\b(720p|HD)\b/i,
    /\b(480p|SD)\b/i,
    /\b(DVDScr|DVDRip|BluRay|WebRip|HDRip|CAM|TS)\b/i
  ];

  for (const pattern of qualityPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

function extractLanguage(text) {
  const langPatterns = [
    /\b(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali)\b/i,
    /\b(Dual Audio|Multi Audio)\b/i
  ];

  for (const pattern of langPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

function resolveUrl(url, baseUrl) {
  if (!url) return null;
  
  try {
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('/')) {
      return baseUrl + url;
    } else {
      return baseUrl + '/' + url;
    }
  } catch (e) {
    return null;
  }
}

function generatePlaceholderPoster(title) {
  const shortTitle = title.substring(0, 20);
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#667eea"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" dy=".3em">
        ${shortTitle}
      </text>
    </svg>
  `).toString('base64')}`;
}