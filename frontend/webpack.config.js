const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackAutoInject = require("webpack-auto-inject-version");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");

const path = require("path");

const mode = process.env.NODE_ENV || "development";
const prod = mode === "production";

module.exports = {
    entry: {
        bundle: ["./src/main.js"],
    },
    resolve: {
        alias: {
            svelte: path.resolve("node_modules", "svelte"),
        },
        extensions: [".mjs", ".js", ".svelte"],
        mainFields: ["svelte", "browser", "module", "main"],
    },
    output: {
        path: __dirname + "/public",
        filename: "[name].[contentHash].js",
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendors",
                    chunks: "all",
                },
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.svelte$/,
                use: {
                    loader: "svelte-loader",
                    options: {
                        onwarn: (warning, handleWarning) => {
                            if (warning.toString().includes("A11y")) {
                            } else {
                                handleWarning(warning);
                            }
                        },
                        emitCss: true,
                        hotReload: true,
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    /**
                     * MiniCssExtractPlugin doesn't support HMR.
                     * For developing, use 'style-loader' instead.
                     * */
                    prod ? MiniCssExtractPlugin.loader : "style-loader",
                    "css-loader",
                ],
            },
            {
                test: /EntityFactory\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                        plugins: ["@babel/plugin-proposal-class-properties"],
                    },
                },
            },
        ],
    },
    devServer: {
        host: "0.0.0.0",
        proxy: {
            "/app": {
                target:
                    "https://z24xykma0c.execute-api.us-east-2.amazonaws.com/test/",
                changeOrigin: true,
            },
            "/archive": {
                target: "https://d27962ihtc8hvf.cloudfront.net",
                changeOrigin: true,
            },
            "/media": {
                target: "https://d27962ihtc8hvf.cloudfront.net",
                changeOrigin: true,
            },
            "/data": {
                target: "https://d27962ihtc8hvf.cloudfront.net",
                changeOrigin: true,
            },
        },
    },
    mode,
    plugins: [
        new WebpackAutoInject({
            components: {
                AutoIncreaseVersion: false,
            },
        }),

        new MiniCssExtractPlugin({
            filename: "[name].[hash].css",
            chunkFilename: "[id].[hash].css",
        }),
        new HtmlWebpackPlugin({
            hash: false,
            template: "./src/index.ejs",
            filename: "./index.html",
        }),
        new WorkboxWebpackPlugin.GenerateSW({
            swDest: "./sw.js",
            maximumFileSizeToCacheInBytes: 10000000,
            //include: ["./global922a.css", "*.js"],
            //globPartial: [],
            runtimeCaching: [
                {
                    urlPattern: "*.css",
                    handler: {
                        strategyName: "StaleWhileRevalidate",
                    },
                },
                {
                    urlPattern: "*.js",
                    handler: {
                        strategyName: "StaleWhileRevalidate",
                    },
                },
                {
                    urlPattern: "*.html",
                    handler: {
                        strategyName: "StaleWhileRevalidate",
                    },
                },
            ],
        }),
    ],
    devtool: prod ? false : "source-map",
};
