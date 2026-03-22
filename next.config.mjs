/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-contents.weverseshop.io",
      },
    ],
  },
};

export default nextConfig;
