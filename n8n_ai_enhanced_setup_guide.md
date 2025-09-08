# N8N AI-Enhanced Movie Scraper Setup Guide

## Overview
This enhanced workflow adds AI-powered domain discovery and web search capabilities to automatically find the current working movierulz domain.

## New Features Added

### 🤖 AI Agent Integration
- **OpenRouter API Integration**: Uses Claude-3-Haiku for intelligent domain discovery
- **Smart Domain Detection**: AI analyzes web search results to find current working domains
- **Fallback Protection**: Automatically falls back to known domains if AI fails

### 🔍 Web Search Integration
- **DuckDuckGo Search**: Searches for current movierulz domains on Reddit/Quora
- **Real-time Discovery**: Finds active domains dynamically instead of hardcoding
- **Community-sourced**: Leverages community discussions for domain updates

### 📈 Enhanced Workflow
- **Intelligent Routing**: AI determines the best domain before scraping
- **Better Error Handling**: More robust parsing and fallback mechanisms
- **Metadata Tracking**: Tracks AI decisions and domain sources

## Setup Instructions

### 1. Get OpenRouter API Key
1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Navigate to "Keys" section
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

### 2. Configure N8N Environment Variable
Add the OpenRouter API key to your N8N environment:

```bash
# In your N8N environment or .env file
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
```

### 3. Import the Workflow
1. Open N8N interface
2. Go to Workflows
3. Click "Import from File"
4. Select `n8n_5movierulz_villas_workflow_ai_enhanced.json`
5. Save the workflow

### 4. Test the Setup
```bash
# Test webhook endpoint
curl -X POST "http://your-n8n-instance/webhook/movie-scraper-villas" \
  -H "Content-Type: application/json" \
  -d '{"query": "rrr"}'
```

## Workflow Flow

```
Webhook Trigger
    ↓
Prepare Search Data
    ↓
Web Search for Domain (DuckDuckGo)
    ↓
AI Domain Finder (OpenRouter + Claude)
    ↓
Process AI Response
    ↓
HTTP Scrape with Headers
    ↓
Parse Movie Results (Enhanced)
    ↓
Filter Valid Movies
    ↓
Format Final Results
    ↓
Send to Your App
    ↓
Webhook Response
```

## Key Improvements

### 1. Dynamic Domain Discovery
- **Before**: Hardcoded domain `5movierulz.villas`
- **After**: AI searches web for current working domain
- **Benefit**: Automatically adapts to domain changes

### 2. Intelligent Parsing
- **Enhanced HTML parsing** with multiple strategies
- **Better error handling** for blocked requests
- **Improved movie extraction** algorithms

### 3. AI-Powered Decision Making
- **Smart domain selection** based on search results
- **Contextual understanding** of community discussions
- **Automatic fallback** to known working domains

## Configuration Options

### AI Model Selection
You can change the AI model in the "AI Domain Finder" node:
```json
{
  "model": "anthropic/claude-3-haiku",  // Fast and cost-effective
  // OR
  "model": "anthropic/claude-3-sonnet", // More capable
  // OR  
  "model": "openai/gpt-4o-mini"        // Alternative option
}
```

### Search Query Customization
Modify the web search query in "Web Search for Domain" node:
```
5movierulz current working domain site:reddit.com OR site:quora.com
```

### Timeout Settings
Adjust timeouts based on your needs:
- **Web Search**: 15 seconds (fast)
- **AI Processing**: 30 seconds (allows for AI thinking)
- **HTTP Scraping**: 30 seconds (handles slow sites)

## Troubleshooting

### Common Issues

1. **OpenRouter API Key Error**
   ```
   Error: Unauthorized (401)
   ```
   - Check API key is correctly set in environment
   - Verify key starts with `sk-or-v1-`
   - Ensure you have credits in OpenRouter account

2. **Web Search Timeout**
   ```
   Error: Request timeout
   ```
   - DuckDuckGo might be rate limiting
   - Increase timeout in "Web Search for Domain" node
   - Consider alternative search APIs

3. **AI Response Parsing Error**
   ```
   Error: Cannot read property 'choices'
   ```
   - AI API might be down
   - Check OpenRouter status page
   - Workflow will fallback to default domain

4. **No Movies Found**
   ```
   Result: Empty movie list
   ```
   - Domain might be blocking requests
   - Try different User-Agent strings
   - Check if site structure changed

### Debug Mode
Enable debug logging by adding to any Code node:
```javascript
console.log('Debug info:', JSON.stringify(data, null, 2));
```

## Cost Considerations

### OpenRouter Pricing
- **Claude-3-Haiku**: ~$0.0001 per request
- **Expected monthly cost**: <$1 for typical usage
- **Free tier**: Usually includes some free credits

### Optimization Tips
- Use Haiku model for cost efficiency
- Cache domain results for repeated queries
- Implement rate limiting for high-volume usage

## Security Notes

### API Key Protection
- Never commit API keys to version control
- Use N8N environment variables
- Rotate keys periodically

### Request Headers
- Uses realistic browser headers
- Includes proper referrer for OpenRouter
- Implements standard security headers

## Next Steps

1. **Monitor Performance**: Check workflow execution times
2. **Optimize Parsing**: Adjust movie extraction rules as needed
3. **Add Caching**: Consider caching domain results
4. **Scale Up**: Add more AI models or search sources
5. **Analytics**: Track success rates and domain changes

## Support

If you encounter issues:
1. Check N8N execution logs
2. Verify API key configuration
3. Test individual nodes
4. Review OpenRouter dashboard for usage/errors

The AI-enhanced workflow should now automatically discover current movierulz domains and provide more reliable movie scraping results!