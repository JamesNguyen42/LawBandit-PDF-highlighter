/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
    // Add these for better compatibility
    experimental: {
        esmExternals: false,
    },
    // Disable strict mode for compatibility with PDF.js
    reactStrictMode: false,
}

module.exports = nextConfig;