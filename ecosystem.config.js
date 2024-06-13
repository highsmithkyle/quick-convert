module.exports = {
    apps: [
      {
        name: 'slicerServer',
        script: 'slicerServer.js',
        env: {
          NODE_ENV: 'development',
          GOOGLE_APPLICATION_CREDENTIALS: '/home/kyle/quick-convert/secure/google-credentials.json',
          GOOGLE_UPLOAD_CREDENTIALS: '/home/kyle/quick-convert/secure/google-upload-credentials.json'
        },
        env_production: {
          NODE_ENV: 'production',
          GOOGLE_APPLICATION_CREDENTIALS: '/home/kyle/quick-convert/secure/google-credentials.json',
          GOOGLE_UPLOAD_CREDENTIALS: '/home/kyle/quick-convert/secure/google-upload-credentials.json'
        }
      }
    ]
  };
  