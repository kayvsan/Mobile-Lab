# Tech Stack

Overview of technologies used in Mobile-Lab.

## Frontend (`005-frontend`)
- Framework: React (v19.2)
- Bundler/Dev Server: Vite (v8.0)
- CSS/Styling: TailwindCSS (v4.2), `@tailwindcss/vite`, Material UI (`@mui/material` v9)
- Router: React Router DOM (v7.1)
- HTTP Client: Axios
- Charts & Utils: Recharts, XLSX (excel export), Lucide React

## Backend (`004-backend`)
- Language: Python
- Framework: Flask
- ORM: Flask-SQLAlchemy
- DB Drivers: psycopg2-binary
- Auth: PyJWT, bcrypt

## Agent (`006-agent`)
- Language: Python
- Packages: adbutils, requests, python-dotenv

## Infrastructure
- Database: PostgreSQL (Postgres 16 Alpine containerized)
- Web Server & Reverse Proxy: Nginx
- Containerization: Docker Compose
