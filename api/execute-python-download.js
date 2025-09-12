import { spawn } from 'child_process';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { movieUrl, title, outputFileName } = req.body;

        if (!movieUrl) {
            return res.status(400).json({ error: 'Movie URL is required' });
        }

        console.log('Python download request:', { movieUrl, title, outputFileName });

        // Check if the URL is from supported sources
        const isSupported = movieUrl.toLowerCase().includes('ibomma') || 
                           movieUrl.toLowerCase().includes('5movierulz') ||
                           movieUrl.toLowerCase().includes('movierulz');

        if (!isSupported) {
            return res.status(400).json({ 
                error: 'Download is only supported for iBomma and MovieRulz sources',
                message: 'This movie source is not supported for direct download'
            });
        }

        // Set response headers for streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial response
        res.write(JSON.stringify({ 
            status: 'started', 
            message: 'Downloading Python script and starting extraction...',
            movieUrl: movieUrl,
            title: title || 'Unknown Movie'
        }) + '\n');

        // Download the Python script from GitHub
        const scriptUrl = 'https://raw.githubusercontent.com/vamsi061/Movie-search-n8n/main/scripts/simple_video_extractor.py';
        
        res.write(JSON.stringify({ 
            status: 'info', 
            message: 'Downloading Python script from GitHub...',
            timestamp: new Date().toISOString()
        }) + '\n');

        const scriptResponse = await fetch(scriptUrl);
        if (!scriptResponse.ok) {
            throw new Error(`Failed to download script: ${scriptResponse.status}`);
        }

        const scriptContent = await scriptResponse.text();
        
        // Save script to temporary file
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        const tempDir = os.tmpdir();
        const scriptPath = path.join(tempDir, 'simple_video_extractor.py');
        
        fs.writeFileSync(scriptPath, scriptContent);

        res.write(JSON.stringify({ 
            status: 'info', 
            message: 'Script downloaded successfully, starting movie extraction...',
            timestamp: new Date().toISOString()
        }) + '\n');

        // Execute the Python script
        const pythonProcess = spawn('python3', [
            scriptPath,
            movieUrl,
            '--download',
            '--output', outputFileName || `${title || 'movie'}.mp4`
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
            
            // Clean up temporary file
            try {
                fs.unlinkSync(scriptPath);
            } catch (e) {
                console.log('Could not delete temp file:', e.message);
            }
            
            res.end();
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
            console.error('Python process error:', error);
            
            let errorMessage = `Process error: ${error.message}`;
            
            // Provide helpful error messages
            if (error.code === 'ENOENT') {
                errorMessage = 'Python3 not found! Please ensure Python3 is installed and available in PATH.';
            }
            
            res.write(JSON.stringify({
                status: 'error',
                message: errorMessage,
                timestamp: new Date().toISOString()
            }) + '\n');
            
            // Clean up temporary file
            try {
                fs.unlinkSync(scriptPath);
            } catch (e) {
                console.log('Could not delete temp file:', e.message);
            }
            
            res.end();
        });

        // Handle client disconnect
        req.on('close', () => {
            console.log('Client disconnected, killing Python process');
            pythonProcess.kill('SIGTERM');
            
            // Clean up temporary file
            try {
                fs.unlinkSync(scriptPath);
            } catch (e) {
                console.log('Could not delete temp file:', e.message);
            }
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