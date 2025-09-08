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

  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    console.log('Fetching download links from:', url);
    
    // Fetch the movie page
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
    console.log('Movie page fetched, length:', html.length);

    // Extract download links from the HTML
    const downloadLinks = extractDownloadLinks(html);
    
    console.log('Found download links:', downloadLinks.length);

    res.status(200).json({
      url: url,
      downloadLinks: downloadLinks,
      total: downloadLinks.length,
      message: `Found ${downloadLinks.length} download links`
    });

  } catch (error) {
    console.error('Download extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract download links',
      message: error.message 
    });
  }
}

function extractDownloadLinks(html) {
  const downloadLinks = [];
  
  try {
    // Common download link patterns
    const downloadPatterns = [
      // Direct download links
      /href=[\"']([^\"']*(?:download|dl)[^\"']*)[\"']/gi,
      /href=[\"']([^\"']*\.(?:mp4|mkv|avi|mov|wmv|flv|webm|m4v)[^\"']*)[\"']/gi,
      
      // Google Drive links
      /href=[\"']([^\"']*drive\.google\.com[^\"']*)[\"']/gi,
      /href=[\"']([^\"']*docs\.google\.com[^\"']*)[\"']/gi,
      
      // Mega links
      /href=[\"']([^\"']*mega\.nz[^\"']*)[\"']/gi,
      /href=[\"']([^\"']*mega\.co\.nz[^\"']*)[\"']/gi,
      
      // MediaFire links
      /href=[\"']([^\"']*mediafire\.com[^\"']*)[\"']/gi,
      
      // Dropbox links
      /href=[\"']([^\"']*dropbox\.com[^\"']*)[\"']/gi,
      
      // Other file hosting services
      /href=[\"']([^\"']*(?:zippyshare|rapidgator|uploaded|turbobit|nitroflare)\.com[^\"']*)[\"']/gi,
      
      // Torrent links
      /href=[\"']([^\"']*\.torrent[^\"']*)[\"']/gi,
      /href=[\"']([^\"']*magnet:[^\"']*)[\"']/gi,
    ];

    const foundUrls = new Set();

    // Extract URLs using patterns
    for (const pattern of downloadPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let downloadUrl = match[1];
        
        // Clean and validate URL
        if (downloadUrl.startsWith('//')) {
          downloadUrl = 'https:' + downloadUrl;
        } else if (downloadUrl.startsWith('/')) {
          downloadUrl = 'https://www.5movierulz.villas' + downloadUrl;
        }
        
        // Skip invalid URLs
        if (downloadUrl.includes('javascript:') || downloadUrl.includes('mailto:') || 
            downloadUrl.includes('#') || downloadUrl.length < 10) {
          continue;
        }
        
        foundUrls.add(downloadUrl);
      }
    }

    // Look for download buttons/links with specific text
    const downloadTextPatterns = [
      /<a[^>]*href=[\"']([^\"']+)[\"'][^>]*>.*?(?:download|dl|get|grab).*?<\/a>/gi,
      /<a[^>]*>.*?(?:download|dl|get|grab).*?<\/a>[^>]*href=[\"']([^\"']+)[\"']/gi,
    ];

    for (const pattern of downloadTextPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let downloadUrl = match[1];
        
        if (downloadUrl.startsWith('/')) {
          downloadUrl = 'https://www.5movierulz.villas' + downloadUrl;
        }
        
        if (downloadUrl.startsWith('http') && !downloadUrl.includes('javascript:')) {
          foundUrls.add(downloadUrl);
        }
      }
    }

    // Convert to structured format
    for (const url of foundUrls) {
      const urlLower = url.toLowerCase();
      let service = 'Unknown';
      let quality = 'Unknown';
      let size = 'Unknown';

      // Determine service
      if (urlLower.includes('drive.google')) {
        service = 'Google Drive';
      } else if (urlLower.includes('mega.')) {
        service = 'Mega';
      } else if (urlLower.includes('mediafire')) {
        service = 'MediaFire';
      } else if (urlLower.includes('dropbox')) {
        service = 'Dropbox';
      } else if (urlLower.includes('torrent') || urlLower.includes('magnet:')) {
        service = 'Torrent';
      } else if (urlLower.includes('download') || urlLower.includes('dl')) {
        service = 'Direct Download';
      }

      // Try to extract quality from URL or surrounding text
      const qualityMatch = url.match(/\b(720p|1080p|4K|HD|HDRip|BluRay|DVDRip|WebRip|CAM|TS)\b/i);
      if (qualityMatch) {
        quality = qualityMatch[0];
      }

      // Try to extract file size
      const sizeMatch = url.match(/\b(\d+(?:\.\d+)?)\s*(GB|MB|KB)\b/i);
      if (sizeMatch) {
        size = sizeMatch[0];
      }

      downloadLinks.push({
        url: url,
        service: service,
        quality: quality,
        size: size,
        type: service === 'Torrent' ? 'torrent' : 'direct'
      });
    }

    // Sort by preference (Google Drive, Mega, etc. first)
    downloadLinks.sort((a, b) => {
      const serviceOrder = ['Google Drive', 'Mega', 'MediaFire', 'Dropbox', 'Direct Download', 'Torrent'];
      const aIndex = serviceOrder.indexOf(a.service);
      const bIndex = serviceOrder.indexOf(b.service);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  } catch (error) {
    console.error('Error extracting download links:', error);
  }

  return downloadLinks;
}