const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-health-connect': path.resolve(__dirname, 'src/mocks/healthConnect.ts'),
      'react-native-geolocation-service': path.resolve(__dirname, 'src/mocks/geolocation.ts'),
      '@notifee/react-native': path.resolve(__dirname, 'src/mocks/notifee.ts'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/mocks/asyncStorage.ts'),
      '@react-navigation/native': path.resolve(__dirname, 'src/mocks/navigation.ts'),
      '@react-navigation/native-stack': path.resolve(__dirname, 'src/mocks/navigation.ts'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules\/(?!(react-native-web)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
            plugins: ['react-native-web'],
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    port: 3002,
    hot: true,
    open: true,
  },
  mode: 'development',
};
