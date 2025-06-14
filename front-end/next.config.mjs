/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bytechef/embedded-react'],
  experimental: {
    esmExternals: 'loose'
  }
};

export default nextConfig;
