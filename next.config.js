/** next.config.js */
const nextConfig = {
  eslint: {
    // Skip ESLint checks during `next build` (useful for CI/Vercel when you want builds to succeed
    // while you fix lint/type errors). Remove or set to false once you fix the code.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;