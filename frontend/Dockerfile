FROM node:20-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json .
RUN npm install

# Copy source
COPY . .

# Vite dev server with hot reload
CMD ["npm", "run", "dev"]