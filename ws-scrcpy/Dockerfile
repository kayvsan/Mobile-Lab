FROM node:18-bullseye-slim

WORKDIR /app

# Install system dependencies (build tools for native modules if any)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the frontend/backend
RUN npm run dist

EXPOSE 8000

# Start the application
CMD ["npm", "start"]
