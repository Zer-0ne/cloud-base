# Stage 1: Build Stage
FROM node:lts AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Fix TypeScript configuration to allow any types temporarily for build
RUN npm pkg set scripts.build="tsc --noImplicitAny && tsc-alias" || \
    echo 'WARN: could not modify build command, using original'

# Build the application
RUN npm run build

# Stage 2: Production Stage
FROM node:lts-slim

WORKDIR /app

# Copy only package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built files from builder stage (dist folder instead of src)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Environment configuration files if needed
COPY --from=builder /app/.env* ./

# Expose application port
EXPOSE 5000

# Start the application
# CMD ["npm", "run","dev:prisma"]
CMD ["npm", "start"]



# old 
# FROM node:lts

# # Step 2: Set the working directory inside the container
# WORKDIR /app

# # Step 3: Copy the package.json and package-lock.json files to the working directory
# COPY package*.json ./

# # Step 4: Install dependencies
# RUN npm install

# # Step 5: Copy the rest of the application files to the working directory
# COPY . .

# # Step 6: Expose port 5000
# EXPOSE 5000

# RUN npm run build

# # Step 7: Start the application
# # CMD ["npm", "run","dev:prisma"]
# CMD ["npm", "start",]