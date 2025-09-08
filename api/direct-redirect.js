export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).send('URL parameter is required');
    return;
  }

  // Instead of iframe simulation, do a direct redirect like the working code
  // This mimics exactly what happens when you click in your working localhost
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to Stream...</title>
    <meta http-equiv="refresh" content="0;url=${url}">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }
        .container {
            text-align: center;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h3>Redirecting to Stream...</h3>
        <p>If redirect doesn't work, <a href="${url}" style="color: #4CAF50;">click here</a></p>
    </div>

    <script>
        // Immediate redirect - exactly like working code does
        setTimeout(() => {
            window.location.href = '${url}';
        }, 100);
        
        // Fallback redirect
        setTimeout(() => {
            if (document.visibilityState === 'visible') {
                window.location.replace('${url}');
            }
        }, 1000);
    </script>
</body>
</html>`;

  // Set headers to appear more like localhost
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'DENY');
  
  res.status(200).send(html);
}