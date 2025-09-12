export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { movieUrl, title, outputFileName } = req.body;

        if (!movieUrl) {
            return res.status(400).json({ error: 'Movie URL is required' });
        }

        console.log('Video extraction request:', { movieUrl, title, outputFileName });

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
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial response
        res.write(JSON.stringify({ 
            status: 'started', 
            message: 'Starting video extraction...',
            movieUrl: movieUrl,
            title: title || 'Unknown Movie'
        }) + '\n');

        // Extract video sources using JavaScript
        const extractor = new VideoExtractor();
        const sources = await extractor.extractVideoSources(movieUrl, res);

        if (!sources || sources.length === 0) {
            res.write(JSON.stringify({
                status: 'error',
                message: 'No video sources found for this movie',
                timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
            return;
        }

        // Get the best quality source
        const bestSource = sources[0];

        res.write(JSON.stringify({
            status: 'info',
            message: `Found ${sources.length} video sources. Using best quality: ${bestSource.quality}p`,
            timestamp: new Date().toISOString()
        }) + '\n');

        // Provide download information
        res.write(JSON.stringify({
            status: 'completed',
            message: `Video source extracted successfully! Quality: ${bestSource.quality}p, Format: ${bestSource.format}`,
            downloadUrl: bestSource.url,
            quality: bestSource.quality,
            format: bestSource.format,
            method: bestSource.method,
            timestamp: new Date().toISOString()
        }) + '\n');

        res.end();

    } catch (error) {
        console.error('Extraction error:', error);
        
        if (!res.headersSent) {
            return res.status(500).json({ 
                error: 'Internal server error',
                message: error.message 
            });
        } else {
            res.write(JSON.stringify({
                status: 'error',
                message: `Extraction failed: ${error.message}`,
                timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
        }
    }
}

class VideoExtractor {
    constructor() {
        this.originalUrl = null;
    }

    async extractVideoSources(url, res) {
        console.log(`🔍 Analyzing URL: ${url}`);
        this.originalUrl = url;
        
        let videoSources = [];
        
        try {
            // Method 1: Enhanced page analysis with session handling
            res.write(JSON.stringify({
                status: 'info',
                message: '🔎 Analyzing page with session handling...',
                timestamp: new Date().toISOString()
            }) + '\n');
            
            const enhancedSources = await this.extractWithSessionHandling(url, res);
            if (enhancedSources && enhancedSources.length > 0) {
                videoSources.push(...enhancedSources);
                res.write(JSON.stringify({
                    status: 'info',
                    message: `✅ Enhanced analysis found ${enhancedSources.length} sources`,
                    timestamp: new Date().toISOString()
                }) + '\n');
            }
            
            // Method 2: Direct page analysis (fallback)
            res.write(JSON.stringify({
                status: 'info',
                message: '🔎 Analyzing page source...',
                timestamp: new Date().toISOString()
            }) + '\n');
            
            const directSources = await this.extractFromPageSource(url, res);
            if (directSources && directSources.length > 0) {
                videoSources.push(...directSources);
                res.write(JSON.stringify({
                    status: 'info',
                    message: `✅ Page analysis found ${directSources.length} sources`,
                    timestamp: new Date().toISOString()
                }) + '\n');
            }
            
            // Remove duplicates and sort by quality
            const uniqueSources = this.processSources(videoSources);
            
            return uniqueSources;
            
        } catch (error) {
            console.error('Extraction error:', error);
            res.write(JSON.stringify({
                status: 'error',
                message: `Extraction failed: ${error.message}`,
                timestamp: new Date().toISOString()
            }) + '\n');
            return [];
        }
    }

    async extractWithSessionHandling(url, res) {
        try {
            res.write(JSON.stringify({
                status: 'info',
                message: '   🍪 Establishing session...',
                timestamp: new Date().toISOString()
            }) + '\n');
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const content = await response.text();
            let sources = [];
            
            // Extract iframe sources (common in streaming sites)
            const iframePattern = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
            let iframeMatch;
            
            while ((iframeMatch = iframePattern.exec(content)) !== null) {
                const iframeUrl = iframeMatch[1];
                if (this.containsVideoKeywords(iframeUrl)) {
                    res.write(JSON.stringify({
                        status: 'info',
                        message: `   🎬 Found iframe: ${iframeUrl.substring(0, 50)}...`,
                        timestamp: new Date().toISOString()
                    }) + '\n');
                    
                    const iframeSources = await this.extractFromIframe(iframeUrl, res);
                    sources.push(...iframeSources);
                }
            }
            
            // Look for JavaScript-generated video URLs
            const jsSources = this.extractJavaScriptUrls(content);
            sources.push(...jsSources);
            
            // Enhanced pattern matching for streaming sites
            const streamingSources = this.extractStreamingPatterns(content);
            sources.push(...streamingSources);
            
            return sources;
            
        } catch (error) {
            res.write(JSON.stringify({
                status: 'info',
                message: `   ⚠️ Session handling failed: ${error.message.substring(0, 100)}...`,
                timestamp: new Date().toISOString()
            }) + '\n');
            return [];
        }
    }

    async extractFromIframe(iframeUrl, res) {
        try {
            // Make iframe URL absolute
            if (iframeUrl.startsWith('//')) {
                iframeUrl = 'https:' + iframeUrl;
            } else if (iframeUrl.startsWith('/')) {
                const baseUrl = new URL(this.originalUrl);
                iframeUrl = baseUrl.origin + iframeUrl;
            }
            
            res.write(JSON.stringify({
                status: 'info',
                message: `   📺 Analyzing iframe: ${iframeUrl}`,
                timestamp: new Date().toISOString()
            }) + '\n');
            
            const response = await fetch(iframeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': this.originalUrl,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const content = await response.text();
            let sources = [];
            
            // Look for video sources in iframe
            const videoPatterns = [
                /"file":\s*"([^"]+\.(?:mp4|m3u8|mpd))"/gi,
                /"src":\s*"([^"]+\.(?:mp4|m3u8|mpd))"/gi,
                /"url":\s*"([^"]+\.(?:mp4|m3u8|mpd))"/gi,
                /source:\s*["']([^"']+\.(?:mp4|m3u8|mpd))["']/gi,
                /file:\s*["']([^"']+\.(?:mp4|m3u8|mpd))["']/gi,
            ];
            
            for (const pattern of videoPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    let cleanUrl = match[1].replace(/\\\//g, '/');
                    if (this.isValidVideoUrl(cleanUrl)) {
                        // Make URL absolute
                        if (cleanUrl.startsWith('//')) {
                            cleanUrl = 'https:' + cleanUrl;
                        } else if (cleanUrl.startsWith('/')) {
                            const baseUrl = new URL(iframeUrl);
                            cleanUrl = baseUrl.origin + cleanUrl;
                        }
                        
                        sources.push(this.createSourceDict(cleanUrl, 'iframe_extraction'));
                    }
                }
            }
            
            return sources;
            
        } catch (error) {
            res.write(JSON.stringify({
                status: 'info',
                message: `   ⚠️ Iframe extraction failed: ${error.message.substring(0, 50)}...`,
                timestamp: new Date().toISOString()
            }) + '\n');
            return [];
        }
    }

    extractJavaScriptUrls(content) {
        const sources = [];
        
        // Look for JavaScript variables containing video URLs
        const jsPatterns = [
            /var\s+\w+\s*=\s*["']([^"']+\.(?:mp4|m3u8|mpd))["']/gi,
            /let\s+\w+\s*=\s*["']([^"']+\.(?:mp4|m3u8|mpd))["']/gi,
            /const\s+\w+\s*=\s*["']([^"']+\.(?:mp4|m3u8|mpd))["']/gi,
            /videoUrl\s*[:=]\s*["']([^"']+)["']/gi,
            /streamUrl\s*[:=]\s*["']([^"']+)["']/gi,
            /playUrl\s*[:=]\s*["']([^"']+)["']/gi,
        ];
        
        for (const pattern of jsPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const cleanUrl = match[1].replace(/\\\//g, '/');
                if (this.isValidVideoUrl(cleanUrl)) {
                    sources.push(this.createSourceDict(cleanUrl, 'javascript_extraction'));
                }
            }
        }
        
        return sources;
    }

    extractStreamingPatterns(content) {
        const sources = [];
        
        // Enhanced patterns for streaming sites
        const streamingPatterns = [
            // Direct video files with query parameters
            /(https?:\/\/[^"\s]+\.(?:mp4|avi|mkv|mov|wmv|flv|webm|m4v)(?:\?[^"\s]*)?)/gi,
            // HLS/DASH manifests
            /([^"\s]+\.m3u8(?:\?[^"\s]*)?)/gi,
            /([^"\s]+\.mpd(?:\?[^"\s]*)?)/gi,
            // Player configurations
            /player\.setup\({[^}]*file:\s*["']([^"']+)["']/gi,
        ];
        
        for (const pattern of streamingPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const cleanUrl = match[1].replace(/\\\//g, '/');
                if (this.isValidVideoUrl(cleanUrl)) {
                    sources.push(this.createSourceDict(cleanUrl, 'streaming_pattern'));
                }
            }
        }
        
        return sources;
    }

    async extractFromPageSource(url, res) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const content = await response.text();
            let sources = [];
            
            // Pattern 1: Direct video file URLs
            const videoPatterns = [
                /https?:\/\/[^"\s<>]+\.(?:mp4|avi|mkv|mov|wmv|flv|webm|m4v)(?:\?[^"\s<>]*)?/gi,
                /https?:\/\/[^"\s<>]+\/videoplayback\?[^"\s<>]*/gi,
                /https?:\/\/[^"\s<>]+\.m3u8(?:\?[^"\s<>]*)?/gi,
                /https?:\/\/[^"\s<>]+\.mpd(?:\?[^"\s<>]*)?/gi,
            ];
            
            for (const pattern of videoPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const cleanUrl = this.cleanUrl(match[0]);
                    if (this.isValidVideoUrl(cleanUrl)) {
                        sources.push(this.createSourceDict(cleanUrl, 'direct_pattern'));
                    }
                }
            }
            
            return sources;
            
        } catch (error) {
            res.write(JSON.stringify({
                status: 'info',
                message: `⚠️ Page source extraction failed: ${error.message.substring(0, 100)}...`,
                timestamp: new Date().toISOString()
            }) + '\n');
            return [];
        }
    }

    containsVideoKeywords(url) {
        const keywords = ['player', 'embed', 'video', 'stream'];
        return keywords.some(keyword => url.toLowerCase().includes(keyword));
    }

    createSourceDict(url, method) {
        return {
            url: url,
            quality: this.guessQualityFromUrl(url),
            format: this.getFormatFromUrl(url),
            method: method,
            title: 'Extracted Video'
        };
    }

    cleanUrl(url) {
        return url.trim().replace(/^["']|["']$/g, '').replace(/\\\//g, '/');
    }

    isValidVideoUrl(url) {
        if (!url || typeof url !== 'string' || url.length < 10) {
            return false;
        }
        
        const urlLower = url.toLowerCase();
        
        // Check for video file extensions
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.m3u8', '.mpd'];
        for (const ext of videoExtensions) {
            if (urlLower.includes(ext)) {
                return true;
            }
        }
        
        // Check for streaming patterns
        const streamingPatterns = ['videoplayback', 'manifest', 'playlist', 'stream', '/video/', 'player'];
        for (const pattern of streamingPatterns) {
            if (urlLower.includes(pattern)) {
                return true;
            }
        }
        
        return false;
    }

    guessQualityFromUrl(url) {
        const urlLower = url.toLowerCase();
        
        const qualityPatterns = {
            2160: ['4k', '2160p', '3840x2160'],
            1440: ['1440p', '2560x1440'],
            1080: ['1080p', '1920x1080', 'hd'],
            720: ['720p', '1280x720'],
            480: ['480p', '854x480'],
            360: ['360p', '640x360'],
            240: ['240p', '426x240'],
        };
        
        for (const [quality, patterns] of Object.entries(qualityPatterns)) {
            for (const pattern of patterns) {
                if (urlLower.includes(pattern)) {
                    return parseInt(quality);
                }
            }
        }
        
        return 0;
    }

    getFormatFromUrl(url) {
        const urlLower = url.toLowerCase();
        
        const formatMap = {
            '.mp4': 'mp4',
            '.avi': 'avi',
            '.mkv': 'mkv',
            '.mov': 'mov',
            '.wmv': 'wmv',
            '.flv': 'flv',
            '.webm': 'webm',
            '.m4v': 'm4v',
            '.m3u8': 'hls',
            '.mpd': 'dash',
        };
        
        for (const [ext, fmt] of Object.entries(formatMap)) {
            if (urlLower.includes(ext)) {
                return fmt;
            }
        }
        
        return 'unknown';
    }

    processSources(sources) {
        // Remove duplicates based on URL
        const seenUrls = new Set();
        const uniqueSources = [];
        
        for (const source of sources) {
            const url = source.url;
            if (!seenUrls.has(url)) {
                seenUrls.add(url);
                // Ensure quality is an integer
                if (source.quality === null || typeof source.quality !== 'number') {
                    source.quality = 0;
                }
                uniqueSources.push(source);
            }
        }
        
        // Sort by quality (highest first)
        uniqueSources.sort((a, b) => b.quality - a.quality);
        
        return uniqueSources;
    }
}