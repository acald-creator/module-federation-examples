const CracoSwcPlugin = require('craco-swc')
const { dependencies } = require("./package.json")
const { ModuleFederationPlugin } = require('webpack').container

module.expots = {
    plugins: [
        { 
            plugin: CracoSwcPlugin,
            options: {
                swcLoaderOptions: {
                    jsx: {
                        parser: {
                            syntax: "typescript",
                            tsx: true,
                            dynamicImport: true,
                            exportDefaultForm: true,
                        },
                    }
                }
            }
        }
    ],
    webpack: {
        plugins: [
            new ModuleFederationPlugin({
                name: 'cloud',
                filename: 'remote.js',
                exposes: {
                    "./CloudButton": "./src/components/Button",
                },
                shared: {
                    ...dependencies,
                    '@stitches/react': {
                        singleton: true,
                    },
                    'react-dom': {
                        import: 'react-dom',
                        shareKey: 'react-dom',
                        shareScope: 'legacy',
                        singleton: true,
                    }
                }
            })
        ]
    }
}