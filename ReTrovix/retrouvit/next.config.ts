import type { NextConfig } from "next";
import { networkInterfaces } from "os";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// Dynamically detect all local network IPs so the app is accessible from any device on the LAN
// Note: allowedDevOrigins expects hostnames/IPs, not full URLs
function getLocalNetworkOrigins(): string[] {
  const origins: string[] = [
    "localhost",
    "127.0.0.1",
  ];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        origins.push(net.address);
      }
    }
  }
  return origins;
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow access from any device on the local network
  allowedDevOrigins: getLocalNetworkOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "videos.pexels.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Service worker must be served with proper headers
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        // Manifest must not be cached
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${BACKEND_URL}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
