export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let query;
  if (req.method === 'POST') {
    query = req.body.query;
  } else {
    query = req.query.q || req.query.query;
  }

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    console.log('Scraping moviezwap.care for:', query);
    
    // Simplified approach to avoid potential issues
    const searchUrl = `https://www.moviezwap.care/search.php?q=${encodeURIComponent(query)}`;
    console.log('Fetching:', searchUrl);

    // Try multiple approaches to bypass 403
    let response;
    let lastError;

    // Method 1: Basic headers
    try {
      console.log('Trying method 1: Basic headers');
      const headers1 = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.moviezwap.care/'
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      response = await fetch(searchUrl, {
        method: 'GET',
        headers: headers1,
        redirect: 'follow'
      });

      if (response.ok) {
        console.log('Method 1 succeeded');
      } else {
        throw new Error(`Method 1 failed: ${response.status}`);
      }
    } catch (error) {
      console.log('Method 1 failed:', error.message);
      lastError = error;

      // Method 2: Mobile user agent
      try {
        console.log('Trying method 2: Mobile user agent');
        const headers2 = {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/'
        };

        await new Promise(resolve => setTimeout(resolve, 2000));
        response = await fetch(searchUrl, {
          method: 'GET',
          headers: headers2,
          redirect: 'follow'
        });

        if (response.ok) {
          console.log('Method 2 succeeded');
        } else {
          throw new Error(`Method 2 failed: ${response.status}`);
        }
      } catch (error2) {
        console.log('Method 2 failed:', error2.message);
        lastError = error2;

        // Method 3: Minimal headers
        try {
          console.log('Trying method 3: Minimal headers');
          const headers3 = {
            'User-Agent': 'curl/7.68.0',
            'Accept': '*/*'
          };

          await new Promise(resolve => setTimeout(resolve, 3000));
          response = await fetch(searchUrl, {
            method: 'GET',
            headers: headers3,
            redirect: 'follow'
          });

          if (response.ok) {
            console.log('Method 3 succeeded');
          } else {
            throw new Error(`Method 3 failed: ${response.status}`);
          }
        } catch (error3) {
          console.log('Method 3 failed:', error3.message);
          lastError = error3;
          
          // All methods failed, throw the last error
          throw lastError;
        }
      }
    }

    if (!response.ok) {
      console.log('Response not OK:', response.status, response.statusText);
      // Return empty results instead of throwing error
      return res.status(200).json({
        success: false,
        source: 'moviezwap.care',
        query: query,
        results: [],
        total: 0,
        message: `MoviezWap returned ${response.status}. Continuing with other sources.`,
        error: `HTTP ${response.status}`
      });
    }

    const html = await response.text();
    console.log('HTML fetched, length:', html.length);

    // Log a sample of the HTML to debug the structure
    console.log('HTML sample:', html.substring(html.indexOf('mylist') - 100, html.indexOf('mylist') + 200));

    // Extract movie data from HTML
    const movies = extractMovieData(html);
    
    console.log('Extracted movies:', movies.length);

    res.status(200).json({
      success: true,
      source: 'moviezwap.care',
      query: query,
      results: movies,
      total: movies.length,
      message: `Found ${movies.length} movies from moviezwap.care`
    });

  } catch (error) {
    console.error('Moviezwap scraping error:', error);
    // Return empty results instead of 500 error to not break the UI
    res.status(200).json({ 
      success: false,
      error: 'Failed to scrape moviezwap.care',
      message: error.message,
      source: 'moviezwap.care',
      results: [],
      total: 0
    });
  }
}

function extractMovieData(html) {
  const movies = [];
  
  try {
    console.log('Starting movie extraction...');
    
    if (!html || html.length < 100) {
      console.log('HTML too short or empty');
      return [];
    }
    
    // Exact pattern based on the HTML structure we found
    // <div class='mylist'>   <img src='/images/arrow.gif' border='0'><a href='/movie/Lokah-Chapter-1:-Chandra-(2025)-Telugu.html'>Lokah Chapter 1: Chandra (2025) Telugu [DVDScr] </a> </div>
    const moviePattern = /<div class='mylist'>\s*<img[^>]*border='0'>\s*<a href='([^']+)'>([^<]+)<\/a>\s*<\/div>/gi;
    let match;
    const foundMovies = new Set();
    
    while ((match = moviePattern.exec(html)) !== null && movies.length < 15) {
      try {
        const url = match[1];
        const title = match[2].trim();
        
        console.log('Found movie:', title, 'URL:', url);
        
        if (title && title.length > 3) {
          const movieKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!foundMovies.has(movieKey)) {
            foundMovies.add(movieKey);
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
      } catch (movieError) {
        console.error('Error processing movie:', movieError);
        continue;
      }
    }

    console.log('Total movies extracted:', movies.length);
    return movies;

  } catch (error) {
    console.error('Error extracting movie data:', error);
    return [];
  }
}

function parseMovieFromHtml(movieHtml) {
  try {
    // Extract title
    const titlePatterns = [
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i,
      /<a[^>]*title=[\"']([^\"']+)[\"'][^>]*>/i,
      /<a[^>]*>([^<]+)<\/a>/i,
      /<span[^>]*class[^>]*title[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class[^>]*title[^>]*>([^<]+)<\/div>/i
    ];

    let title = null;
    for (const pattern of titlePatterns) {
      const match = movieHtml.match(pattern);
      if (match && match[1].trim().length > 2) {
        title = match[1].trim();
        break;
      }
    }

    if (!title) return null;

    // Extract URL
    const urlPattern = /<a[^>]*href=[\"']([^\"']+)[\"']/i;
    const urlMatch = movieHtml.match(urlPattern);
    const url = urlMatch ? resolveUrl(urlMatch[1], 'https://www.moviezwap.care') : null;

    // Extract poster/image
    const imgPattern = /<img[^>]*src=[\"']([^\"']+)[\"']/i;
    const imgMatch = movieHtml.match(imgPattern);
    let poster = imgMatch ? resolveUrl(imgMatch[1], 'https://www.moviezwap.care') : null;

    // Generate placeholder if no poster
    if (!poster) {
      poster = `data:image/svg+xml;base64,${btoa(`
        <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#667eea"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" text-anchor="middle" dy=".3em">
            ${title.substring(0, 20)}
          </text>
        </svg>
      `)}`;
    }

    return {
      title: cleanTitle(title),
      url: url,
      source: 'moviezwap.care',
      year: extractYear(title + ' ' + movieHtml),
      quality: extractQuality(title + ' ' + movieHtml),
      language: extractLanguage(title + ' ' + movieHtml),
      genre: extractGenre(movieHtml),
      poster: poster,
      streamingUrls: []
    };

  } catch (error) {
    console.error('Error parsing movie HTML:', error);
    return null;
  }
}

function cleanTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\(\)\[\]]/g, '')
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
    /\b(360p)\b/i,
    /\b(BluRay|BRRip|BDRip)\b/i,
    /\b(DVDRip|DVD)\b/i,
    /\b(WebRip|WEB-DL|WebDL)\b/i,
    /\b(HDRip|HDTVRip)\b/i,
    /\b(CAM|TS|TC)\b/i
  ];

  for (const pattern of qualityPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

function extractLanguage(text) {
  const langPatterns = [
    /\b(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali|Punjabi|Gujarati|Marathi)\b/i,
    /\b(Dual Audio|Multi Audio)\b/i
  ];

  for (const pattern of langPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

function extractGenre(text) {
  const genrePatterns = [
    /\b(Action|Comedy|Drama|Horror|Thriller|Romance|Sci-Fi|Fantasy|Adventure|Crime|Mystery)\b/i
  ];

  for (const pattern of genrePatterns) {
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
    } else if (url.startsWith('//')) {
      return 'https:' + url;
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

// Helper function for base64 encoding in Node.js environment
function btoa(str) {
  return Buffer.from(str).toString('base64');
}