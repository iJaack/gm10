/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
    reactStrictMode: true,
    webpack: (config) => {
        config.externals.push("pino-pretty", "lokijs", "encoding");
        config.plugins.push(
            new webpack.IgnorePlugin({
                resourceRegExp: /^porto\/internal$/,
            })
        );
        return config;
    },
};

module.exports = nextConfig;
