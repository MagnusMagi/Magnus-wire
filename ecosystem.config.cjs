module.exports = {
  apps: [
    {
      name: "news",
      cwd: "/home/ubuntu/apps/news-app/.next/standalone",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3360",
        HOSTNAME: "127.0.0.1",
      },
      max_restarts: 10,
      autorestart: true,
    },
  ],
};
