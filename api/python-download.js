export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { movieUrl, title } = req.body;

        if (!movieUrl) {
            return res.status(400).json({ error: 'Movie URL is required' });
        }

        console.log('Python download request received:', { movieUrl, title });

        // Set response headers for streaming
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial response
        res.write(JSON.stringify({ 
            status: 'started', 
            message: 'Initializing Python video extractor...',
            movieUrl: movieUrl,
            title: title || 'Unknown Movie'
        }) + '\n');

        // Render Python service URL - Live service
        const renderPythonUrl = process.env.RENDER_PYTHON_SERVICE_URL || 'https://movie-downloader-wior.onrender.com/download';
        
        res.write(JSON.stringify({ 
            status: 'info', 
            message: 'Connecting to Python extraction service...',
            timestamp: new Date().toISOString()
        }) + '\n');

        // Prepare request payload for Python service
        const requestPayload = {
            url: movieUrl,
            title: title || 'Unknown Movie',
            download: true,
            output_path: './downloads/'
        };

        console.log('Sending to Python service:', JSON.stringify(requestPayload, null, 2));

        // Send download request to Python service with longer timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        
        const downloadResponse = await fetch(renderPythonUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/plain',
                'Connection': 'keep-alive',
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!downloadResponse.ok) {
            const errorText = await downloadResponse.text();
            if (downloadResponse.status === 502) {
                throw new Error(`Render service is sleeping or crashed (502). Please check Render dashboard and restart the service.`);
            }
            throw new Error(`Python service responded with status: ${downloadResponse.status} - ${errorText}`);
        }

        res.write(JSON.stringify({ 
            status: 'info', 
            message: 'Python extraction service connected successfully',
            timestamp: new Date().toISOString()
        }) + '\n');

        // Handle streaming response from Python service
        const reader = downloadResponse.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        // Try to parse as JSON (structured response)
                        const data = JSON.parse(line);
                        res.write(JSON.stringify({
                            status: data.status || 'progress',
                            message: data.message || line,
                            timestamp: new Date().toISOString(),
                            ...data
                        }) + '\n');
                    } catch (parseError) {
                        // Handle plain text responses
                        res.write(JSON.stringify({
                            status: 'progress',
                            message: line.trim(),
                            timestamp: new Date().toISOString()
                        }) + '\n');
                    }
                }
            }
            
            // Send completion message
            res.write(JSON.stringify({
                status: 'completed',
                message: 'Download process completed successfully',
                timestamp: new Date().toISOString()
            }) + '\n');
            
        } catch (streamError) {
            console.error('Stream reading error:', streamError);
            res.write(JSON.stringify({
                status: 'error',
                message: `Stream error: ${streamError.message}`,
                timestamp: new Date().toISOString()
            }) + '\n');
        }

        // Handle client disconnect
        req.on('close', () => {
            console.log('Client disconnected, stopping download stream');
            if (reader) {
                reader.cancel();
            }
        });

        res.end();

    } catch (error) {
        console.error('Python download API error:', error);
        
        // Send error to client if streaming
        if (res.headersSent) {
            res.write(JSON.stringify({
                status: 'error',
                message: `Connection failed: ${error.message}`,
                timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
        } else {
            return res.status(500).json({ 
                error: 'Internal server error',
                message: error.message 
            });
        }
    }
}