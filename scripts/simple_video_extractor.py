#!/usr/bin/env python3
"""
Simple Video Source Extractor - Lightweight version without Selenium
Extracts downloadable video URLs from streaming websites
"""

import requests
import re
import json
import urllib.parse
from urllib.parse import urljoin, urlparse
import sys
from typing import List, Dict, Optional
import yt_dlp


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
        
        # Method 1: Enhanced page analysis with session handling (like 1DM)
        print("🔎 Analyzing page with session handling...")
        enhanced_sources = self._extract_with_session_handling(url)
        if enhanced_sources:
            video_sources.extend(enhanced_sources)
            print(f"✅ Enhanced analysis found {len(enhanced_sources)} sources")
        
        # Method 2: Try yt-dlp (handles most major platforms)
        print("📡 Trying yt-dlp extraction...")
        ytdlp_sources = self._extract_with_ytdlp(url)
        if ytdlp_sources:
            video_sources.extend(ytdlp_sources)
            print(f"✅ yt-dlp found {len(ytdlp_sources)} sources")
        
        # Method 3: Direct page analysis (fallback)
        print("🔎 Analyzing page source...")
        direct_sources = self._extract_from_page_source(url)
        if direct_sources:
            video_sources.extend(direct_sources)
            print(f"✅ Page analysis found {len(direct_sources)} sources")
        
        # Method 4: Platform-specific extraction
        print("🎯 Trying platform-specific methods...")
        platform_sources = self._extract_platform_specific(url)
        if platform_sources:
            video_sources.extend(platform_sources)
            print(f"✅ Platform-specific found {len(platform_sources)} sources")
        
        # Remove duplicates and sort by quality
        unique_sources = self._process_sources(video_sources)
        
        return unique_sources
    
    def _extract_with_session_handling(self, url: str) -> List[Dict]:
        """Enhanced extraction with proper session handling like 1DM"""
        try:
            # Step 1: Visit the page to establish session and get cookies
            print("   🍪 Establishing session...")
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Step 2: Look for iframe sources and embedded players
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
            
            # Step 3: Look for JavaScript-generated video URLs
            js_sources = self._extract_javascript_urls(content)
            sources.extend(js_sources)
            
            # Step 4: Look for AJAX/API endpoints
            api_sources = self._extract_api_endpoints(content, url)
            sources.extend(api_sources)
            
            # Step 5: Enhanced pattern matching for streaming sites
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
                from urllib.parse import urljoin
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
    
    def _extract_api_endpoints(self, content: str, base_url: str) -> List[Dict]:
        """Extract video URLs from API endpoints"""
        sources = []
        
        # Look for AJAX calls that might return video URLs
        ajax_patterns = [
            r'ajax\([^)]*url:\s*["\']([^"\']+)["\']',
            r'fetch\(["\']([^"\']+)["\']',
            r'XMLHttpRequest.*open\([^,]*,\s*["\']([^"\']+)["\']',
        ]
        
        for pattern in ajax_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if any(keyword in match.lower() for keyword in ['video', 'stream', 'play', 'media']):
                    try:
                        # Make URL absolute
                        if match.startswith('/'):
                            api_url = urljoin(base_url, match)
                        else:
                            api_url = match
                        
                        # Try to fetch from API endpoint
                        api_headers = self.session.headers.copy()
                        api_headers['Referer'] = base_url
                        api_headers['X-Requested-With'] = 'XMLHttpRequest'
                        
                        api_response = self.session.get(api_url, headers=api_headers, timeout=5)
                        if api_response.status_code == 200:
                            api_data = api_response.text
                            
                            # Look for video URLs in API response
                            api_video_patterns = [
                                r'"url":\s*"([^"]+\.(?:mp4|m3u8|mpd))"',
                                r'"file":\s*"([^"]+\.(?:mp4|m3u8|mpd))"',
                                r'"src":\s*"([^"]+\.(?:mp4|m3u8|mpd))"',
                            ]
                            
                            for api_pattern in api_video_patterns:
                                api_matches = re.findall(api_pattern, api_data, re.IGNORECASE)
                                for api_match in api_matches:
                                    clean_url = api_match.replace('\\/', '/')
                                    if self._is_valid_video_url(clean_url):
                                        sources.append(self._create_source_dict(clean_url, 'api_extraction'))
                    
                    except Exception:
                        continue
        
        return sources
    
    def _extract_streaming_patterns(self, content: str) -> List[Dict]:
        """Extract using patterns specific to streaming sites"""
        sources = []
        
        # Enhanced patterns for streaming sites
        streaming_patterns = [
            # Base64 encoded URLs
            r'data-src=["\']([^"\']*(?:mp4|m3u8|mpd)[^"\']*)["\']',
            r'data-video=["\']([^"\']*)["\']',
            
            # Obfuscated URLs
            r'atob\(["\']([^"\']+)["\']',
            
            # Player configurations
            r'player\.setup\({[^}]*file:\s*["\']([^"\']+)["\']',
            r'new\s+Plyr\([^,]*,\s*{[^}]*sources:\s*\[{[^}]*src:\s*["\']([^"\']+)["\']',
            
            # HLS/DASH manifests
            r'([^"\s]+\.m3u8(?:\?[^"\s]*)?)',
            r'([^"\s]+\.mpd(?:\?[^"\s]*)?)',
            
            # Direct video files with query parameters
            r'(https?://[^"\s]+\.(?:mp4|avi|mkv|mov|wmv|flv|webm|m4v)(?:\?[^"\s]*)?)',
        ]
        
        for pattern in streaming_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                clean_url = match.replace('\\/', '/')
                
                # Handle base64 encoded URLs
                if pattern.startswith(r'atob'):
                    try:
                        import base64
                        decoded = base64.b64decode(match).decode('utf-8')
                        if self._is_valid_video_url(decoded):
                            sources.append(self._create_source_dict(decoded, 'base64_extraction'))
                    except:
                        continue
                elif self._is_valid_video_url(clean_url):
                    sources.append(self._create_source_dict(clean_url, 'streaming_pattern'))
        
        return sources
    
    def _extract_with_ytdlp(self, url: str) -> List[Dict]:
        """Extract using yt-dlp"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'format': 'best[ext=mp4]/best',
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                sources = []
                if 'formats' in info and info['formats']:
                    for fmt in info['formats']:
                        if fmt.get('url') and fmt.get('vcodec') != 'none':
                            sources.append({
                                'url': fmt['url'],
                                'quality': fmt.get('height', 0),
                                'format': fmt.get('ext', 'unknown'),
                                'filesize': fmt.get('filesize', 0),
                                'fps': fmt.get('fps', 0),
                                'vcodec': fmt.get('vcodec', 'unknown'),
                                'acodec': fmt.get('acodec', 'unknown'),
                                'method': 'yt-dlp',
                                'title': info.get('title', 'Unknown'),
                                'duration': info.get('duration', 0),
                                'uploader': info.get('uploader', 'Unknown')
                            })
                elif info.get('url'):
                    sources.append({
                        'url': info['url'],
                        'quality': 0,
                        'format': info.get('ext', 'unknown'),
                        'filesize': 0,
                        'fps': 0,
                        'vcodec': 'unknown',
                        'acodec': 'unknown',
                        'method': 'yt-dlp',
                        'title': info.get('title', 'Unknown'),
                        'duration': info.get('duration', 0),
                        'uploader': info.get('uploader', 'Unknown')
                    })
                
                return sources
                
        except Exception as e:
            print(f"⚠️ yt-dlp failed: {str(e)[:100]}...")
            return []
    
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
    
    def _extract_platform_specific(self, url: str) -> List[Dict]:
        """Platform-specific extraction methods"""
        sources = []
        domain = urlparse(url).netloc.lower()
        
        # For now, just return empty - can be extended for specific platforms
        return sources
    
    def _create_source_dict(self, url: str, method: str) -> Dict:
        """Create a standardized source dictionary"""
        return {
            'url': url,
            'quality': self._guess_quality_from_url(url),
            'format': self._get_format_from_url(url),
            'filesize': 0,
            'fps': 0,
            'vcodec': 'unknown',
            'acodec': 'unknown',
            'method': method,
            'title': 'Extracted Video',
            'duration': 0,
            'uploader': 'Unknown'
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
    
    def download_video(self, video_source: Dict, output_path: str = None) -> bool:
        """Download video from source with enhanced session handling"""
        try:
            url = video_source['url']
            
            if not output_path:
                title = video_source.get('title', 'video').replace(' ', '_')
                title = re.sub(r'[^\w\-_.]', '', title)  # Remove invalid filename chars
                format_ext = video_source.get('format', 'mp4')
                output_path = f"{title}.{format_ext}"
            
            print(f"🔽 Downloading: {url[:80]}{'...' if len(url) > 80 else ''}")
            print(f"📁 Output: {output_path}")
            
            # Enhanced headers for protected downloads
            download_headers = self.session.headers.copy()
            
            # Set proper referrer (crucial for protected sites)
            if self.original_url:
                download_headers['Referer'] = self.original_url
            
            # Add additional headers that 1DM uses
            download_headers.update({
                'Range': 'bytes=0-',  # Support for resume
                'Accept': '*/*',
                'Accept-Encoding': 'identity',  # Disable compression for video
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'video',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'cross-site',
            })
            
            # Try download with enhanced headers
            try:
                print("   🔄 Starting download...")
                response = self.session.get(url, headers=download_headers, stream=True, timeout=30)
                response.raise_for_status()
                success = self._download_stream(response, output_path)
                if success:
                    return True
            except Exception as e:
                print(f"   ⚠️ Download failed: {str(e)[:50]}...")
            
            print(f"\n❌ Download failed!")
            return False
            
        except Exception as e:
            print(f"\n❌ Download failed: {e}")
            return False
    
    def _download_stream(self, response, output_path: str) -> bool:
        """Download from response stream with enhanced progress tracking"""
        try:
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            # Print initial file size info
            if total_size > 0:
                size_mb = total_size / (1024 * 1024)
                print(f"📊 File size: {size_mb:.2f} MB ({total_size:,} bytes)")
            else:
                print("📊 File size: Unknown (streaming)")
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            downloaded_mb = downloaded / (1024 * 1024)
                            total_mb = total_size / (1024 * 1024)
                            print(f"\r📊 Progress: {percent:.1f}% ({downloaded_mb:.2f}/{total_mb:.2f} MB)", end='', flush=True)
                        else:
                            downloaded_mb = downloaded / (1024 * 1024)
                            print(f"\r📊 Downloaded: {downloaded_mb:.2f} MB", end='', flush=True)
            
            # Verify file was downloaded and show final size
            if downloaded > 0:
                final_size_mb = downloaded / (1024 * 1024)
                print(f"\n✅ Download completed: {output_path}")
                print(f"📁 Final size: {final_size_mb:.2f} MB ({downloaded:,} bytes)")
                return True
            else:
                print(f"\n❌ No data downloaded")
                return False
                
        except Exception as e:
            print(f"\n❌ Stream download failed: {e}")
            return False


def main():
    if len(sys.argv) < 2:
        print("🎥 Simple Video Source Extractor")
        print("Usage: python simple_video_extractor.py <URL> [--download] [--output <path>]")
        print("\nExamples:")
        print("  python simple_video_extractor.py https://example.com/video")
        print("  python simple_video_extractor.py https://vimeo.com/123456 --download")
        print("  python simple_video_extractor.py https://example.com/video --download --output my_video.mp4")
        sys.exit(1)
    
    url = sys.argv[1]
    download = '--download' in sys.argv
    output_path = None
    
    if '--output' in sys.argv:
        output_index = sys.argv.index('--output')
        if output_index + 1 < len(sys.argv):
            output_path = sys.argv[output_index + 1]
    
    print("🎥 Simple Video Source Extractor")
    print("=" * 50)
    
    extractor = SimpleVideoExtractor()
    sources = extractor.extract_video_sources(url)
    
    if not sources:
        print("❌ No video sources found!")
        print("\n💡 Tips:")
        print("  - Make sure the URL contains a video")
        print("  - Try using the full video page URL")
        print("  - Some sites require yt-dlp for extraction")
        return
    
    print(f"\n✅ Found {len(sources)} video source(s):")
    print()
    
    for i, source in enumerate(sources, 1):
        print(f"📹 Source {i}:")
        print(f"   🔗 URL: {source['url'][:80]}{'...' if len(source['url']) > 80 else ''}")
        print(f"   📺 Quality: {source['quality']}p" if source['quality'] > 0 else "   📺 Quality: Unknown")
        print(f"   📄 Format: {source['format']}")
        print(f"   🔧 Method: {source['method']}")
        print(f"   📝 Title: {source['title']}")
        if source['filesize']:
            print(f"   📊 Size: {source['filesize']} bytes")
        if source['duration']:
            print(f"   ⏱️ Duration: {source['duration']} seconds")
        print()
    
    if download and sources:
        print("🔽 Starting download of best quality source...")
        success = extractor.download_video(sources[0], output_path)
        if success:
            print("🎉 Download completed successfully!")
        else:
            print("💥 Download failed!")


if __name__ == "__main__":
    main()