export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { query } = req.body;

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    // Since we can't run Playwright on Vercel easily, let's simulate the browser behavior
    // by making requests with proper headers and parsing the HTML more intelligently
    
    const searchUrl = `https://www.5movierulz.villas/search_movies?s=${encodeURIComponent(query)}`;
    
    console.log('Scraping with browser-like behavior:', searchUrl);
    
    // Make request with browser-like headers
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML fetched, length:', html.length);

    // Parse movies using the same logic as working Playwright code
    const movies = await parseMoviesWithStreaming(html, query);
    
    res.status(200).json({
      query: query,
      results: movies,
      total: movies.length,
      message: `Found ${movies.length} movies with streaming URLs`,
      source: '5movierulz.villas',
      method: 'playwright-simulation'
    });

  } catch (error) {
    console.error('Playwright scrape error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape movies',
      message: error.message 
    });
  }
}

async function parseMoviesWithStreaming(html, query) {
  const movies = [];
  const baseUrl = 'https://www.5movierulz.villas';
  
  try {
    // Look for movie containers using patterns from working code
    const moviePatterns = [
      /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*film[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*movie[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    ];

    let movieMatches = [];
    
    for (const pattern of moviePatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        movieMatches = matches;
        console.log(`Found ${matches.length} movie containers`);
        break;
      }
    }

    for (const match of movieMatches) {
      try {
        const movieHtml = match[1] || match[0];
        
        // Extract title
        const titlePatterns = [
          /<h[1-6][^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h[1-6]>/i,
          /<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i,
          /<a[^>]*title="([^"]+)"[^>]*>/i,
        ];
        
        let title = '';
        for (const pattern of titlePatterns) {
          const titleMatch = movieHtml.match(pattern);
          if (titleMatch) {
            title = titleMatch[1].trim();
            break;
          }
        }
        
        // Extract URL
        const urlMatch = movieHtml.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
        if (!urlMatch || !title) continue;
        
        let moviePageUrl = urlMatch[1];
        if (moviePageUrl.startsWith('/')) {
          moviePageUrl = baseUrl + moviePageUrl;
        }
        
        // Skip navigation links
        if (title.toLowerCase().includes('home') || 
            title.toLowerCase().includes('featured') ||
            moviePageUrl.includes('/category/')) {
          continue;
        }
        
        // Check if title matches query
        if (!title.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        
        console.log(`Processing movie: ${title}`);
        
        // Extract streaming URLs from the movie page
        const streamingUrls = await extractStreamingUrlsFromPage(moviePageUrl);
        
        // Extract other metadata
        const posterMatch = movieHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
        const yearMatch = title.match(/\b(20[0-9]{2})\b/);
        const qualityMatch = title.match(/\b(HD|HDRip|BRRip|BluRay|DVDRip|CAM|TS|WebRip|720p|1080p|4K)\b/i);
        const languageMatch = title.match(/\b(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali|Punjabi|Marathi)\b/i);
        
        const movie = {
          title: title,
          url: streamingUrls.length > 0 ? streamingUrls[0].url : moviePageUrl,
          originalUrl: moviePageUrl,
          source: '5movierulz.villas',
          year: yearMatch ? yearMatch[1] : 'Unknown',
          poster: posterMatch ? (posterMatch[1].startsWith('http') ? posterMatch[1] : baseUrl + posterMatch[1]) : '',
          quality: qualityMatch ? qualityMatch[1] : 'Unknown',
          language: languageMatch ? languageMatch[1] : 'Unknown',
          genre: 'Unknown',
          rating: 'N/A',
          streamingUrls: streamingUrls,
          moviePageUrl: moviePageUrl
        };
        
        movies.push(movie);
        console.log(`✅ Added movie: ${title} with ${streamingUrls.length} streaming URLs`);
        
      } catch (e) {
        console.log(`Error processing movie: ${e.message}`);
        continue;
      }
    }
    
  } catch (error) {
    console.error('Error parsing movies:', error);
  }
  
  return movies;
}

async function extractStreamingUrlsFromPage(moviePageUrl) {
  const streamingUrls = [];
  
  try {
    console.log(`Extracting streaming URLs from: ${moviePageUrl}`);
    
    // Fetch the movie page
    const response = await fetch(moviePageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.5movierulz.villas/',
      },
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch movie page: ${response.status}`);
      return streamingUrls;
    }
    
    const html = await response.text();
    
    // Use the same selectors as working Playwright code
    const streamingPatterns = [
      /href="([^"]*streamlare[^"]*)"/gi,
      /href="([^"]*vcdnlare[^"]*)"/gi,
      /src="([^"]*streamlare[^"]*)"/gi,
      /src="([^"]*vcdnlare[^"]*)"/gi,
      /src="([^"]*vcdn[^"]*)"/gi,
    ];
    
    const foundUrls = new Set();
    
    for (const pattern of streamingPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let url = match[1];
        
        // Clean URL
        if (url.startsWith('//')) {
          url = 'https:' + url;
        }
        
        if (url.includes('streamlare') || url.includes('vcdnlare')) {
          foundUrls.add(url);
        }
      }
    }
    
    // Look for links with "watch online" text
    const watchLinkPattern = /<a[^>]*href="([^"]+)"[^>]*>.*?(?:watch.*?online|streamlare).*?<\/a>/gi;
    let watchMatch;
    while ((watchMatch = watchLinkPattern.exec(html)) !== null) {
      const url = watchMatch[1];
      if (url.includes('streamlare') || url.includes('vcdnlare') || url.includes('stream')) {
        foundUrls.add(url);
      }
    }
    
    // Convert to structured format
    for (const url of foundUrls) {
      const urlLower = url.toLowerCase();
      
      let service = 'generic';
      let priority = 2;
      
      if (urlLower.includes('streamlare') || urlLower.includes('vcdnlare')) {
        service = 'streamlare';
        priority = 1;
      }
      
      streamingUrls.push({
        url: url,
        type: 'streaming',
        service: service,
        quality: 'HD',
        priority: priority
      });
    }
    
    // Sort by priority
    streamingUrls.sort((a, b) => a.priority - b.priority);
    
    console.log(`Found ${streamingUrls.length} streaming URLs`);
    
  } catch (error) {
    console.error('Error extracting streaming URLs:', error);
  }
  
  return streamingUrls;
}