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

        // Import required modules
        const { spawn } = require('child_process');
        const path = require('path');

        // Path to your Python script
        const pythonScriptPath = '/Users/vamsi/Desktop/Movie_Agent/github_dir/video_extraction/simple_video_extractor.py';
        
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
            message: 'Download initiated...',
            movieUrl: movieUrl,
            title: title || 'Unknown Movie'
        }) + '\n');

        // Execute Python script
        const pythonProcess = spawn('python3', [
            pythonScriptPath,
            movieUrl,
            '--download',
            '--output', `${title || 'movie'}.mp4`
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Handle stdout (progress updates)
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Python stdout:', output);
            
            // Send progress updates to client
            res.write(JSON.stringify({
                status: 'progress',
                message: output.trim(),
                timestamp: new Date().toISOString()
            }) + '\n');
        });

        // Handle stderr (errors and additional info)
        pythonProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.log('Python stderr:', error);
            
            // Send error updates to client
            res.write(JSON.stringify({
                status: 'info',
                message: error.trim(),
                timestamp: new Date().toISOString()
            }) + '\n');
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            
            if (code === 0) {
                res.write(JSON.stringify({
                    status: 'completed',
                    message: 'Download completed successfully!',
                    exitCode: code,
                    timestamp: new Date().toISOString()
                }) + '\n');
            } else {
                res.write(JSON.stringify({
                    status: 'error',
                    message: `Download failed with exit code ${code}`,
                    exitCode: code,
                    timestamp: new Date().toISOString()
                }) + '\n');
            }
            
            res.end();
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
            console.error('Python process error:', error);
            res.write(JSON.stringify({
                status: 'error',
                message: `Process error: ${error.message}`,
                timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
        });

        // Handle client disconnect
        req.on('close', () => {
            console.log('Client disconnected, killing Python process');
            pythonProcess.kill('SIGTERM');
        });

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