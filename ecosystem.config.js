module.exports = {
  apps: [
    {
      name: "finflow-backend",
      script: "src/server.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        PORT: 4002,
        DATABASE_URL: "mysql://user:password@localhost:3306/finflow_db",
        JWT_SECRET: "finflow_jwt_secret_key_2026_xyz",
        JWT_REFRESH_SECRET: "finflow_jwt_refresh_secret_key_2026_abc"
      }
    }
  ]
};
