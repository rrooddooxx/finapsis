// Runtime configuration utility
declare global {
  interface Window {
    __CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

// Get configuration from either runtime config or build-time environment
export const config = {
  API_BASE_URL: 
    // First try runtime config (from config.js)
    window?.__CONFIG__?.API_BASE_URL ||
    // Fallback to build-time environment variable
    import.meta.env.VITE_BACKEND_API_URL ||
    // Final fallback
    'http://localhost:3000',
};

export default config;