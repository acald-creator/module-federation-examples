const path = require("path")
const { dependencies } = require("./package.json")
const ModuleFederationPlugin = require("webpack").container.ModuleFederationPlugin

const { override } = require("customize-cra")
const rewiredSWC = require('react-app-rewired-swc')

module.exports = function(config, env) {
    config.plugins.push(
        new ModuleFederationPlugin(
            (module.exports = {
                name: "remote",
                filename: "remote.js",
                exposes: {
                    "./Button": "./src/Button",
                },
                shared: {
                    ...dependencies,
                    "@stitches/react": {
                        singleton: true,
                    },
                    "react": {
                        singleton: true,
                        version: '0',
                        requiredVersion: false,
                        // requiredVersion: dependencies["react"]
                    },
                    "react-dom": {
                        singleton: true,
                        version: '0',
                        requiredVersion: false,
                        // requiredVersion: dependencies["react-dom"]
                    },
                },
            })
        )
    )
    config.output.publicPath = "auto"
    return Object.assign(
        config,
        override(
            rewiredSWC([
                path.resolve('src'),
                path.resolve('../dashboard/src/components'),
            ]),
        )(config, env)
    )
}