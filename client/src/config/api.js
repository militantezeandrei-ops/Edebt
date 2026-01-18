// API configuration - automatically detects environment
const getApiUrl = () => {
  // Check for explicit API URL in environment (REQUIRED for Netlify)
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (deployed to Netlify), we MUST have REACT_APP_API_URL set
  if (process.env.NODE_ENV === 'production') {
    // If no REACT_APP_API_URL is set, show error
    const isNetlify = window.location.hostname.includes('netlify.app') || 
                      window.location.hostname.includes('netlify.com');
    
    if (isNetlify && !process.env.REACT_APP_API_URL) {
      console.error('❌ ERROR: REACT_APP_API_URL is not set in Netlify environment variables!');
      console.error('Please set REACT_APP_API_URL in Netlify Site Settings → Environment Variables');
      // Return a placeholder that will show an error
      return 'BACKEND_URL_NOT_SET';
    }
    
    // Fallback: try same origin (won't work for Netlify, but might work for other deployments)
    const url = window.location.origin.replace(':3000', ':5000');
    console.warn('⚠️ No REACT_APP_API_URL set, using fallback:', url);
    return url;
  }
  
  // In development, use localhost
  const devUrl = 'http://localhost:5000';
  console.log('🔧 Development API URL:', devUrl);
  return devUrl;
};

export const API_URL = getApiUrl();

// Log API URL for debugging
console.log('API_URL configured as:', API_URL);

// Helper function for API calls
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

export default API_URL;
