const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackAutoInject = require("webpack-auto-inject-version");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");

const PROXY_PATHS = ["/app", "/archive", "/media", "/data"];

const createProxyConfig = (target) =>
    PROXY_PATHS.reduce((proxy, route) => {
        proxy[route] = {
            target,
            changeOrigin: true,
        };
        return proxy;
    }, {});

module.exports = (cloudfrontTarget) => {
    const mode = process.env.NODE_ENV || "development";
    const prod = mode === "production";

    return {
        entry: {
            bundle: ["./src/main.js"],
        },
        resolve: {
            alias: {
                svelte: path.resolve("node_modules", "svelte"),
            },
            extensions: [".mjs", ".js", ".svelte"],
            mainFields: ["svelte", "browser", "module", "main"],
            modules: [path.resolve(__dirname, "node_modules"), "node_modules"],
        },
        output: {
            path: path.resolve(__dirname, "public"),
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
                                if (!warning.toString().includes("A11y")) {
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
            proxy: createProxyConfig(cloudfrontTarget),
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
            new WorkboxWebpackPlugin.InjectManifest({
                swSrc: "./src/src-sw.js",
                swDest: "sw-generated.js",
                maximumFileSizeToCacheInBytes: 10000000,
            }),
        ],
        devtool: prod ? false : "source-map",
    };
};
