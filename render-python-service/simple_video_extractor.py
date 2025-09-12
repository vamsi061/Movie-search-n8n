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
import argparse
from typing import List, Dict, Optional
import yt_dlp
import os


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
        
        # Remove duplicates and sort by quality
        unique_sources = self._deduplicate_sources(video_sources)
        sorted_sources = sorted(unique_sources, key=lambda x: x['quality'], reverse=True)
        
        return sorted_sources
    
    def _extract_with_session_handling(self, url: str) -> List[Dict]:
        """Enhanced extraction with proper session handling"""
        sources = []
        
        try:
            # First, get the page content
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            content = response.text
            
            # Extract video URLs using multiple patterns
            video_patterns = [
                r'(?:src|source|data-src|href)=["\']([^"\']*\.(?:mp4|mkv|avi|webm|m3u8|mpd)[^"\']*)["\']',
                r'(?:file|url|source):\s*["\']([^"\']*\.(?:mp4|mkv|avi|webm|m3u8|mpd)[^"\']*)["\']',
                r'(?:video|stream)_url["\']?\s*[:=]\s*["\']([^"\']+)["\']',
                r'(?:https?://[^"\'\s]+\.(?:mp4|mkv|avi|webm|m3u8|mpd)(?:\?[^"\'\s]*)?)',
                r'(?:blob:|data:)[^"\'\s]+',
            ]
            
            found_urls = set()
            for pattern in video_patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    video_url = match.group(1) if match.groups() else match.group(0)
                    if video_url and self._is_valid_video_url(video_url):
                        # Convert relative URLs to absolute
                        if video_url.startswith('//'):
                            video_url = 'https:' + video_url
                        elif video_url.startswith('/'):
                            video_url = urljoin(url, video_url)
                        found_urls.add(video_url)
            
            # Create source objects
            for video_url in found_urls:
                source = {
                    'url': video_url,
                    'quality': self._estimate_quality(video_url),
                    'format': self._get_format(video_url),
                    'method': 'session_analysis',
                    'title': self._extract_title(content),
                    'filesize': None,
                    'duration': None
                }
                sources.append(source)
                
        except Exception as e:
            print(f"❌ Session analysis failed: {str(e)}")
        
        return sources
    
    def _extract_with_ytdlp(self, url: str) -> List[Dict]:
        """Extract using yt-dlp"""
        sources = []
        
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'format': 'best',
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if 'formats' in info:
                    for fmt in info['formats']:
                        if fmt.get('url'):
                            source = {
                                'url': fmt['url'],
                                'quality': fmt.get('height', 0),
                                'format': fmt.get('ext', 'unknown'),
                                'method': 'yt-dlp',
                                'title': info.get('title', 'Unknown'),
                                'filesize': fmt.get('filesize'),
                                'duration': info.get('duration')
                            }
                            sources.append(source)
                else:
                    # Single format
                    source = {
                        'url': info['url'],
                        'quality': info.get('height', 0),
                        'format': info.get('ext', 'unknown'),
                        'method': 'yt-dlp',
                        'title': info.get('title', 'Unknown'),
                        'filesize': info.get('filesize'),
                        'duration': info.get('duration')
                    }
                    sources.append(source)
                    
        except Exception as e:
            print(f"❌ yt-dlp extraction failed: {str(e)}")
        
        return sources
    
    def _is_valid_video_url(self, url: str) -> bool:
        """Check if URL is a valid video URL"""
        if not url or len(url) < 10:
            return False
        
        # Skip common non-video URLs
        skip_patterns = [
            r'\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff|ttf)(?:\?|$)',
            r'(?:google|facebook|twitter|instagram)\.com',
            r'(?:ads|analytics|tracking)',
            r'data:image',
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return False
        
        return True
    
    def _estimate_quality(self, url: str) -> int:
        """Estimate video quality from URL"""
        quality_patterns = {
            r'(?:^|[^\d])(\d{3,4})p(?:[^\d]|$)': lambda m: int(m.group(1)),
            r'(?:^|[^\d])(720|1080|1440|2160)(?:[^\d]|$)': lambda m: int(m.group(1)),
            r'hd|high': lambda m: 720,
            r'sd|low': lambda m: 480,
            r'4k|uhd': lambda m: 2160,
        }
        
        for pattern, extractor in quality_patterns.items():
            match = re.search(pattern, url, re.IGNORECASE)
            if match:
                return extractor(match)
        
        return 0  # Unknown quality
    
    def _get_format(self, url: str) -> str:
        """Get video format from URL"""
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        if '.mp4' in path:
            return 'mp4'
        elif '.mkv' in path:
            return 'mkv'
        elif '.avi' in path:
            return 'avi'
        elif '.webm' in path:
            return 'webm'
        elif '.m3u8' in path:
            return 'hls'
        elif '.mpd' in path:
            return 'dash'
        else:
            return 'unknown'
    
    def _extract_title(self, content: str) -> str:
        """Extract title from page content"""
        title_patterns = [
            r'<title[^>]*>([^<]+)</title>',
            r'<h1[^>]*>([^<]+)</h1>',
            r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']',
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "Unknown"
    
    def _deduplicate_sources(self, sources: List[Dict]) -> List[Dict]:
        """Remove duplicate sources"""
        seen_urls = set()
        unique_sources = []
        
        for source in sources:
            url = source['url']
            if url not in seen_urls:
                seen_urls.add(url)
                unique_sources.append(source)
        
        return unique_sources
    
    def download_video(self, source: Dict, output_path: str = "./downloads/") -> bool:
        """Download video using yt-dlp"""
        try:
            os.makedirs(output_path, exist_ok=True)
            
            # Sanitize filename
            title = source.get('title', 'video')
            safe_title = re.sub(r'[^\w\s-]', '', title).strip()
            safe_title = re.sub(r'[-\s]+', '-', safe_title)
            
            ydl_opts = {
                'outtmpl': os.path.join(output_path, f'{safe_title}.%(ext)s'),
                'format': 'best',
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print(f"🔽 Downloading: {source['url']}")
                ydl.download([source['url']])
                print(f"✅ Download completed: {safe_title}")
                return True
                
        except Exception as e:
            print(f"❌ Download failed: {str(e)}")
            return False


def main():
    parser = argparse.ArgumentParser(description='Extract and download video sources')
    parser.add_argument('url', help='URL to extract video from')
    parser.add_argument('--download', action='store_true', help='Download the best quality video')
    parser.add_argument('--output', default='./downloads/', help='Output directory for downloads')
    
    args = parser.parse_args()
    
    extractor = SimpleVideoExtractor()
    sources = extractor.extract_video_sources(args.url)
    
    if not sources:
        print("❌ No video sources found!")
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
    
    if args.download and sources:
        print("🔽 Starting download of best quality source...")
        success = extractor.download_video(sources[0], args.output)
        if success:
            print("🎉 Download completed successfully!")
        else:
            print("💥 Download failed!")


if __name__ == "__main__":
    main()