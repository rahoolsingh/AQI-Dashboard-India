FROM node:22-alpine

WORKDIR /aqi-dashboard-india-backend

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]