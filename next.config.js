/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@reown/appkit', '@reown/appkit-adapter-wagmi', 'wagmi', 'viem', '@wagmi/connectors'],
    webpack: (config) => {
        config.externals.push("pino-pretty", "lokijs", "encoding");
        config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
        // Fix for 'Can't resolve porto' and 'porto/internal' in @wagmi/connectors
        config.resolve.alias = {
            ...config.resolve.alias,
            'porto': false,
            'porto/internal': false,
            '@react-native-async-storage/async-storage': false,
        };
        return config;
    },
};

module.exports = nextConfig;
