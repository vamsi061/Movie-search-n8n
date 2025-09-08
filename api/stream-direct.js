export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    const streamUrl = decodeURIComponent(url);
    console.log('Direct streaming:', streamUrl);

    // Fetch the StreamLare content directly and serve it
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.5movierulz.villas/',
        'Origin': 'https://www.5movierulz.villas',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1'
      }
    });

    if (!response.ok) {
      throw new Error(`StreamLare responded with ${response.status}`);
    }

    // Get the content type from StreamLare
    const contentType = response.headers.get('content-type') || 'text/html';
    
    // Copy all relevant headers from StreamLare response
    const headers = {};
    response.headers.forEach((value, key) => {
      // Copy important headers but avoid CORS issues
      if (!key.toLowerCase().startsWith('access-control-') && 
          !key.toLowerCase().includes('origin') &&
          key.toLowerCase() !== 'x-frame-options') {
        headers[key] = value;
      }
    });

    // Set our own CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set content type
    res.setHeader('Content-Type', contentType);
    
    // Copy other headers
    Object.entries(headers).forEach(([key, value]) => {
      try {
        res.setHeader(key, value);
      } catch (e) {
        // Skip headers that can't be set
      }
    });

    // Stream the response body directly
    const body = await response.text();
    
    // Modify the HTML to ensure it works in our context
    let modifiedBody = body;
    if (contentType.includes('text/html')) {
      // Add base tag to ensure relative URLs work
      modifiedBody = body.replace(
        '<head>',
        `<head><base href="${new URL(streamUrl).origin}/">`
      );
      
      // Ensure scripts and styles load correctly
      modifiedBody = modifiedBody.replace(
        /src="\/([^"]+)"/g,
        `src="${new URL(streamUrl).origin}/$1"`
      );
      modifiedBody = modifiedBody.replace(
        /href="\/([^"]+)"/g,
        `href="${new URL(streamUrl).origin}/$1"`
      );
    }

    res.status(200).send(modifiedBody);

  } catch (error) {
    console.error('Direct stream error:', error);
    
    // Return a simple HTML page with the stream embedded
    const streamUrl = decodeURIComponent(url);
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Stream Player</title>
    <style>
        body { margin: 0; padding: 0; background: #000; }
        iframe { width: 100vw; height: 100vh; border: none; }
    </style>
</head>
<body>
    <iframe src="${streamUrl}" allowfullscreen allow="autoplay"></iframe>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  }
}