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
    
    // Function to extract all streaming links from movie page
    async function extractStreamingLinksFromMoviePage(moviePageUrl) {
      try {
        console.log('Extracting streaming links from:', moviePageUrl);
        
        const response = await fetch(moviePageUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.5movierulz.villas/',
          },
          timeout: 10000 // 10 second timeout for individual page fetches
        });

        if (!response.ok) {
          console.error(`Failed to fetch movie page: ${response.status}`);
          return [];
        }

        const html = await response.text();
        return extractAllStreamingLinks(html);
        
      } catch (error) {
        console.error('Error extracting streaming links from movie page:', error);
        return [];
      }
    }

    function extractAllStreamingLinks(html) {
      const streamingLinks = [];
      
      try {
        // Comprehensive patterns for different streaming services
        const streamingPatterns = [
          // StreamLare patterns
          {
            pattern: /href=[\"']([^\"']*(?:streamlare|vcdnlare)\.com[^\"']*)[\"']/gi,
            service: 'streamlare',
            priority: 1,
            quality: 'HD'
          },
          
          // DoodStream patterns
          {
            pattern: /href=[\"']([^\"']*doodstream\.com[^\"']*)[\"']/gi,
            service: 'doodstream',
            priority: 2,
            quality: 'HD'
          },
          
          // MixDrop patterns
          {
            pattern: /href=[\"']([^\"']*mixdrop\.co[^\"']*)[\"']/gi,
            service: 'mixdrop',
            priority: 2,
            quality: 'HD'
          },
          
          // NetuTV/Waaw patterns
          {
            pattern: /href=[\"']([^\"']*waaw\/\?l=[^\"']*)[\"']/gi,
            service: 'netutv',
            priority: 1,
            quality: 'HD'
          },
          
          // Uperbox patterns
          {
            pattern: /href=[\"']([^\"']*uperbox\.io[^\"']*)[\"']/gi,
            service: 'uperbox',
            priority: 1,
            quality: 'HD'
          },
          
          // VidCloud patterns
          {
            pattern: /href=[\"']([^\"']*vidcloud[^\"']*)[\"']/gi,
            service: 'vidcloud',
            priority: 2,
            quality: 'HD'
          },
          
          // StreamHub patterns
          {
            pattern: /href=[\"']([^\"']*streamhub[^\"']*)[\"']/gi,
            service: 'streamhub',
            priority: 2,
            quality: 'HD'
          },
          
          // Torrent/Magnet patterns
          {
            pattern: /href=[\"']([^\"']*magnet:[^\"']*)[\"']/gi,
            service: 'torrent',
            priority: 3,
            quality: 'Various'
          }
        ];

        const foundUrls = new Set();

        // Extract URLs using patterns
        for (const patternObj of streamingPatterns) {
          let match;
          while ((match = patternObj.pattern.exec(html)) !== null) {
            let streamUrl = match[1];
            
            // Clean and validate URL
            if (streamUrl.startsWith('//')) {
              streamUrl = 'https:' + streamUrl;
            } else if (streamUrl.startsWith('/')) {
              streamUrl = 'https://www.5movierulz.villas' + streamUrl;
            }
            
            // Skip invalid URLs
            if (streamUrl.includes('javascript:') || streamUrl.includes('mailto:') || 
                streamUrl.includes('#') || streamUrl.length < 10) {
              continue;
            }
            
            // Clean up any malformed URLs
            streamUrl = streamUrl.replace(/[\r\n]/g, '').trim();
            
            // Avoid duplicates
            if (!foundUrls.has(streamUrl)) {
              foundUrls.add(streamUrl);
              
              // Try to extract quality from URL or surrounding context
              let quality = patternObj.quality;
              const qualityMatch = streamUrl.match(/\b(720p|1080p|4K|HD|HDRip|BluRay|DVDRip|WebRip|CAM|TS)\b/i);
              if (qualityMatch) {
                quality = qualityMatch[0];
              }
              
              streamingLinks.push({
                url: streamUrl,
                service: patternObj.service,
                priority: patternObj.priority,
                quality: quality,
                type: patternObj.service === 'torrent' ? 'torrent' : 'stream'
              });
            }
          }
        }

        // Look for embedded players and iframes
        const iframePatterns = [
          /<iframe[^>]*src=[\"']([^\"']+)[\"'][^>]*>/gi,
          /<embed[^>]*src=[\"']([^\"']+)[\"'][^>]*>/gi
        ];

        for (const pattern of iframePatterns) {
          let match;
          while ((match = pattern.exec(html)) !== null) {
            let embedUrl = match[1];
            
            if (embedUrl.startsWith('//')) {
              embedUrl = 'https:' + embedUrl;
            } else if (embedUrl.startsWith('/')) {
              embedUrl = 'https://www.5movierulz.villas' + embedUrl;
            }
            
            embedUrl = embedUrl.replace(/[\r\n]/g, '').trim();
            
            // Check if it's a known streaming service
            if ((embedUrl.includes('streamlare') || embedUrl.includes('doodstream') || 
                 embedUrl.includes('mixdrop') || embedUrl.includes('vidcloud')) &&
                !foundUrls.has(embedUrl)) {
              
              foundUrls.add(embedUrl);
              
              let service = 'embedded';
              if (embedUrl.includes('streamlare')) service = 'streamlare';
              else if (embedUrl.includes('doodstream')) service = 'doodstream';
              else if (embedUrl.includes('mixdrop')) service = 'mixdrop';
              else if (embedUrl.includes('vidcloud')) service = 'vidcloud';
              
              streamingLinks.push({
                url: embedUrl,
                service: service,
                priority: 2,
                quality: 'HD',
                type: 'embedded'
              });
            }
          }
        }

        // Sort by priority (lower number = higher priority)
        streamingLinks.sort((a, b) => a.priority - b.priority);

      } catch (error) {
        console.error('Error extracting streaming links:', error);
      }

      return streamingLinks;
    }

    // Function to enhance movies with streaming links
    async function enhanceMoviesWithStreamingLinks(results) {
      if (!Array.isArray(results)) return results;
      
      const enhancedResults = [];
      
      for (const movie of results) {
        try {
          // Extract streaming links from the movie page
          const streamingLinks = movie.movie_page ? 
            await extractStreamingLinksFromMoviePage(movie.movie_page) : [];
          
          // Clean the main URL
          let mainUrl = movie.url;
          if (mainUrl && (mainUrl.includes('vcdnlare.com') || mainUrl.includes('streamlare.com'))) {
            mainUrl = mainUrl.replace(/[\r\n]/g, '').trim();
            if (!mainUrl.startsWith('http')) {
              mainUrl = 'https://' + mainUrl;
            }
          }
          
          enhancedResults.push({
            ...movie,
            url: mainUrl,
            streamingUrls: streamingLinks.length > 0 ? streamingLinks : [{
              url: mainUrl,
              service: 'primary',
              priority: 1,
              quality: 'HD',
              type: 'stream'
            }]
          });
          
        } catch (error) {
          console.error('Error enhancing movie with streaming links:', error);
          // Fallback: keep original movie data
          enhancedResults.push({
            ...movie,
            streamingUrls: [{
              url: movie.url,
              service: 'primary',
              priority: 1,
              quality: 'HD',
              type: 'stream'
            }]
          });
        }
      }
      
      return enhancedResults;
    }
    
    if (Array.isArray(data)) {
      // If n8n returns an array directly
      const enhancedResults = await enhanceMoviesWithStreamingLinks(data);
      formattedResponse = {
        query: query,
        results: enhancedResults,
        total: enhancedResults.length,
        message: `Found ${enhancedResults.length} movies with streaming links`,
        source: "5movierulz.villas",
        success: true
      };
    } else if (data.results) {
      // If n8n returns an object with results property
      const enhancedResults = await enhanceMoviesWithStreamingLinks(data.results);
      formattedResponse = {
        ...data,
        results: enhancedResults,
        message: `Found ${enhancedResults.length} movies with streaming links`
      };
    } else {
      // If n8n returns a single object, wrap it in results array
      const enhancedResults = await enhanceMoviesWithStreamingLinks([data]);
      formattedResponse = {
        query: query,
        results: enhancedResults,
        total: 1,
        message: "Found 1 movie with streaming links",
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