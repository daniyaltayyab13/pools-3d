import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      {
        // Applies correct USDZ header to files inside public/ar/
        // For our POC, this folder only contains AR model files.
        source: "/ar/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "model/vnd.usdz+zip",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
