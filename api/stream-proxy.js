export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).send('URL parameter is required');
    return;
  }

  // Create a page that opens StreamLare URL with proper 5movierulz.villas context
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stream Player</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #fff;
            font-family: Arial, sans-serif;
            overflow: hidden;
        }
        .container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .loading {
            text-align: center;
            z-index: 10;
        }
        .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid #fff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Loading stream...</p>
            <p style="font-size: 12px;">Establishing secure connection...</p>
        </div>
        
        <iframe id="streamFrame" src="about:blank"></iframe>
    </div>

    <script>
        const streamUrl = '${url}';
        const iframe = document.getElementById('streamFrame');
        const loading = document.getElementById('loading');
        
        // Override properties to appear as 5movierulz.villas
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.5movierulz.villas/',
            writable: false
        });
        
        Object.defineProperty(window, 'location', {
            value: {
                ...window.location,
                hostname: 'www.5movierulz.villas',
                host: 'www.5movierulz.villas',
                origin: 'https://www.5movierulz.villas',
                href: 'https://www.5movierulz.villas/',
                protocol: 'https:',
                port: ''
            },
            writable: false
        });
        
        // Function to load stream with 5movierulz context
        function loadStream() {
            console.log('Loading stream with 5movierulz context:', streamUrl);
            
            // Create a form that submits to StreamLare with proper referer
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = streamUrl;
            form.target = 'streamFrame';
            form.style.display = 'none';
            
            // Add hidden input to simulate coming from movie page
            const refererInput = document.createElement('input');
            refererInput.type = 'hidden';
            refererInput.name = 'ref';
            refererInput.value = 'https://www.5movierulz.villas/';
            form.appendChild(refererInput);
            
            document.body.appendChild(form);
            
            // Submit form to iframe
            form.submit();
            
            // Monitor iframe loading
            iframe.onload = function() {
                loading.style.display = 'none';
                iframe.style.display = 'block';
                
                // Try to detect if parameters were added
                setTimeout(() => {
                    try {
                        const iframeUrl = iframe.contentWindow.location.href;
                        if (iframeUrl.includes('sid=') || iframeUrl.includes('t=')) {
                            console.log('✅ Stream parameters detected!');
                        }
                    } catch (e) {
                        // CORS blocked - assume success
                        console.log('Stream loaded (CORS protected)');
                    }
                }, 2000);
            };
            
            iframe.onerror = function() {
                loading.innerHTML = '<h3>Stream Error</h3><p>Unable to load stream. <a href="' + streamUrl + '" target="_blank" style="color: #4CAF50;">Try direct link</a></p>';
            };
            
            // Cleanup form
            setTimeout(() => {
                document.body.removeChild(form);
            }, 1000);
        }
        
        // Start loading after brief delay
        setTimeout(loadStream, 1000);
        
        // Prevent context menu and selection
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
        
        console.log('🎬 Stream proxy initialized');
        console.log('📍 Simulated origin:', window.location.origin);
        console.log('📄 Simulated referrer:', document.referrer);
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.status(200).send(html);
}