export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    // Decode the URL
    const streamUrl = decodeURIComponent(url);
    
    // Create an HTML page that will redirect with proper referer
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to Stream...</title>
    <meta name="referrer" content="origin">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 20px;
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
        a {
            color: white;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>Redirecting to Stream...</h2>
        <p>If not redirected automatically, <a href="${streamUrl}" target="_blank">click here</a></p>
    </div>
    
    <script>
        // Set the referer to the main website domain
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.5movierulz.villas/',
            writable: false
        });
        
        // Redirect after a short delay
        setTimeout(function() {
            window.location.replace('${streamUrl}');
        }, 1500);
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Referrer-Policy', 'origin');
    res.status(200).send(html);

  } catch (error) {
    console.error('Stream redirect error:', error);
    res.status(500).json({ 
      error: 'Failed to redirect to stream',
      message: error.message 
    });
  }
}