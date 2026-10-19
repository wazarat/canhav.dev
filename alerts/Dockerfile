# The alerts worker (M123). Node 22, compiled with tsc, one long running
# process; no port is served, Fly keeps it up as a process group.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", "start"]
