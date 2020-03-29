const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackAutoInject = require('webpack-auto-inject-version');

const path = require('path');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';


module.exports = {

	entry: {
		bundle: ['./src/main.js']
	},
	resolve: {
		alias: {
			svelte: path.resolve('node_modules', 'svelte')
		},
		extensions: ['.mjs', '.js', '.svelte'],
		mainFields: ['svelte', 'browser', 'module', 'main']
	},
	output: {
		path: __dirname + '/public',
		filename: '[name].[contentHash].js'
	},
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
	module: {
		rules: [
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						emitCss: true,
						hotReload: true
					}
				}
			},
			{
				test: /\.css$/,
				use: [
					/**
					 * MiniCssExtractPlugin doesn't support HMR.
					 * For developing, use 'style-loader' instead.
					 * */
					prod ? MiniCssExtractPlugin.loader : 'style-loader',
					'css-loader'
				]
			},
			{
				test: /EntityFactory\.m?js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
				  loader: 'babel-loader',
				  options: {
					presets: ['@babel/preset-env'],
					plugins: ["@babel/plugin-proposal-class-properties"]

				  }
				}
			  }
		]
	},
	devServer: {
		proxy: {
		  '/app': {
			  target:'https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test',
			  changeOrigin: true
		  }
		}
	  },
	mode,
	plugins: [
		new WebpackAutoInject({
		   components: {
			AutoIncreaseVersion: false
		    }
		}),

		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		new HtmlWebpackPlugin({
			hash: false,
			template: './src/index.ejs',
			filename: './index.html'
		}),
	],
	devtool: prod ? false: 'source-map'
};
