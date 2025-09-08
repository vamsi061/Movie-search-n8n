export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).send('URL parameter is required');
    return;
  }

  // Create an HTML page that simulates localhost environment for StreamLare
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
        #streamFrame {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
            display: none;
        }
        .debug {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 20;
            max-width: 300px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Initializing stream...</p>
            <p style="font-size: 12px;">Simulating localhost environment</p>
        </div>
        
        <iframe id="streamFrame" src="about:blank"></iframe>
        
        <div class="debug" id="debug">
            <strong>Debug Info:</strong><br>
            Original URL: <span id="originalUrl">${url}</span><br>
            Current URL: <span id="currentUrl">Loading...</span><br>
            Origin: <span id="origin">localhost:8000</span><br>
            Status: <span id="status">Initializing...</span>
        </div>
    </div>

    <script>
        const originalUrl = '${url}';
        const iframe = document.getElementById('streamFrame');
        const loading = document.getElementById('loading');
        const debug = document.getElementById('debug');
        
        // Override window properties to simulate localhost
        Object.defineProperty(window, 'location', {
            value: {
                ...window.location,
                hostname: 'localhost',
                host: 'localhost:8000',
                origin: 'http://localhost:8000',
                href: 'http://localhost:8000/',
                protocol: 'http:',
                port: '8000'
            },
            writable: false
        });
        
        // Override document.referrer to appear as localhost
        Object.defineProperty(document, 'referrer', {
            value: 'http://localhost:8000/',
            writable: false
        });
        
        // Override navigator properties
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            writable: false
        });
        
        // Function to update debug info
        function updateDebug(status, currentUrl = 'N/A') {
            document.getElementById('status').textContent = status;
            document.getElementById('currentUrl').textContent = currentUrl;
        }
        
        // Function to load StreamLare with localhost simulation
        function loadStreamLare() {
            updateDebug('Loading StreamLare...');
            
            // Set iframe src to the StreamLare URL
            iframe.src = originalUrl;
            
            // Monitor iframe loading
            iframe.onload = function() {
                try {
                    // Try to get the current URL from iframe (may be blocked by CORS)
                    const iframeUrl = iframe.contentWindow.location.href;
                    updateDebug('Loaded successfully', iframeUrl);
                    
                    // Check if URL has been updated with sid and t parameters
                    if (iframeUrl.includes('sid=') && iframeUrl.includes('t=')) {
                        updateDebug('✅ Stream parameters added!', iframeUrl);
                    }
                } catch (e) {
                    // CORS blocked - assume it loaded successfully
                    updateDebug('✅ Loaded (cross-origin)', 'Protected by CORS');
                }
                
                // Hide loading and show iframe
                loading.style.display = 'none';
                iframe.style.display = 'block';
                
                // Hide debug after 5 seconds
                setTimeout(() => {
                    debug.style.display = 'none';
                }, 5000);
            };
            
            iframe.onerror = function() {
                updateDebug('❌ Failed to load');
                loading.innerHTML = '<h3>Failed to load stream</h3><p>Try opening directly: <a href="' + originalUrl + '" target="_blank" style="color: #4CAF50;">' + originalUrl + '</a></p>';
            };
            
            // Timeout fallback
            setTimeout(() => {
                if (loading.style.display !== 'none') {
                    updateDebug('⚠️ Loading timeout');
                    loading.innerHTML = '<h3>Loading timeout</h3><p>Stream may still be loading...</p>';
                    iframe.style.display = 'block';
                }
            }, 10000);
        }
        
        // Start loading after a brief delay to ensure all overrides are in place
        setTimeout(loadStreamLare, 1000);
        
        // Log simulated environment
        console.log('🎭 Localhost simulation active');
        console.log('📍 Simulated origin:', window.location.origin);
        console.log('📄 Simulated referrer:', document.referrer);
        console.log('🌐 User agent:', navigator.userAgent);
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.status(200).send(html);
}