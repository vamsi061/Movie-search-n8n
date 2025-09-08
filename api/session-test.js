export default async function handler(req, res) {
  const { test_url } = req.query;

  if (!test_url) {
    res.status(400).json({ error: 'test_url parameter required' });
    return;
  }

  // Create a test page that tries to open StreamLare URL with different methods
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>StreamLare URL Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
        .test-section { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; }
        button { padding: 10px 20px; margin: 5px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .result { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #2196F3; }
    </style>
</head>
<body>
    <h1>🧪 StreamLare URL Test</h1>
    <p><strong>Testing URL:</strong> <code>${test_url}</code></p>
    
    <div class="test-section">
        <h3>Test 1: Direct Window Open</h3>
        <button onclick="test1()">Open in New Tab</button>
        <div id="result1" class="result"></div>
    </div>
    
    <div class="test-section">
        <h3>Test 2: Iframe Embed</h3>
        <button onclick="test2()">Load in Iframe</button>
        <div id="result2" class="result"></div>
        <iframe id="testFrame" style="width:100%; height:300px; border:1px solid #ccc; display:none;"></iframe>
    </div>
    
    <div class="test-section">
        <h3>Test 3: Fetch Request</h3>
        <button onclick="test3()">Test with Fetch</button>
        <div id="result3" class="result"></div>
    </div>
    
    <div class="test-section">
        <h3>Test 4: Same-Origin Simulation</h3>
        <button onclick="test4()">Simulate 5movierulz Origin</button>
        <div id="result4" class="result"></div>
    </div>

    <script>
        const testUrl = '${test_url}';
        
        function test1() {
            document.getElementById('result1').innerHTML = 'Opening in new tab...';
            const newWindow = window.open(testUrl, '_blank');
            
            setTimeout(() => {
                try {
                    if (newWindow.closed) {
                        document.getElementById('result1').innerHTML = '❌ Window was closed (possibly blocked)';
                    } else {
                        document.getElementById('result1').innerHTML = '✅ Window opened successfully';
                    }
                } catch (e) {
                    document.getElementById('result1').innerHTML = '⚠️ Cannot determine window status: ' + e.message;
                }
            }, 2000);
        }
        
        function test2() {
            document.getElementById('result2').innerHTML = 'Loading in iframe...';
            const iframe = document.getElementById('testFrame');
            iframe.style.display = 'block';
            iframe.src = testUrl;
            
            iframe.onload = () => {
                document.getElementById('result2').innerHTML = '✅ Iframe loaded successfully';
            };
            
            iframe.onerror = () => {
                document.getElementById('result2').innerHTML = '❌ Iframe failed to load';
            };
            
            setTimeout(() => {
                if (document.getElementById('result2').innerHTML === 'Loading in iframe...') {
                    document.getElementById('result2').innerHTML = '⚠️ Iframe load timeout (possibly blocked)';
                }
            }, 5000);
        }
        
        async function test3() {
            document.getElementById('result3').innerHTML = 'Testing with fetch...';
            
            try {
                const response = await fetch(testUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                document.getElementById('result3').innerHTML = '✅ Fetch request completed (status: ' + response.status + ')';
            } catch (error) {
                document.getElementById('result3').innerHTML = '❌ Fetch failed: ' + error.message;
            }
        }
        
        function test4() {
            document.getElementById('result4').innerHTML = 'Simulating 5movierulz origin...';
            
            // Try to set referer and origin headers
            const link = document.createElement('a');
            link.href = testUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Add to DOM temporarily
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            document.getElementById('result4').innerHTML = '✅ Attempted to open with simulated origin';
        }
        
        // Override document.referrer for testing
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.5movierulz.villas/',
            writable: false
        });
        
        console.log('🔍 Test environment ready');
        console.log('📍 Current origin:', window.location.origin);
        console.log('📄 Document referrer:', document.referrer);
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}