import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lighthouse", "chrome-launcher", "puppeteer-core", "@sparticuz/chromium"],
};

export default withWorkflow(nextConfig);
