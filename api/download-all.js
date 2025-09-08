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

  const { url, method = 'enhanced' } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    console.log(`${method} download extraction from:`, url);
    
    let downloadLinks = [];
    
    switch (method) {
      case 'enhanced':
        downloadLinks = await extractEnhancedDownloadLinks(url);
        break;
      case 'playwright':
        downloadLinks = await extractPlaywrightDownloadLinks(url);
        break;
      case 'basic':
      default:
        downloadLinks = await extractBasicDownloadLinks(url);
        break;
    }
    
    console.log(`${method} extraction found:`, downloadLinks.length, 'links');

    res.status(200).json({
      url: url,
      downloadLinks: downloadLinks,
      total: downloadLinks.length,
      message: `${method} extraction found ${downloadLinks.length} download links`,
      method: method
    });

  } catch (error) {
    console.error(`${method} download extraction error:`, error);
    res.status(500).json({ 
      error: `Failed to extract download links (${method})`,
      message: error.message 
    });
  }
}

// Enhanced extraction with bot bypass
async function extractEnhancedDownloadLinks(url) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];

  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const headers = {
    'User-Agent': randomUserAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
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

  // Random delay to avoid rate limiting
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
  return await extractAdvancedDownloadLinks(html, url);
}

// Playwright simulation
async function extractPlaywrightDownloadLinks(url) {
  const sessions = await Promise.allSettled([
    fetchWithSession(url, 'chrome'),
    fetchWithSession(url, 'firefox')
  ]);

  const htmlContents = sessions
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  const downloadLinks = [];
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

  return uniqueLinks.slice(0, 15);
}

// Basic extraction (original method)
async function extractBasicDownloadLinks(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.5movierulz.villas/',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch movie page: ${response.status}`);
  }

  const html = await response.text();
  return extractBasicLinks(html, url);
}

// Advanced link extraction
async function extractAdvancedDownloadLinks(html, baseUrl) {
  const downloadLinks = [];
  
  const advancedPatterns = [
    {
      pattern: /href=[\"']([^\"']*\.(?:mp4|mkv|avi|mov|wmv|flv|webm|m4v|3gp|mpg|mpeg)[^\"']*)[\"']/gi,
      type: 'direct',
      service: 'Direct Download'
    },
    {
      pattern: /href=[\"']([^\"']*(?:drive\.google\.com|docs\.google\.com)\/(?:file\/d\/|open\?id=|uc\?id=)[^\"']*)[\"']/gi,
      type: 'cloud',
      service: 'Google Drive'
    },
    {
      pattern: /href=[\"']([^\"']*mega\.(?:nz|co\.nz)\/(?:file\/|#!)[^\"']*)[\"']/gi,
      type: 'cloud',
      service: 'Mega'
    },
    {
      pattern: /href=[\"']([^\"']*mediafire\.com\/(?:file\/|download\/)[^\"']*)[\"']/gi,
      type: 'cloud',
      service: 'MediaFire'
    },
    {
      pattern: /href=[\"']([^\"']*dropbox\.com\/(?:s\/|sh\/)[^\"']*)[\"']/gi,
      type: 'cloud',
      service: 'Dropbox'
    },
    {
      pattern: /href=[\"']([^\"']*\.torrent[^\"']*)[\"']/gi,
      type: 'torrent',
      service: 'Torrent'
    },
    {
      pattern: /href=[\"'](magnet:\?xt=urn:btih:[^\"']*)[\"']/gi,
      type: 'torrent',
      service: 'Torrent'
    }
  ];

  const foundUrls = new Set();

  for (const patternObj of advancedPatterns) {
    let match;
    while ((match = patternObj.pattern.exec(html)) !== null) {
      let downloadUrl = match[1];
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

  // Convert to structured format
  for (const urlStr of foundUrls) {
    const urlObj = JSON.parse(urlStr);
    const url = urlObj.url;
    
    let quality = extractQuality(url, html);
    let size = extractFileSize(url, html);

    const downloadLink = {
      url: url,
      service: urlObj.service,
      type: urlObj.type,
      quality: quality,
      size: size,
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

  return downloadLinks.slice(0, 20);
}

// Helper functions for session fetching
async function fetchWithSession(url, browserType) {
  const userAgents = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  };

  const headers = {
    'User-Agent': userAgents[browserType],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

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
  const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
  
  for (const ext of videoExtensions) {
    const pattern = new RegExp(`href=[\"']([^\"']*\\.${ext}[^\"']*)[\"']`, 'gi');
    let match;
    
    while ((match = pattern.exec(html)) !== null) {
      const url = resolveUrl(match[1], baseUrl);
      if (url) {
        downloadLinks.push({
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
  
  return downloadLinks;
}

// Basic extraction for fallback
function extractBasicLinks(html, baseUrl) {
  const downloadLinks = [];
  
  const downloadPatterns = [
    /href=[\"']([^\"']*(?:download|dl)[^\"']*)[\"']/gi,
    /href=[\"']([^\"']*\.(?:mp4|mkv|avi|mov|wmv|flv|webm|m4v)[^\"']*)[\"']/gi,
    /href=[\"']([^\"']*drive\.google\.com[^\"']*)[\"']/gi,
    /href=[\"']([^\"']*mega\.nz[^\"']*)[\"']/gi,
    /href=[\"']([^\"']*mediafire\.com[^\"']*)[\"']/gi,
    /href=[\"']([^\"']*dropbox\.com[^\"']*)[\"']/gi,
    /href=[\"']([^\"']*\.torrent[^\"']*)[\"']/gi,
    /href=[\"'](magnet:[^\"']*)[\"']/gi,
  ];

  const foundUrls = new Set();

  for (const pattern of downloadPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let downloadUrl = match[1];
      
      if (downloadUrl.startsWith('//')) {
        downloadUrl = 'https:' + downloadUrl;
      } else if (downloadUrl.startsWith('/')) {
        downloadUrl = 'https://www.5movierulz.villas' + downloadUrl;
      }
      
      if (downloadUrl.includes('javascript:') || downloadUrl.includes('mailto:') || 
          downloadUrl.includes('#') || downloadUrl.length < 10) {
        continue;
      }
      
      foundUrls.add(downloadUrl);
    }
  }

  for (const url of foundUrls) {
    let service = 'Unknown';
    let quality = 'Unknown';
    let size = 'Unknown';

    if (url.includes('drive.google')) {
      service = 'Google Drive';
    } else if (url.includes('mega.')) {
      service = 'Mega';
    } else if (url.includes('mediafire')) {
      service = 'MediaFire';
    } else if (url.includes('dropbox')) {
      service = 'Dropbox';
    } else if (url.includes('torrent') || url.includes('magnet:')) {
      service = 'Torrent';
    } else if (url.includes('download') || url.includes('dl')) {
      service = 'Direct Download';
    }

    const qualityMatch = url.match(/\b(720p|1080p|4K|HD|HDRip|BluRay|DVDRip|WebRip|CAM|TS)\b/i);
    if (qualityMatch) {
      quality = qualityMatch[0];
    }

    downloadLinks.push({
      url: url,
      service: service,
      quality: quality,
      size: size,
      type: service === 'Torrent' ? 'torrent' : 'direct'
    });
  }

  return downloadLinks.slice(0, 15);
}

// Utility functions
function cleanUrl(url, baseUrl) {
  if (!url) return '';
  
  url = url.trim().replace(/[\r\n\t]/g, '');
  
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

function resolveUrl(url, baseUrl) {
  if (!url) return null;
  
  try {
    url = url.trim().replace(/[\r\n\t]/g, '');
    
    if (url.includes('javascript:') || url.includes('mailto:') || url === '#') {
      return null;
    }
    
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

function extractFileSize(url, html) {
  const sizePattern = /\b(\d+(?:\.\d+)?)\s*(GB|MB|KB|TB)\b/i;
  const searchText = url + ' ' + html.substring(html.indexOf(url) - 100, html.indexOf(url) + 100);
  
  const match = searchText.match(sizePattern);
  return match ? match[0] : 'Unknown';
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