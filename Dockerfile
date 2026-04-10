# Stage 1: Build Frontend
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Create Backend & Serve
FROM node:18
WORKDIR /app

# Copy and install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# Copy backend source
COPY backend/ ./

# Copy built frontend from Stage 1 into the expected location
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 3001

CMD ["node", "server.js"]