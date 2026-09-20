# Use official Node.js runtime (Alpine for lightweight production image)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose backend port (standard 5000)
EXPOSE 5000

# Set production environment default
ENV NODE_ENV=production

# Run the Express + Socket.IO server
CMD ["node", "server.js"]
