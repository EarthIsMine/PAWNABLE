module.exports = {
  apps: [
    {
      name: "pawnable-frontend",
      cwd: "./frontend",
      script: "pnpm",
      args: "start",
      env_file: "./frontend/.env",
    },
    {
      name: "pawnable-backend",
      cwd: "./backend",
      script: "pnpm",
      args: "start",
      env_file: "./backend/.env",
    },
  ],
};
