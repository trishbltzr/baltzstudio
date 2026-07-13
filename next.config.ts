import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lighthouse", "chrome-launcher", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
