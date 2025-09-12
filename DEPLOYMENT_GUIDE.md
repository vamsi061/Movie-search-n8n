# Movie Download Deployment Guide

## Architecture Overview

```
[Vercel Frontend] → [Render Python Service] → [Python Script Execution] → [Download]
```

## Deployment Steps

### 1. Deploy Python Service to Render

1. **Create a new Render account** at https://render.com
2. **Create a new Web Service** from the Render dashboard
3. **Connect the Movie Downloader repository**: https://github.com/vamsi061/Movie-downloader
4. **Configure the service:**
   - **Name**: `movie-python-downloader`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Root Directory**: Leave empty (uses repository root)

5. **Add Environment Variables:**
   - `PORT`: `5000` (automatically set by Render)

6. **Add Persistent Disk (Optional):**
   - Name: `downloads`
   - Mount Path: `/opt/render/project/src/downloads`
   - Size: 10GB

### 2. Update Vercel Frontend

1. **Update the environment variable** in your Vercel project:
   - Go to your Vercel project settings
   - Add environment variable:
     - `RENDER_PYTHON_SERVICE_URL`: `https://your-service-name.onrender.com/download`
     - Replace `your-service-name` with your actual Render service name

2. **Redeploy your Vercel project** to apply the changes

### 3. File Structure

```
your-project/
├── api/
│   ├── python-download.js          # New download API endpoint
│   ├── search.js                   # Existing search functionality
│   └── ...
├── Python Service Repository:      # https://github.com/vamsi061/Movie-downloader
│   ├── app.py                      # Flask application
│   ├── simple_video_extractor.py   # Video extraction script
│   ├── requirements.txt            # Python dependencies
│   ├── render.yaml                 # Render configuration
│   └── Dockerfile                  # Docker configuration
├── movie_search_ui.html            # Updated UI with download button
└── ...
```

## How It Works

### 1. User Interaction
- User searches for movies on Vercel frontend
- User clicks "📥 Download" button on any movie card
- Download modal opens showing progress

### 2. API Flow
- Frontend calls `/api/python-download` (Vercel serverless function)
- Vercel function forwards request to Render Python service
- Python service executes `simple_video_extractor.py` script
- Real-time progress is streamed back to the frontend

### 3. Download Process
- Python script analyzes the movie URL
- Extracts direct video download links
- Downloads the video using yt-dlp
- Progress updates are sent back to the UI

## Environment Variables

### Vercel (Frontend)
```
RENDER_PYTHON_SERVICE_URL=https://your-service-name.onrender.com/download
```

### Render (Python Service)
```
PORT=5000  # Automatically set by Render
```

## Testing

### 1. Test Python Service Locally
```bash
cd render-python-service
pip install -r requirements.txt
python app.py
```

### 2. Test Download Endpoint
```bash
curl -X POST http://localhost:5000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-movie-url.com", "title": "Test Movie"}'
```

### 3. Test Full Flow
1. Deploy both services
2. Search for a movie on your Vercel frontend
3. Click the download button
4. Monitor the download progress in the modal

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your Render service URL is correctly set in Vercel environment variables

2. **Python Service Not Starting**: Check Render logs for dependency installation errors

3. **Download Failures**: Some video sources may not be supported by yt-dlp

4. **Timeout Issues**: Large video downloads may timeout - consider implementing background job processing

### Logs

- **Vercel Logs**: Available in Vercel dashboard under Functions tab
- **Render Logs**: Available in Render dashboard under your service logs

## Security Considerations

1. **Rate Limiting**: Consider adding rate limiting to prevent abuse
2. **URL Validation**: Validate movie URLs before processing
3. **File Size Limits**: Set reasonable limits on download file sizes
4. **Storage Management**: Implement cleanup for downloaded files

## Cost Optimization

1. **Render Free Tier**: 750 hours/month free (sufficient for testing)
2. **Vercel Free Tier**: 100GB bandwidth/month
3. **Storage**: Use temporary storage and clean up files after download
4. **Scaling**: Consider upgrading Render plan for production use

## Next Steps

1. Deploy the Python service to Render
2. Update Vercel environment variables
3. Test the complete flow
4. Monitor performance and optimize as needed
5. Consider adding features like download queue, progress persistence, etc.