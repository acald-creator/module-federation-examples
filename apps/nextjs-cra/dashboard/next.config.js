const NextFederationPlugin = require('@module-federation/nextjs-mf')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config, options) {
    const { webpack } = options;
    Object.assign(config.experiments, { topLevelAwait: true });
    if (!options.isServer) {
      //config.cache=false
      config.plugins.push(
        new NextFederationPlugin({
          name: 'dashboard',
          remotes: {
            remote: 'remote@http://localhost:8081/remote.js',
            cloud: 'cloud@http://localhost:8082/remote.js',
          },
          filename: 'static/chunks/remoteEntry.js',
          exposes: {
            './newReact': require.resolve('react'),
            './newReactDOM': require.resolve('react-dom'),
          },
          shared: {
            'react': {
              import: 'react',
              shareKey: 'newReact',
              shareScope: 'default',
              singleton: true,
            }
          }
        }),
      );
    }
    return config;
  }
}

module.exports = nextConfig