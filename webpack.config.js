import path from 'path';
import nodeExternals from 'webpack-node-externals';

export default {
  entry: './server.js',
  output: {
    path: path.resolve(process.cwd(), 'build'),
    filename: 'index.cjs',
    clean: true
  },
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  mode: 'production'
};