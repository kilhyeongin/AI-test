/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  async redirects() {
    return [
      // /home → /
      {
        source: "/home",
        destination: "/",
        permanent: true, // 301
      },
      // /home/... 또는 /home?mid=... 등 변형도 전부 /
      {
        source: "/home/:path*",
        destination: "/",
        permanent: true, // 301
      },
    ];
  },
};

module.exports = nextConfig;
