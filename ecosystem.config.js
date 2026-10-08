const home = process.env.HOME + '/Mobile-Lab';

module.exports = {
  apps: [
    {
      name: 'apm-backend',
      cwd: `${home}/004-backend`,
      script: 'venv/bin/gunicorn',
      args: '--bind 0.0.0.0:5000 --workers 4 --threads 2 --timeout 600 --keep-alive 5 "app:create_app()"',
      interpreter: 'none',
      env: {
        DATABASE_URL: 'postgresql://apm_user:admin@127.0.0.1:5433/apm_db',
        SECRET_KEY: 'asdasakdfnsdfdas',
        WEBHOOK_API_KEY: 'asdasdasfdafdsfs',
        SERVER_PORT: '5000',
        ADB_SERVER_SOCKET: 'tcp:127.0.0.1:5037',
        PYTHON_EXE: `${home}/004-backend/venv/bin/python`,
      },
    }
  ],
};