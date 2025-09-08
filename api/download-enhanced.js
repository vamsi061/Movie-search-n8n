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
    console.log('Enhanced download extraction from:', url);
    
    // Multiple user agents to rotate and avoid detection
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];

    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Enhanced headers to mimic real browser behavior
    const headers = {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.google.com/',
    };

    // Add random delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie page: ${response.status}`);
    }

    const html = await response.text();
    console.log('Enhanced page fetched, length:', html.length);

    // Extract download links with advanced patterns
    const downloadLinks = await extractAdvancedDownloadLinks(html, url);
    
    console.log('Enhanced extraction found:', downloadLinks.length, 'links');

    res.status(200).json({
      url: url,
      downloadLinks: downloadLinks,
      total: downloadLinks.length,
      message: `Enhanced extraction found ${downloadLinks.length} download links`,
      method: 'enhanced'
    });

  } catch (error) {
    console.error('Enhanced download extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract download links (enhanced)',
      message: error.message 
    });
  }
}

async function extractAdvancedDownloadLinks(html, baseUrl) {
  const downloadLinks = [];
  
  try {
    // Advanced patterns for different types of download links
    const advancedPatterns = [
      // Direct video file links
      {
        pattern: /href=[\"']([^\"']*\.(?:mp4|mkv|avi|mov|wmv|flv|webm|m4v|3gp|mpg|mpeg)[^\"']*)[\"']/gi,
        type: 'direct',
        service: 'Direct Download'
      },
      
      // Google Drive patterns (multiple variations)
      {
        pattern: /href=[\"']([^\"']*(?:drive\.google\.com|docs\.google\.com)\/(?:file\/d\/|open\?id=|uc\?id=)[^\"']*)[\"']/gi,
        type: 'cloud',
        service: 'Google Drive'
      },
      
      // Mega.nz patterns
      {
        pattern: /href=[\"']([^\"']*mega\.(?:nz|co\.nz)\/(?:file\/|#!)[^\"']*)[\"']/gi,
        type: 'cloud',
        service: 'Mega'
      },
      
      // MediaFire patterns
      {
        pattern: /href=[\"']([^\"']*mediafire\.com\/(?:file\/|download\/)[^\"']*)[\"']/gi,
        type: 'cloud',
        service: 'MediaFire'
      },
      
      // Dropbox patterns
      {
        pattern: /href=[\"']([^\"']*dropbox\.com\/(?:s\/|sh\/)[^\"']*)[\"']/gi,
        type: 'cloud',
        service: 'Dropbox'
      },
      
      // Torrent and magnet links
      {
        pattern: /href=[\"']([^\"']*\.torrent[^\"']*)[\"']/gi,
        type: 'torrent',
        service: 'Torrent'
      },
      {
        pattern: /href=[\"'](magnet:\?xt=urn:btih:[^\"']*)[\"']/gi,
        type: 'torrent',
        service: 'Torrent'
      },
      
      // Other file hosting services
      {
        pattern: /href=[\"']([^\"']*(?:zippyshare|rapidgator|uploaded|turbobit|nitroflare|1fichier|uptobox)\.(?:com|net|org)[^\"']*)[\"']/gi,
        type: 'filehost',
        service: 'File Hosting'
      },
      
      // Streaming services that might have download options
      {
        pattern: /href=[\"']([^\"']*(?:streamtape|doodstream|mixdrop|streamlare|streamhub)\.(?:com|net|org)[^\"']*)[\"']/gi,
        type: 'stream',
        service: 'Streaming'
      }
    ];

    const foundUrls = new Set();

    // Extract URLs using advanced patterns
    for (const patternObj of advancedPatterns) {
      let match;
      while ((match = patternObj.pattern.exec(html)) !== null) {
        let downloadUrl = match[1];
        
        // Clean and validate URL
        downloadUrl = cleanUrl(downloadUrl, baseUrl);
        
        if (isValidDownloadUrl(downloadUrl)) {
          foundUrls.add(JSON.stringify({
            url: downloadUrl,
            type: patternObj.type,
            service: patternObj.service
          }));
        }
      }
    }

    // Look for download buttons and links with specific text patterns
    const downloadButtonPatterns = [
      /<a[^>]*href=[\"']([^\"']+)[\"'][^>]*>.*?(?:download|dl|get|grab|save|fetch).*?<\/a>/gi,
      /<button[^>]*onclick=[\"'].*?(?:window\.open|location\.href)\s*=\s*[\"']([^\"']+)[\"'].*?download.*?<\/button>/gi,
      /<div[^>]*class=[\"'][^\"']*download[^\"']*[\"'][^>]*>.*?href=[\"']([^\"']+)[\"']/gi
    ];

    for (const pattern of downloadButtonPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let downloadUrl = cleanUrl(match[1], baseUrl);
        
        if (isValidDownloadUrl(downloadUrl)) {
          foundUrls.add(JSON.stringify({
            url: downloadUrl,
            type: 'button',
            service: 'Direct Download'
          }));
        }
      }
    }

    // Look for embedded JavaScript download links
    const jsPatterns = [
      /(?:window\.open|location\.href|document\.location)\s*=\s*[\"']([^\"']*(?:download|dl|\.mp4|\.mkv|\.avi|drive\.google|mega\.nz)[^\"']*)[\"']/gi,
      /var\s+downloadUrl\s*=\s*[\"']([^\"']+)[\"']/gi,
      /downloadLink\s*:\s*[\"']([^\"']+)[\"']/gi
    ];

    for (const pattern of jsPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let downloadUrl = cleanUrl(match[1], baseUrl);
        
        if (isValidDownloadUrl(downloadUrl)) {
          foundUrls.add(JSON.stringify({
            url: downloadUrl,
            type: 'javascript',
            service: 'Direct Download'
          }));
        }
      }
    }

    // Convert to structured format with enhanced metadata
    for (const urlStr of foundUrls) {
      const urlObj = JSON.parse(urlStr);
      const url = urlObj.url;
      const urlLower = url.toLowerCase();
      
      let quality = extractQuality(url, html);
      let size = extractFileSize(url, html);
      let language = extractLanguage(url, html);

      const downloadLink = {
        url: url,
        service: urlObj.service,
        type: urlObj.type,
        quality: quality,
        size: size,
        language: language,
        priority: getPriority(urlObj.service, urlObj.type)
      };

      downloadLinks.push(downloadLink);
    }

    // Sort by priority and quality
    downloadLinks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return getQualityScore(b.quality) - getQualityScore(a.quality);
    });

    // Remove duplicates and limit results
    const uniqueLinks = [];
    const seenUrls = new Set();
    
    for (const link of downloadLinks) {
      if (!seenUrls.has(link.url) && uniqueLinks.length < 20) {
        seenUrls.add(link.url);
        uniqueLinks.push(link);
      }
    }

    return uniqueLinks;

  } catch (error) {
    console.error('Error in advanced download extraction:', error);
    return [];
  }
}

function cleanUrl(url, baseUrl) {
  if (!url) return '';
  
  // Remove whitespace and newlines
  url = url.trim().replace(/[\r\n\t]/g, '');
  
  // Handle relative URLs
  if (url.startsWith('//')) {
    url = 'https:' + url;
  } else if (url.startsWith('/')) {
    const base = new URL(baseUrl);
    url = base.origin + url;
  } else if (!url.startsWith('http') && !url.startsWith('magnet:')) {
    try {
      url = new URL(url, baseUrl).href;
    } catch (e) {
      return '';
    }
  }
  
  return url;
}

function isValidDownloadUrl(url) {
  if (!url || url.length < 10) return false;
  if (url.includes('javascript:') || url.includes('mailto:')) return false;
  if (url.includes('#') && !url.includes('mega.nz')) return false;
  if (url.includes('void(0)')) return false;
  
  return true;
}

function extractQuality(url, html) {
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

  const searchText = url + ' ' + html.substring(html.indexOf(url) - 100, html.indexOf(url) + 100);
  
  for (const pattern of qualityPatterns) {
    const match = searchText.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

function extractFileSize(url, html) {
  const sizePattern = /\b(\d+(?:\.\d+)?)\s*(GB|MB|KB|TB)\b/i;
  const searchText = url + ' ' + html.substring(html.indexOf(url) - 100, html.indexOf(url) + 100);
  
  const match = searchText.match(sizePattern);
  return match ? match[0] : 'Unknown';
}

function extractLanguage(url, html) {
  const langPatterns = [
    /\b(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali|Punjabi|Gujarati|Marathi)\b/i,
    /\b(Dual Audio|Multi Audio)\b/i
  ];

  const searchText = url + ' ' + html.substring(html.indexOf(url) - 100, html.indexOf(url) + 100);
  
  for (const pattern of langPatterns) {
    const match = searchText.match(pattern);
    if (match) return match[0];
  }
  
  return 'Unknown';
}

function getPriority(service, type) {
  const priorities = {
    'Google Drive': 1,
    'Mega': 2,
    'MediaFire': 3,
    'Dropbox': 4,
    'Direct Download': 5,
    'File Hosting': 6,
    'Streaming': 7,
    'Torrent': 8
  };
  
  return priorities[service] || 9;
}

function getQualityScore(quality) {
  const scores = {
    '4K': 100, '2160p': 100,
    '1080p': 80, 'FHD': 80, 'Full HD': 80,
    '720p': 60, 'HD': 60,
    '480p': 40, 'SD': 40,
    '360p': 20,
    'BluRay': 90, 'BRRip': 85, 'BDRip': 85,
    'DVDRip': 70, 'DVD': 70,
    'WebRip': 75, 'WEB-DL': 75, 'WebDL': 75,
    'HDRip': 65, 'HDTVRip': 65,
    'CAM': 10, 'TS': 15, 'TC': 15
  };
  
  return scores[quality] || 0;
}