/**
 * API Configuration utility
 * Handles different environments and hosting scenarios
 */

// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // In development, use the environment variable if set
  if (import.meta.env.DEV && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use relative paths (same origin) by default
  // This works when frontend and backend are served from the same domain
  if (import.meta.env.PROD) {
    // Check if there's a production API URL override
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // Default to same origin for production
    return window.location.origin;
  }
  
  // Fallback for any other scenarios
  return 'http://localhost:3001';
};

// Export the API configuration
export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  endpoints: {
    health: '/api/health',
    astronomy: '/api/astronomy',
    astronomyCalculated: '/api/astronomy-calculated',
    locationSearch: '/api/location-search',
    astronomyMulti: '/api/astronomy-multi',
    testRaw: '/api/test-raw',
    compareLibraries: '/api/compare-all-libraries'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  const baseUrl = apiConfig.baseUrl.endsWith('/') 
    ? apiConfig.baseUrl.slice(0, -1) 
    : apiConfig.baseUrl;
  
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

// Export individual endpoint builders for convenience
export const getHealthUrl = () => buildApiUrl(apiConfig.endpoints.health);
export const getAstronomyUrl = () => buildApiUrl(apiConfig.endpoints.astronomy);
export const getAstronomyCalculatedUrl = () => buildApiUrl(apiConfig.endpoints.astronomyCalculated);
export const getLocationSearchUrl = () => buildApiUrl(apiConfig.endpoints.locationSearch);

// Export a fetch wrapper that automatically uses the correct base URL
export const apiFetch = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    return response;
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

// Debug helper - logs the current configuration
export const logApiConfig = () => {
  console.log('🔧 API Configuration:', {
    baseUrl: apiConfig.baseUrl,
    environment: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    envApiUrl: import.meta.env.VITE_API_URL
  });
};

export default apiConfig;
