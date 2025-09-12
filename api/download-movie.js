export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { movieUrl, title } = req.body;

        if (!movieUrl) {
            return res.status(400).json({ error: 'Movie URL is required' });
        }

        console.log('Download request received:', { movieUrl, title });

        // Check if the URL is from ibomma (as per your requirement)
        const isIbomma = movieUrl.toLowerCase().includes('ibomma') || 
                        movieUrl.toLowerCase().includes('5movierulz') ||
                        movieUrl.toLowerCase().includes('movierulz');

        if (!isIbomma) {
            return res.status(400).json({ 
                error: 'Download is only supported for iBomma and MovieRulz sources',
                message: 'This movie source is not supported for direct download'
            });
        }

        // Set response headers for streaming
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial response
        res.write(JSON.stringify({ 
            status: 'started', 
            message: 'Connecting to N8N download service...',
            movieUrl: movieUrl,
            title: title || 'Unknown Movie'
        }) + '\n');

        // N8N webhook URL for movie download
        const n8nDownloadUrl = 'https://n8n-instance-vnyx.onrender.com/webhook/movie-downloader';
        
        res.write(JSON.stringify({ 
            status: 'info', 
            message: 'Sending download request to N8N service...',
            timestamp: new Date().toISOString()
        }) + '\n');

        // Prepare request payload
        const requestPayload = {
            movieUrl: movieUrl,
            title: title || 'Unknown Movie',
            action: 'download',
            outputFormat: 'mp4'
        };

        console.log('Sending to N8N:', JSON.stringify(requestPayload, null, 2));

        // Send download request to N8N
        const downloadResponse = await fetch(n8nDownloadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(requestPayload)
        });

        if (!downloadResponse.ok) {
            throw new Error(`N8N service responded with status: ${downloadResponse.status}`);
        }

        res.write(JSON.stringify({ 
            status: 'info', 
            message: 'N8N download service connected successfully',
            timestamp: new Date().toISOString()
        }) + '\n');

        // Handle streaming response from N8N
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
                message: 'Download process completed',
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
        console.error('Download API error:', error);
        
        if (!res.headersSent) {
            return res.status(500).json({ 
                error: 'Internal server error',
                message: error.message 
            });
        }
    }
}