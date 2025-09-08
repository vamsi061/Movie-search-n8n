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

  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    console.log('Playwright download extraction from:', url);
    
    // For Vercel deployment, we'll simulate Playwright behavior with advanced fetch
    // In a full deployment, you would use actual Playwright here
    const downloadLinks = await simulatePlaywrightExtraction(url);
    
    console.log('Playwright simulation found:', downloadLinks.length, 'links');

    res.status(200).json({
      url: url,
      downloadLinks: downloadLinks,
      total: downloadLinks.length,
      message: `Playwright extraction found ${downloadLinks.length} download links`,
      method: 'playwright-simulation'
    });

  } catch (error) {
    console.error('Playwright download extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract download links (playwright)',
      message: error.message 
    });
  }
}

async function simulatePlaywrightExtraction(url) {
  const downloadLinks = [];
  
  try {
    // Simulate browser-like behavior with multiple requests
    const sessions = await Promise.allSettled([
      fetchWithSession(url, 'chrome'),
      fetchWithSession(url, 'firefox'),
      fetchWithSession(url, 'safari')
    ]);

    const htmlContents = sessions
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    // Combine results from all sessions
    for (const html of htmlContents) {
      const links = await extractLinksFromHTML(html, url);
      downloadLinks.push(...links);
    }

    // Remove duplicates
    const uniqueLinks = [];
    const seenUrls = new Set();
    
    for (const link of downloadLinks) {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);
        uniqueLinks.push(link);
      }
    }

    return uniqueLinks.slice(0, 15); // Limit results

  } catch (error) {
    console.error('Error in Playwright simulation:', error);
    return [];
  }
}

async function fetchWithSession(url, browserType) {
  const userAgents = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  };

  const headers = {
    'User-Agent': userAgents[browserType],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  // Add random delay to simulate human behavior
  await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch with ${browserType}: ${response.status}`);
  }

  return await response.text();
}

async function extractLinksFromHTML(html, baseUrl) {
  const downloadLinks = [];
  
  // Advanced extraction patterns for different scenarios
  const extractionMethods = [
    extractDirectVideoLinks,
    extractCloudStorageLinks,
    extractTorrentLinks,
    extractFileHostingLinks,
    extractHiddenLinks,
    extractJavaScriptLinks
  ];

  for (const method of extractionMethods) {
    try {
      const links = await method(html, baseUrl);
      downloadLinks.push(...links);
    } catch (error) {
      console.log(`Extraction method failed:`, error.message);
    }
  }

  return downloadLinks;
}

function extractDirectVideoLinks(html, baseUrl) {
  const links = [];
  const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg'];
  
  for (const ext of videoExtensions) {
    const pattern = new RegExp(`href=[\"']([^\"']*\\.${ext}[^\"']*)[\"']`, 'gi');
    let match;
    
    while ((match = pattern.exec(html)) !== null) {
      const url = resolveUrl(match[1], baseUrl);
      if (url) {
        links.push({
          url: url,
          service: 'Direct Download',
          type: 'direct',
          quality: extractQualityFromUrl(url),
          size: 'Unknown',
          priority: 1
        });
      }
    }
  }
  
  return links;
}

function extractCloudStorageLinks(html, baseUrl) {
  const links = [];
  const cloudPatterns = [
    {
      pattern: /href=[\"']([^\"']*(?:drive\.google\.com|docs\.google\.com)\/[^\"']*)[\"']/gi,
      service: 'Google Drive'
    },
    {
      pattern: /href=[\"']([^\"']*mega\.(?:nz|co\.nz)\/[^\"']*)[\"']/gi,
      service: 'Mega'
    },
    {
      pattern: /href=[\"']([^\"']*mediafire\.com\/[^\"']*)[\"']/gi,
      service: 'MediaFire'
    },
    {
      pattern: /href=[\"']([^\"']*dropbox\.com\/[^\"']*)[\"']/gi,
      service: 'Dropbox'
    }
  ];

  for (const cloudPattern of cloudPatterns) {
    let match;
    while ((match = cloudPattern.pattern.exec(html)) !== null) {
      const url = resolveUrl(match[1], baseUrl);
      if (url) {
        links.push({
          url: url,
          service: cloudPattern.service,
          type: 'cloud',
          quality: extractQualityFromUrl(url),
          size: 'Unknown',
          priority: 2
        });
      }
    }
  }
  
  return links;
}

function extractTorrentLinks(html, baseUrl) {
  const links = [];
  const torrentPatterns = [
    /href=[\"']([^\"']*\.torrent[^\"']*)[\"']/gi,
    /href=[\"'](magnet:\?xt=urn:btih:[^\"']*)[\"']/gi
  ];

  for (const pattern of torrentPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1].startsWith('magnet:') ? match[1] : resolveUrl(match[1], baseUrl);
      if (url) {
        links.push({
          url: url,
          service: 'Torrent',
          type: 'torrent',
          quality: extractQualityFromUrl(url),
          size: 'Unknown',
          priority: 8
        });
      }
    }
  }
  
  return links;
}

function extractFileHostingLinks(html, baseUrl) {
  const links = [];
  const hostingServices = [
    'zippyshare', 'rapidgator', 'uploaded', 'turbobit', 'nitroflare',
    '1fichier', 'uptobox', 'filefactory', 'depositfiles'
  ];

  for (const service of hostingServices) {
    const pattern = new RegExp(`href=[\"']([^\"']*${service}\\.[^\"']*)[\"']`, 'gi');
    let match;
    
    while ((match = pattern.exec(html)) !== null) {
      const url = resolveUrl(match[1], baseUrl);
      if (url) {
        links.push({
          url: url,
          service: 'File Hosting',
          type: 'filehost',
          quality: extractQualityFromUrl(url),
          size: 'Unknown',
          priority: 6
        });
      }
    }
  }
  
  return links;
}

function extractHiddenLinks(html, baseUrl) {
  const links = [];
  
  // Look for base64 encoded URLs
  const base64Pattern = /data-url=[\"']([A-Za-z0-9+\/=]+)[\"']/gi;
  let match;
  
  while ((match = base64Pattern.exec(html)) !== null) {
    try {
      const decoded = atob(match[1]);
      if (decoded.startsWith('http') || decoded.startsWith('magnet:')) {
        links.push({
          url: decoded,
          service: 'Hidden Link',
          type: 'hidden',
          quality: extractQualityFromUrl(decoded),
          size: 'Unknown',
          priority: 5
        });
      }
    } catch (e) {
      // Invalid base64, skip
    }
  }
  
  return links;
}

function extractJavaScriptLinks(html, baseUrl) {
  const links = [];
  
  // Extract URLs from JavaScript variables and functions
  const jsPatterns = [
    /(?:downloadUrl|fileUrl|movieUrl)\s*=\s*[\"']([^\"']+)[\"']/gi,
    /window\.open\([\"']([^\"']+)[\"']\)/gi,
    /location\.href\s*=\s*[\"']([^\"']+)[\"']/gi
  ];

  for (const pattern of jsPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = resolveUrl(match[1], baseUrl);
      if (url && (url.includes('download') || url.includes('file') || url.includes('movie'))) {
        links.push({
          url: url,
          service: 'JavaScript Link',
          type: 'javascript',
          quality: extractQualityFromUrl(url),
          size: 'Unknown',
          priority: 7
        });
      }
    }
  }
  
  return links;
}

function resolveUrl(url, baseUrl) {
  if (!url) return null;
  
  try {
    // Clean the URL
    url = url.trim().replace(/[\r\n\t]/g, '');
    
    // Skip invalid URLs
    if (url.includes('javascript:') || url.includes('mailto:') || url === '#') {
      return null;
    }
    
    // Handle different URL formats
    if (url.startsWith('//')) {
      return 'https:' + url;
    } else if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return base.origin + url;
    } else if (url.startsWith('http') || url.startsWith('magnet:')) {
      return url;
    } else {
      return new URL(url, baseUrl).href;
    }
  } catch (e) {
    return null;
  }
}

function extractQualityFromUrl(url) {
  const qualityPatterns = [
    /\b(4K|2160p)\b/i,
    /\b(1080p|FHD)\b/i,
    /\b(720p|HD)\b/i,
    /\b(480p|SD)\b/i,
    /\b(360p)\b/i,
    /\b(BluRay|BRRip)\b/i,
    /\b(DVDRip)\b/i,
    /\b(WebRip|WEB-DL)\b/i,
    /\b(HDRip)\b/i,
    /\b(CAM|TS)\b/i
  ];

  for (const pattern of qualityPatterns) {
    const match = url.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

// Utility function to decode base64 (for Node.js environment)
function atob(str) {
  return Buffer.from(str, 'base64').toString('binary');
}