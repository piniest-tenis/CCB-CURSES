/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true, // required for static export
    domains: ["d144nqghu71795.cloudfront.net"],
  },
  transpilePackages: ["../shared"],
  experimental: {
    // Required for Zustand + server components interop
    optimizePackageImports: ["@radix-ui/react-dialog", "@radix-ui/react-select"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;
