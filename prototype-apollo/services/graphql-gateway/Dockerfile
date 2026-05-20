FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
EXPOSE 5000
CMD ["npm", "start"]
