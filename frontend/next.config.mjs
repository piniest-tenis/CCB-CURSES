/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // required for static export
    domains: ["d144nqghu71795.cloudfront.net"],
  },
  transpilePackages: ["../shared"],
};
export default nextConfig;
