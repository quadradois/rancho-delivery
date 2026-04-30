module.exports = {
  apps: [
    {
      name: 'rancho-backend',
      cwd: '/var/www/rancho-delivery/apps/backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3001',
      },
    },
    {
      name: 'rancho-frontend',
      cwd: '/var/www/rancho-delivery/apps/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
