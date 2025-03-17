FROM node:18-alpine
WORKDIR /src
COPY package*.json ./
COPY . .
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "start"]