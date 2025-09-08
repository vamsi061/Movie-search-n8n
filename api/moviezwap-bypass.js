export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query } = req.query;

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  try {
    console.log('MoviezWap bypass for:', query);
    
    // Return mock data for now to test the UI integration
    const mockResults = [
      {
        title: `${query} Chapter 1: Chandra (2025) Telugu [DVDScr]`,
        url: `https://www.moviezwap.care/movie/${query}-Chapter-1-Chandra-(2025)-Telugu.html`,
        source: 'moviezwap.care',
        year: '2025',
        quality: 'DVDScr',
        language: 'Telugu',
        genre: 'Drama',
        poster: generatePlaceholderPoster(`${query} Chapter 1`),
        streamingUrls: []
      }
    ];

    res.status(200).json({
      success: true,
      source: 'moviezwap.care',
      query: query,
      results: mockResults,
      total: mockResults.length,
      message: `Found ${mockResults.length} movies from MoviezWap (bypass mode)`
    });

  } catch (error) {
    console.error('MoviezWap bypass error:', error);
    res.status(200).json({ 
      success: false,
      error: 'Failed to bypass MoviezWap',
      message: error.message,
      source: 'moviezwap.care',
      results: [],
      total: 0
    });
  }
}

function generatePlaceholderPoster(title) {
  const shortTitle = title.substring(0, 20);
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3e5f5"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#7b1fa2" text-anchor="middle" dy=".3em">
        ${shortTitle}
      </text>
    </svg>
  `).toString('base64')}`;
}