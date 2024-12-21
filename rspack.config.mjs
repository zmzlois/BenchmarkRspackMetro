import { createRequire } from 'node:module';
import path from 'node:path';
import * as Repack from '@callstack/repack';
import TerserPlugin from 'terser-webpack-plugin';

const dirname = Repack.getDirname(import.meta.url);
const { resolve } = createRequire(import.meta.url);

/**
 * More documentation, installation, usage, motivation and differences with Metro is available at:
 * https://github.com/callstack/repack/blob/main/README.md
 *
 * The API documentation for the functions and plugins used in this file is available at:
 * https://re-pack.dev
 */

/**
 * Webpack configuration.
 * You can also export a static object or a function returning a Promise.
 *
 * @param env Environment options passed from either Webpack CLI or React Native Community CLI
 *            when running with `react-native start/bundle`.
 */
export default (env) => {
  const {
    mode = 'development',
    context = dirname,
    entry = './index.js',
    platform = process.env.PLATFORM,
    minimize = mode === 'production',
    devServer = undefined,
    bundleFilename = undefined,
    sourceMapFilename = undefined,
    assetsPath = undefined,
    reactNativePath = resolve('react-native'),
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }


  return {
    mode,
    devtool: false,
    context,
    entry,
    resolve: {
      ...Repack.getResolveOptions(platform),

    },
   
    output: {
      clean: true,
      hashFunction: 'xxhash64',
      path: path.join(dirname, 'build/generated', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: Repack.getPublicPath({ platform, devServer }),
      uniqueName: 'benchmark-rspack-metro',
    },
    /**
     * Configures optimization of the built bundle.
     */
    optimization: {
      /** Enables minification based on values passed from React Native Community CLI or from fallback. */
      minimize,
    
      chunkIds: 'named',
    },
    module: {
      /**
       * This rule will process all React Native related dependencies with Babel.
       * If you have a 3rd-party dependency that you need to transpile, you can add it to the
       * `include` list.
       *
       * You can also enable persistent caching with `cacheDirectory` - please refer to:
       * https://github.com/babel/babel-loader#options
       */
      rules: [
        Repack.REACT_NATIVE_LOADING_RULES,
        Repack.NODE_MODULES_LOADING_RULES,
        Repack.FLOW_TYPED_MODULES_LOADING_RULES,
       
        /**
         * Here you can adjust loader that will process your files.
         *
         * You can also enable persistent caching with `cacheDirectory` - please refer to:
         * https://github.com/babel/babel-loader#options
         */
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          type: 'javascript/auto',
          use: {
            loader: 'builtin:swc-loader',
              /** @type {import('@rspack/core').SwcLoaderOptions} */
              options: {
                env: {
                  targets: {
                    'react-native': '0.74',
                  },
                },
                jsc: {
                  externalHelpers: true,
                  transform: {
                    react: {
                      runtime: 'automatic',
                      development: mode === 'development',
                      refresh: mode === 'development' && Boolean(devServer),
                    },
                  },
                },
              },
          },
        },
          /** Run React Native codegen, required for utilizing new architecture 
          */

        Repack.REACT_NATIVE_CODEGEN_RULES,
        /**
         * This loader handles all static assets (images, video, audio and others), so that you can
         * use (reference) them inside your application.
         *
         * If you want to handle specific asset type manually, filter out the extension
         * from `ASSET_EXTENSIONS`, for example:
         * ```
         * Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
         * ```
         */
        {
          test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              inline: true,
            },
          },
        },
      ],
    },
    plugins: [
      /**
       * Configure other required and additional plugins to make the bundle
       * work in React Native and provide good development experience with
       * sensible defaults.
       *
       * `Repack.RepackPlugin` provides some degree of customization, but if you
       * need more control, you can replace `Repack.RepackPlugin` with plugins
       * from `Repack.plugins`.
       */
      new Repack.RepackPlugin({
        context,
        mode,
        platform,
        devServer,
        output: {
          bundleFilename,
          sourceMapFilename,
          assetsPath,
        },
      }),
    ],
  };
};
