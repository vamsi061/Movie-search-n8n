export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    const streamUrl = decodeURIComponent(url);
    
    // Create a page that mimics exactly how main website handles StreamLare
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>5MovieRulz - Stream Player</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="referrer" content="no-referrer-when-downgrade">
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
            text-align: center;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .stream-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            margin: 20px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        .stream-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .info {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            line-height: 1.6;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎬 5MovieRulz Stream</div>
        
        <div class="info">
            <h2>StreamLare Player</h2>
            <p>Click the button below to access the stream. This page mimics the main website's behavior for better compatibility.</p>
        </div>
        
        <button class="stream-button" onclick="openStream()">
            🎬 Open StreamLare Player
        </button>
        
        <div class="info">
            <p><strong>Alternative methods:</strong></p>
            <p>• Right-click the button above and select "Open in new tab"</p>
            <p>• If issues persist, try accessing from the main movie page</p>
        </div>
    </div>

    <script>
        // Mimic main website behavior
        function openStream() {
            // Set document properties to mimic main site
            try {
                // Create a form and submit it (like main website does)
                const form = document.createElement('form');
                form.method = 'GET';
                form.action = '${streamUrl}';
                form.target = '_blank';
                form.style.display = 'none';
                
                // Add hidden input to mimic main site behavior
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'ref';
                input.value = 'moviesite';
                form.appendChild(input);
                
                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
            } catch (e) {
                // Fallback to direct window.open
                window.open('${streamUrl}', '_blank');
            }
        }
        
        // Disable right-click like main website
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Disable text selection like main website
        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Disable F12, Ctrl+U, etc. like main website
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || 
                (e.ctrlKey && (e.key === 'u' || e.key === 'U' || 
                               e.key === 's' || e.key === 'S' ||
                               e.key === 'i' || e.key === 'I'))) {
                e.preventDefault();
                return false;
            }
        });
        
        // Auto-click after page loads (like main website)
        window.addEventListener('load', function() {
            setTimeout(function() {
                // Auto-open stream after 2 seconds if user hasn't clicked
                const button = document.querySelector('.stream-button');
                if (button && document.hasFocus()) {
                    button.click();
                }
            }, 2000);
        });
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).send(html);

  } catch (error) {
    console.error('Stream bridge error:', error);
    res.status(500).json({ 
      error: 'Failed to create stream bridge',
      message: error.message 
    });
  }
}