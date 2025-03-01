module.exports = function (config) {
  config.set({
    frameworks: ['browserify', 'mocha', 'chai'],
    files: [
      'test/**/*.test.js',
      {
        pattern: 'node_modules/dcmjs-codecs/build/dcmjs-native-codecs.wasm',
        included: false,
        watched: false,
        served: true,
      },
    ],
    preprocessors: {
      'test/**/*.test.js': 'browserify',
    },
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
  });
};
