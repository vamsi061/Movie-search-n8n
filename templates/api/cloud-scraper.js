export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    console.log('🔍 Cloud scraper: Searching for movies:', query);
    
    // Search for movies on 5movierulz.villas
    const searchUrl = `https://www.5movierulz.villas/?s=${encodeURIComponent(query)}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.5movierulz.villas/',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }

    const searchHtml = await searchResponse.text();
    console.log('📄 Search page fetched, length:', searchHtml.length);

    // Parse movies from search results
    const movies = await parseMoviesFromSearch(searchHtml, query);
    
    if (movies.length === 0) {
      return res.status(200).json({
        query: query,
        results: [],
        total: 0,
        message: 'No movies found',
        source: 'cloud-scraper'
      });
    }

    // For each movie, try to extract DIRECT video URLs (not StreamLare pages)
    const moviesWithDirectUrls = await Promise.all(
      movies.slice(0, 5).map(async (movie) => { // Limit to 5 movies for performance
        try {
          const directUrls = await extractDirectVideoUrls(movie.moviePageUrl);
          return {
            ...movie,
            directVideoUrls: directUrls,
            streamingUrls: directUrls.map(url => ({
              url: url,
              type: 'direct',
              service: 'direct-video',
              quality: 'HD',
              priority: 1
            }))
          };
        } catch (error) {
          console.log(`Failed to extract direct URLs for ${movie.title}: ${error.message}`);
          return {
            ...movie,
            directVideoUrls: [],
            streamingUrls: []
          };
        }
      })
    );

    res.status(200).json({
      query: query,
      results: moviesWithDirectUrls,
      total: moviesWithDirectUrls.length,
      message: `Found ${moviesWithDirectUrls.length} movies with direct video URLs`,
      source: 'cloud-scraper',
      method: 'direct-video-extraction'
    });

  } catch (error) {
    console.error('Cloud scraper error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape movies',
      message: error.message 
    });
  }
}

async function parseMoviesFromSearch(html, query) {
  const movies = [];
  const baseUrl = 'https://www.5movierulz.villas';
  
  try {
    // Look for movie links in search results
    const linkPattern = /<a[^>]*href="([^"]*movie[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const matches = [...html.matchAll(linkPattern)];
    
    for (const match of matches) {
      const url = match[1];
      const title = match[2].trim();
      
      // Filter for relevant movies
      if (title.toLowerCase().includes(query.toLowerCase()) && 
          !url.includes('/category/') && 
          !title.toLowerCase().includes('home')) {
        
        const fullUrl = url.startsWith('http') ? url : baseUrl + url;
        
        movies.push({
          title: title,
          moviePageUrl: fullUrl,
          source: 'cloud-scraper',
          year: title.match(/\b(20[0-9]{2})\b/)?.[0] || 'Unknown',
          quality: title.match(/\b(HD|HDRip|BluRay|DVDRip)\b/i)?.[0] || 'Unknown',
          language: title.match(/\b(Hindi|English|Tamil|Telugu|Malayalam)\b/i)?.[0] || 'Unknown',
          genre: 'Movie',
          rating: 'N/A'
        });
      }
    }
  } catch (error) {
    console.error('Error parsing movies:', error);
  }
  
  return movies.slice(0, 10); // Limit results
}

async function extractDirectVideoUrls(moviePageUrl) {
  const directUrls = [];
  
  try {
    console.log(`🎬 Extracting direct video URLs from: ${moviePageUrl}`);
    
    const response = await fetch(moviePageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.5movierulz.villas/',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie page: ${response.status}`);
    }

    const html = await response.text();
    
    // Look for direct video file URLs (mp4, mkv, m3u8, etc.)
    const videoPatterns = [
      // Direct video files
      /https?:\/\/[^"'\s]+\.(?:mp4|mkv|avi|mov|wmv|flv|webm|m4v)(?:\?[^"'\s]*)?/gi,
      // M3U8 streaming files
      /https?:\/\/[^"'\s]+\.m3u8(?:\?[^"'\s]*)?/gi,
      // MPD streaming files
      /https?:\/\/[^"'\s]+\.mpd(?:\?[^"'\s]*)?/gi,
      // Google Drive direct links
      /https:\/\/drive\.google\.com\/[^"'\s]+/gi,
      // Other cloud storage direct links
      /https?:\/\/[^"'\s]*(?:mediafire|mega|dropbox)[^"'\s]+/gi,
    ];

    const foundUrls = new Set();

    for (const pattern of videoPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        const url = match[0];
        if (url.length > 20 && !url.includes('5movierulz')) {
          foundUrls.add(url);
        }
      }
    }

    // Look for embedded players that might contain direct URLs
    const embedPatterns = [
      /<iframe[^>]*src="([^"]+)"[^>]*>/gi,
      /<video[^>]*src="([^"]+)"[^>]*>/gi,
      /<source[^>]*src="([^"]+)"[^>]*>/gi,
    ];

    for (const pattern of embedPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        const url = match[1];
        if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('drive.google')) {
          foundUrls.add(url);
        }
      }
    }

    directUrls.push(...Array.from(foundUrls));
    console.log(`Found ${directUrls.length} direct video URLs`);

  } catch (error) {
    console.error('Error extracting direct URLs:', error);
  }

  return directUrls;
}