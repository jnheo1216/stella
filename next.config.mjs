/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=(self), gyroscope=(self), magnetometer=(self), geolocation=(self)'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
