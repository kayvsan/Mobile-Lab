# Suggested Commands

Common commands for running and developing the project.

## Running Locally

### Frontend (`005-frontend`)
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint
```

### Backend (`004-backend`)
```bash
# Install requirements
pip install -r requirements.txt

# Start backend server
python run.py

# DB Migrations & setup
python migrate.py
python check_db.py
```

### Agent (`006-agent`)
```bash
# Run the agent daemon
python agent.py
```

## Running with Docker Compose (Production)
```bash
# Start all services (Postgres, Backend, Nginx/Frontend)
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down
```
