export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) {
    res.status(400).send('URL parameter is required');
    return;
  }

  // Create an HTML page that will redirect to the streaming URL with proper context
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading Stream...</title>
    <meta http-equiv="refresh" content="3;url=${url}">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 50px;
            margin: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .loading {
            font-size: 24px;
            margin-bottom: 20px;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .manual-link {
            margin-top: 30px;
            padding: 15px 30px;
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            border-radius: 10px;
            color: white;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
        }
        .manual-link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .info {
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading">🎬 Preparing Your Stream...</div>
        <div class="spinner"></div>
        <p>You will be redirected to the streaming page in 3 seconds.</p>
        <p>If the redirect doesn't work, click the button below:</p>
        <a href="${url}" class="manual-link" target="_self">▶️ Open Stream Now</a>
        <div class="info">
            <p>💡 If you see a blank screen, try:</p>
            <p>• Disable ad blockers for this site</p>
            <p>• Allow popups in your browser</p>
            <p>• Try a different browser (Chrome/Firefox)</p>
        </div>
    </div>

    <script>
        // Set proper referer if provided
        if ('${referer}') {
            document.referrer = '${referer}';
        }
        
        // Additional redirect methods
        setTimeout(function() {
            try {
                // Try multiple redirect methods
                window.location.replace('${url}');
            } catch(e) {
                window.location.href = '${url}';
            }
        }, 3000);

        // Handle manual click
        document.querySelector('.manual-link').addEventListener('click', function(e) {
            e.preventDefault();
            
            // Try to open with proper context
            const newWindow = window.open('${url}', '_self');
            if (!newWindow) {
                // Fallback if popup blocked
                window.location.href = '${url}';
            }
        });

        // Prevent back button issues
        history.pushState(null, null, location.href);
        window.onpopstate = function () {
            history.go(1);
        };
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.status(200).send(html);
}