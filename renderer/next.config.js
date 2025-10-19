/** @type {import('next').NextConfig} */
module.exports = {
  output: "export",
  distDir: process.env.NODE_ENV === "production" ? "../app" : ".next",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    // We run ESLint separately, so disable it during build
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Enable TypeScript checking during build
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    return config;
  },
};
