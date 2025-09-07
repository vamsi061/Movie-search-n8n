# Movie Search UI - 5MovieRulz

A fast, lightweight movie search interface that connects to an n8n workflow to search and stream movies from 5MovieRulz.

## Features

- 🎬 **Fast Movie Search** - Search movies by title
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎯 **Direct Streaming Links** - Get StreamLare, StreamTape and other streaming URLs
- ⚡ **Lightweight** - Minimal dependencies for fast loading
- 🚀 **Easy Deployment** - Ready for Render deployment

## Live Demo

The app displays movie results with:
- Movie posters and titles
- Year, quality, and language information
- Multiple streaming links with priority ranking
- Clean, modern interface

## Setup

### Prerequisites
- Node.js 16+ 
- n8n workflow running with the movie scraper

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/vamsi061/Movie-search-n8n.git
cd Movie-search-n8n
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URL in `public/index.html`:
```javascript
const API_URL = 'YOUR_N8N_WEBHOOK_URL';
```

4. Start the server:
```bash
npm start
```

5. Open http://localhost:3000

### Deploy to Vercel (Recommended)

1. Fork this repository
2. Go to [Vercel.com](https://vercel.com)
3. Click "New Project"
4. Import from GitHub: `vamsi061/Movie-search-n8n`
5. Click "Deploy" (no configuration needed!)
6. Your app will be live at: `https://your-project-name.vercel.app`

### Deploy to Render (Alternative)

1. Fork this repository
2. Connect your GitHub account to Render
3. Create a new Web Service
4. Select this repository
5. Use these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

## API Integration

The UI connects to an n8n workflow that:
1. Searches 5movierulz.villas for movies
2. Extracts movie metadata (title, year, quality, language)
3. Finds streaming URLs from movie pages
4. Returns structured JSON response

### Expected API Response Format

```json
{
  "query": "search term",
  "results": [
    {
      "title": "Movie Title (2023)",
      "url": "https://streamlare.com/v/xyz",
      "source": "5movierulz.villas",
      "year": "2023",
      "poster": "https://example.com/poster.jpg",
      "quality": "HDRip",
      "language": "English",
      "streamingUrls": [
        {
          "url": "https://streamlare.com/v/xyz",
          "type": "streaming",
          "service": "streamlare",
          "quality": "HD",
          "priority": 1
        }
      ]
    }
  ],
  "total": 5
}
```

## Performance Optimizations

- **Minimal Dependencies** - Only Express and CORS
- **Static File Serving** - Efficient asset delivery
- **CSS Grid Layout** - Hardware-accelerated rendering
- **Lazy Loading** - Images load on demand
- **Compressed Assets** - Optimized for fast loading

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool is for educational purposes only. Users are responsible for complying with applicable laws and terms of service.