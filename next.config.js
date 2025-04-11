/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5004/api/:path*',
      },
      {
        source: '/ws',
        destination: 'http://localhost:5004/ws',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
      zlib: false,
      http: false,
      https: false,
      buffer: false,
      util: false,
      url: false,
      querystring: false,
      assert: false,
      constants: false,
      dns: false,
      dgram: false,
      child_process: false,
      cluster: false,
      module: false,
      readline: false,
      repl: false,
      string_decoder: false,
      sys: false,
      vm: false,
      worker_threads: false,
    };
    return config;
  },
};

module.exports = nextConfig; 