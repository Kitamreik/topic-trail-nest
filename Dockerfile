# Multi-stage build for the Vite SPA.
# Stage 1: build static assets
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json* bun.lockb* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
