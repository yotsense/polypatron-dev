FROM node:20-alpine

WORKDIR /app
COPY package.json /app/package.json
COPY next.config.js /app/next.config.js
RUN npm install

COPY app /app/app

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
