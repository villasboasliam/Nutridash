FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
#COPY env.production .env.local
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
