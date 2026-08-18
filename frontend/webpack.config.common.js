const path = require("path");

const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const sveltePreprocess = require("svelte-preprocess");
const packageJson = require("./package.json");
const { execSync } = require("child_process");

const PROXY_PATHS = ["/app", "/archive", "/media", "/data"];

const createProxyConfig = (target) =>
    PROXY_PATHS.map((route) => ({
        context: [route],
        target,
        changeOrigin: true,
    }));

const getGitValue = (command, fallback = "unknown") => {
    try {
        return execSync(command, {
            cwd: __dirname,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch (err) {
        return fallback;
    }
};

const getGitInfo = () => ({
    branch: getGitValue("git branch --show-current"),
    hash: getGitValue("git rev-parse --short HEAD"),
    dirty: getGitValue("git status --porcelain --untracked-files=no", "")
        ? "dirty"
        : "clean",
});

class BuildVersionPlugin {
    apply(compiler) {
        const pluginName = "BuildVersionPlugin";

        compiler.hooks.compilation.tap(pluginName, (compilation) => {
            const { Compilation, sources } = compiler.webpack;

            compilation.hooks.processAssets.tap(
                {
                    name: pluginName,
                    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
                },
                (assets) => {
                    const buildEpoch = Date.now();
                    const version = packageJson.version;
                    const gitInfo = getGitInfo();
                    const banner = `Build version: ${version} - ${buildEpoch}`;

                    Object.keys(assets).forEach((assetName) => {
                        if (!/\.(js|css)$/.test(assetName)) {
                            return;
                        }

                        const asset = compilation.getAsset(assetName);
                        const source = asset.source.source().toString();
                        const commentPrefix = assetName.endsWith(".css")
                            ? `/** ${banner} **/ \n`
                            : `// ${banner}  \n`;
                        const nextSource =
                            commentPrefix +
                            source
                                .replaceAll("[AIV]{version}[/AIV]", version)
                                .replaceAll("[AIV]{date}[/AIV]", buildEpoch)
                                .replaceAll(
                                    "[AIV]{gitBranch}[/AIV]",
                                    gitInfo.branch
                                )
                                .replaceAll(
                                    "[AIV]{gitHash}[/AIV]",
                                    gitInfo.hash
                                )
                                .replaceAll(
                                    "[AIV]{gitDirty}[/AIV]",
                                    gitInfo.dirty
                                );

                        compilation.updateAsset(
                            assetName,
                            new sources.RawSource(nextSource)
                        );
                    });
                }
            );
        });
    }
}

module.exports = (cloudfrontTarget) => {
    const mode = process.env.NODE_ENV || "development";
    const prod = mode === "production";
    const plugins = [
        new BuildVersionPlugin(),
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
            process: "process/browser",
        }),
        new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css",
            chunkFilename: "[id].[contenthash].css",
        }),
        new HtmlWebpackPlugin({
            hash: false,
            template: "./src/index.ejs",
            filename: "./index.html",
        }),
    ];

    if (prod) {
        plugins.push(
            new WorkboxWebpackPlugin.InjectManifest({
                swSrc: "./src/src-sw.js",
                swDest: "sw-generated.js",
                maximumFileSizeToCacheInBytes: 10000000,
            })
        );
    }

    return {
        entry: {
            bundle: ["./src/main.js"],
        },
        resolve: {
            alias: {
                "process/browser": require.resolve("process/browser.js"),
                svelte: path.resolve("node_modules", "svelte"),
            },
            extensions: [".mjs", ".js", ".svelte"],
            mainFields: ["svelte", "browser", "module", "main"],
            conditionNames: ["svelte", "..."],
            modules: [path.resolve(__dirname, "node_modules"), "node_modules"],
            fallback: {
                buffer: require.resolve("buffer/"),
                crypto: require.resolve("crypto-browserify"),
                stream: require.resolve("stream-browserify"),
                url: require.resolve("url/"),
                util: require.resolve("util/"),
                vm: false,
            },
        },
        output: {
            path: path.resolve(__dirname, "public"),
            filename: "[name].[contenthash].js",
            chunkFilename: "bundle.[contenthash].js",
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
        performance: {
            // The application intentionally ships a shared vendor bundle. Keep a
            // meaningful ceiling instead of Webpack's generic 244 KiB default.
            maxAssetSize: 1024 * 1024,
            maxEntrypointSize: 1024 * 1024,
        },
        module: {
            rules: [
                {
                    test: /\.svelte$/,
                    use: {
                        loader: "svelte-loader",
                        options: {
                            preprocess: sveltePreprocess({
                                typescript: true,
                            }),
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
                            plugins: [
                                "@babel/plugin-proposal-class-properties",
                            ],
                        },
                    },
                },
            ],
        },
        devServer: {
            host: "0.0.0.0",
            server: "https",
            static: {
                directory: path.resolve(__dirname, "public"),
            },
            proxy: createProxyConfig(cloudfrontTarget),
        },
        watchOptions: {
            ignored: /node_modules/,
        },
        mode,
        plugins,
        devtool: prod ? false : "source-map",
    };
};
