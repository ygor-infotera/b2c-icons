export default {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,  // Keep viewBox for proper scaling
          removeDimensions: true, // Remove width/height for flexibility
        },
      },
    },
    'removeDimensions',
    'removeXMLNS',
    {
      name: 'cleanupIds',
      params: {
        force: true,
        minify: true,
      },
    },
  ],
};
