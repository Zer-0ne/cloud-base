# # Stage 1: Build stage
# FROM node:18-alpine AS builder

# # Set the working directory
# WORKDIR /app

# # Copy package.json and package-lock.json
# COPY package.json package-lock.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of the application code
# COPY . .

# # Build the Next.js application
# RUN npm run build

# # Stage 2: Production stage
# FROM node:18-alpine AS runner

# WORKDIR /app

# # Set environment to production
# ENV NODE_ENV=production

# # Copy package.json and package-lock.json
# COPY package.json package-lock.json ./

# # Install only production dependencies
# RUN npm install --production

# # Copy built application from the builder stage
# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/next.config.ts ./

# # If you have any runtime configurations, copy them too
# # COPY --from=builder /app/config ./config

# # Expose the port the app runs on
# EXPOSE 3000

# # Start the application
# CMD ["npm", "start"]


# dev
# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install
# RUN npm run build
# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
# CMD ["npm", "run", "dev"]
CMD ["npm", "start"]