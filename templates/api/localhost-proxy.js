export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).send('URL parameter is required');
    return;
  }

  // Create an HTML page that mimics localhost behavior
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movie Stream</title>
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
        }
        .fallback {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 5;
            display: none;
        }
        .fallback a {
            color: #4CAF50;
            text-decoration: none;
            padding: 10px 20px;
            border: 2px solid #4CAF50;
            border-radius: 5px;
            display: inline-block;
            margin-top: 20px;
        }
        .fallback a:hover {
            background: #4CAF50;
            color: #000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Loading stream...</p>
        </div>
        
        <iframe id="streamFrame" src="${url}" style="display: none;"></iframe>
        
        <div class="fallback" id="fallback">
            <h3>Stream Loading Issue</h3>
            <p>If the stream doesn't load, try opening directly:</p>
            <a href="${url}" target="_blank">Open Stream in New Tab</a>
        </div>
    </div>

    <script>
        // Simulate localhost environment
        const iframe = document.getElementById('streamFrame');
        const loading = document.getElementById('loading');
        const fallback = document.getElementById('fallback');
        
        // Override referrer to appear as localhost
        Object.defineProperty(document, 'referrer', {
            value: 'http://localhost:8000/',
            writable: false
        });
        
        // Set localhost-like headers
        iframe.onload = function() {
            loading.style.display = 'none';
            iframe.style.display = 'block';
            
            // If iframe is empty or blocked, show fallback
            setTimeout(() => {
                try {
                    if (!iframe.contentDocument || iframe.contentDocument.body.innerHTML.trim() === '') {
                        iframe.style.display = 'none';
                        fallback.style.display = 'block';
                    }
                } catch (e) {
                    // Cross-origin iframe - assume it loaded successfully
                    console.log('Stream loaded (cross-origin)');
                }
            }, 3000);
        };
        
        iframe.onerror = function() {
            loading.style.display = 'none';
            fallback.style.display = 'block';
        };
        
        // Fallback timeout
        setTimeout(() => {
            if (loading.style.display !== 'none') {
                loading.style.display = 'none';
                fallback.style.display = 'block';
            }
        }, 10000);
        
        // Prevent context menu and other interactions that might reveal we're not localhost
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
        
        // Override location to appear as localhost
        Object.defineProperty(window, 'location', {
            value: {
                ...window.location,
                hostname: 'localhost',
                host: 'localhost:8000',
                origin: 'http://localhost:8000',
                href: 'http://localhost:8000/'
            },
            writable: false
        });
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  
  res.status(200).send(html);
}