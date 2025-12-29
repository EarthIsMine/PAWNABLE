import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: [
    "http://yt4307.mooo.com:3000",
    "http://localhost:3000",
    "http://192.168.0.44:3000",
    "http://192.168.0.99:3000",
  ],
};

export default withNextIntl(nextConfig);
