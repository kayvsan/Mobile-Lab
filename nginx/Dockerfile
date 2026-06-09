# ── Stage 1: Build React App ──
FROM node:20-alpine AS builder

WORKDIR /app
COPY 005-frontend/package*.json ./
RUN npm ci
COPY 005-frontend/ ./

# Build with production API URL
ENV VITE_API_URL=/api
RUN npm run build

# ── Stage 2: Serve with Nginx ──
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
