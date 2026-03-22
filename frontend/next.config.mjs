/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // required for static export
    // CDN domain is injected at build time via NEXT_PUBLIC_CDN_DOMAIN.
    // Falls back to the dev CloudFront domain for local builds.
    domains: [
      process.env.NEXT_PUBLIC_CDN_DOMAIN ?? "d144nqghu71795.cloudfront.net",
    ].filter(Boolean),
  },
  transpilePackages: ["../shared"],
};
export default nextConfig;
