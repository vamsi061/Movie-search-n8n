import json
import requests
import re
import urllib.parse
from urllib.parse import urljoin, urlparse
import sys
from typing import List, Dict, Optional
import os
from http.server import BaseHTTPRequestHandler

class SimpleVideoExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        })
        self.original_url = None
    
    def extract_video_sources(self, url: str) -> List[Dict]:
        """Extract video sources from URL"""
        print(f"🔍 Analyzing URL: {url}")
        self.original_url = url
        
        video_sources = []
        
        # Method 1: Enhanced page analysis with session handling
        print("🔎 Analyzing page with session handling...")
        enhanced_sources = self._extract_with_session_handling(url)
        if enhanced_sources:
            video_sources.extend(enhanced_sources)
            print(f"✅ Enhanced analysis found {len(enhanced_sources)} sources")
        
        # Method 2: Direct page analysis (fallback)
        print("🔎 Analyzing page source...")
        direct_sources = self._extract_from_page_source(url)
        if direct_sources:
            video_sources.extend(direct_sources)
            print(f"✅ Page analysis found {len(direct_sources)} sources")
        
        # Remove duplicates and sort by quality
        unique_sources = self._process_sources(video_sources)
        
        return unique_sources
    
    def _extract_with_session_handling(self, url: str) -> List[Dict]:
        """Enhanced extraction with proper session handling"""
        try:
            print("   🍪 Establishing session...")
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            sources = []
            content = response.text
            
            # Extract iframe sources (common in streaming sites)
            iframe_pattern = r'<iframe[^>]*src=["\']([^"\']+)["\'][^>]*>'
            iframe_matches = re.findall(iframe_pattern, content, re.IGNORECASE)
            
            for iframe_url in iframe_matches:
                if any(keyword in iframe_url.lower() for keyword in ['player', 'embed', 'video', 'stream']):
                    print(f"   🎬 Found iframe: {iframe_url[:50]}...")
                    iframe_sources = self._extract_from_iframe(iframe_url)
                    sources.extend(iframe_sources)
            
            # Look for JavaScript-generated video URLs
            js_sources = self._extract_javascript_urls(content)
            sources.extend(js_sources)
            
            # Enhanced pattern matching for streaming sites
            streaming_sources = self._extract_streaming_patterns(content)
            sources.extend(streaming_sources)
            
            return sources
            
        except Exception as e:
            print(f"   ⚠️ Session handling failed: {str(e)[:100]}...")
            return []
    
    def _extract_from_iframe(self, iframe_url: str) -> List[Dict]:
        """Extract video sources from iframe"""
        try:
            # Make iframe URL absolute
            if iframe_url.startswith('//'):
                iframe_url = 'https:' + iframe_url
            elif iframe_url.startswith('/'):
                iframe_url = urljoin(self.original_url, iframe_url)
            
            # Set proper referrer for iframe request
            iframe_headers = self.session.headers.copy()
            iframe_headers['Referer'] = self.original_url
            
            print(f"   📺 Analyzing iframe: {iframe_url}")
            response = self.session.get(iframe_url, headers=iframe_headers, timeout=10)
            response.raise_for_status()
            
            sources = []
            content = response.text
            
            # Look for video sources in iframe
            video_patterns = [
                r'"file":\s*"([^"]+\.(?:mp4|m3u8|mpd))"',
                r'"src":\s*"([^"]+\.(?:mp4|m3u8|mpd))"',
                r'"url":\s*"([^"]+\.(?:mp4|m3u8|mpd))"',
                r'source:\s*["\']([^"\']+\.(?:mp4|m3u8|mpd))["\']',
                r'file:\s*["\']([^"\']+\.(?:mp4|m3u8|mpd))["\']',
            ]
            
            for pattern in video_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    clean_url = match.replace('\\/', '/')
                    if self._is_valid_video_url(clean_url):
                        # Make URL absolute
                        if clean_url.startswith('//'):
                            clean_url = 'https:' + clean_url
                        elif clean_url.startswith('/'):
                            clean_url = urljoin(iframe_url, clean_url)
                        
                        sources.append(self._create_source_dict(clean_url, 'iframe_extraction'))
            
            return sources
            
        except Exception as e:
            print(f"   ⚠️ Iframe extraction failed: {str(e)[:50]}...")
            return []
    
    def _extract_javascript_urls(self, content: str) -> List[Dict]:
        """Extract video URLs from JavaScript code"""
        sources = []
        
        # Look for JavaScript variables containing video URLs
        js_patterns = [
            r'var\s+\w+\s*=\s*["\']([^"\']+\.(?:mp4|m3u8|mpd))["\']',
            r'let\s+\w+\s*=\s*["\']([^"\']+\.(?:mp4|m3u8|mpd))["\']',
            r'const\s+\w+\s*=\s*["\']([^"\']+\.(?:mp4|m3u8|mpd))["\']',
            r'videoUrl\s*[:=]\s*["\']([^"\']+)["\']',
            r'streamUrl\s*[:=]\s*["\']([^"\']+)["\']',
            r'playUrl\s*[:=]\s*["\']([^"\']+)["\']',
        ]
        
        for pattern in js_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                clean_url = match.replace('\\/', '/')
                if self._is_valid_video_url(clean_url):
                    sources.append(self._create_source_dict(clean_url, 'javascript_extraction'))
        
        return sources
    
    def _extract_streaming_patterns(self, content: str) -> List[Dict]:
        """Extract using patterns specific to streaming sites"""
        sources = []
        
        # Enhanced patterns for streaming sites
        streaming_patterns = [
            # Direct video files with query parameters
            r'(https?://[^"\s]+\.(?:mp4|avi|mkv|mov|wmv|flv|webm|m4v)(?:\?[^"\s]*)?)',
            # HLS/DASH manifests
            r'([^"\s]+\.m3u8(?:\?[^"\s]*)?)',
            r'([^"\s]+\.mpd(?:\?[^"\s]*)?)',
            # Player configurations
            r'player\.setup\({[^}]*file:\s*["\']([^"\']+)["\']',
        ]
        
        for pattern in streaming_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                clean_url = match.replace('\\/', '/')
                if self._is_valid_video_url(clean_url):
                    sources.append(self._create_source_dict(clean_url, 'streaming_pattern'))
        
        return sources
    
    def _extract_from_page_source(self, url: str) -> List[Dict]:
        """Extract video URLs from page source"""
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            content = response.text
            
            sources = []
            
            # Pattern 1: Direct video file URLs
            video_patterns = [
                r'https?://[^"\s<>]+\.(?:mp4|avi|mkv|mov|wmv|flv|webm|m4v)(?:\?[^"\s<>]*)?',
                r'https?://[^"\s<>]+/videoplayback\?[^"\s<>]*',
                r'https?://[^"\s<>]+\.m3u8(?:\?[^"\s<>]*)?',
                r'https?://[^"\s<>]+\.mpd(?:\?[^"\s<>]*)?',
            ]
            
            for pattern in video_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    clean_url = self._clean_url(match)
                    if self._is_valid_video_url(clean_url):
                        sources.append(self._create_source_dict(clean_url, 'direct_pattern'))
            
            return sources
            
        except Exception as e:
            print(f"⚠️ Page source extraction failed: {str(e)[:100]}...")
            return []
    
    def _create_source_dict(self, url: str, method: str) -> Dict:
        """Create a standardized source dictionary"""
        return {
            'url': url,
            'quality': self._guess_quality_from_url(url),
            'format': self._get_format_from_url(url),
            'filesize': 0,
            'method': method,
            'title': 'Extracted Video'
        }
    
    def _clean_url(self, url: str) -> str:
        """Clean and normalize URL"""
        return url.strip().strip('"\'').replace('\\/', '/')
    
    def _is_valid_video_url(self, url: str) -> bool:
        """Check if URL is a valid video URL"""
        if not url or not isinstance(url, str) or len(url) < 10:
            return False
        
        url_lower = url.lower()
        
        # Check for video file extensions
        video_extensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.m3u8', '.mpd']
        for ext in video_extensions:
            if ext in url_lower:
                return True
        
        # Check for streaming patterns
        streaming_patterns = ['videoplayback', 'manifest', 'playlist', 'stream', '/video/', 'player']
        for pattern in streaming_patterns:
            if pattern in url_lower:
                return True
        
        return False
    
    def _guess_quality_from_url(self, url: str) -> int:
        """Guess video quality from URL and return as integer"""
        url_lower = url.lower()
        
        quality_patterns = {
            2160: ['4k', '2160p', '3840x2160'],
            1440: ['1440p', '2560x1440'],
            1080: ['1080p', '1920x1080', 'hd'],
            720: ['720p', '1280x720'],
            480: ['480p', '854x480'],
            360: ['360p', '640x360'],
            240: ['240p', '426x240'],
        }
        
        for quality, patterns in quality_patterns.items():
            for pattern in patterns:
                if pattern in url_lower:
                    return quality
        
        return 0
    
    def _get_format_from_url(self, url: str) -> str:
        """Get video format from URL"""
        url_lower = url.lower()
        
        format_map = {
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
        }
        
        for ext, fmt in format_map.items():
            if ext in url_lower:
                return fmt
        
        return 'unknown'
    
    def _process_sources(self, sources: List[Dict]) -> List[Dict]:
        """Remove duplicates and sort sources"""
        # Remove duplicates based on URL
        seen_urls = set()
        unique_sources = []
        
        for source in sources:
            url = source['url']
            if url not in seen_urls:
                seen_urls.add(url)
                # Ensure quality is an integer
                if source['quality'] is None or not isinstance(source['quality'], int):
                    source['quality'] = 0
                unique_sources.append(source)
        
        # Sort by quality (highest first)
        unique_sources.sort(key=lambda x: x['quality'], reverse=True)
        
        return unique_sources

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            movie_url = request_data.get('movieUrl')
            title = request_data.get('title', 'Unknown Movie')
            output_filename = request_data.get('outputFileName', 'movie.mp4')
            
            if not movie_url:
                self._send_error(400, 'Movie URL is required')
                return
            
            # Check if the URL is from supported sources
            is_supported = any(source in movie_url.lower() for source in ['ibomma', '5movierulz', 'movierulz'])
            
            if not is_supported:
                self._send_error(400, 'Download is only supported for iBomma and MovieRulz sources')
                return
            
            # Set response headers for streaming
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Transfer-Encoding', 'chunked')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            
            # Send initial response
            self._send_json_chunk({
                'status': 'started',
                'message': 'Starting video extraction...',
                'movieUrl': movie_url,
                'title': title
            })
            
            # Extract video sources
            extractor = SimpleVideoExtractor()
            sources = extractor.extract_video_sources(movie_url)
            
            if not sources:
                self._send_json_chunk({
                    'status': 'error',
                    'message': 'No video sources found for this movie',
                    'timestamp': self._get_timestamp()
                })
                return
            
            # Get the best quality source
            best_source = sources[0]
            
            self._send_json_chunk({
                'status': 'info',
                'message': f'Found {len(sources)} video sources. Using best quality: {best_source["quality"]}p',
                'timestamp': self._get_timestamp()
            })
            
            # Provide download information
            self._send_json_chunk({
                'status': 'completed',
                'message': f'Video source extracted successfully! Quality: {best_source["quality"]}p, Format: {best_source["format"]}',
                'downloadUrl': best_source['url'],
                'quality': best_source['quality'],
                'format': best_source['format'],
                'method': best_source['method'],
                'timestamp': self._get_timestamp()
            })
            
        except Exception as e:
            self._send_json_chunk({
                'status': 'error',
                'message': f'Extraction failed: {str(e)}',
                'timestamp': self._get_timestamp()
            })
    
    def _send_json_chunk(self, data):
        """Send a JSON chunk in the streaming response"""
        chunk = json.dumps(data) + '\n'
        self.wfile.write(chunk.encode('utf-8'))
        self.wfile.flush()
    
    def _send_error(self, code, message):
        """Send an error response"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_data = {'error': message}
        self.wfile.write(json.dumps(error_data).encode('utf-8'))
    
    def _get_timestamp(self):
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat() + 'Z'