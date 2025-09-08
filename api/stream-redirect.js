export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    // Decode the URL
    const streamUrl = decodeURIComponent(url);
    
    // Set proper headers to mimic request from main domain
    res.setHeader('Referer', 'https://www.5movierulz.villas/');
    res.setHeader('Location', streamUrl);
    res.status(302).end();

  } catch (error) {
    console.error('Stream redirect error:', error);
    
    // Fallback: Create iframe that loads from main domain context
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Stream Player</title>
    <style>
        body { margin: 0; padding: 0; background: #000; }
        iframe { width: 100vw; height: 100vh; border: none; }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>Loading stream...</p>
    </div>
    <iframe src="${streamUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>
    
    <script>
        // Hide loading when iframe loads
        document.querySelector('iframe').onload = function() {
            document.querySelector('.loading').style.display = 'none';
        };
        
        // Fallback: redirect if iframe fails
        setTimeout(function() {
            if (document.querySelector('.loading').style.display !== 'none') {
                window.location.href = '${streamUrl}';
            }
        }, 5000);
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  }
}