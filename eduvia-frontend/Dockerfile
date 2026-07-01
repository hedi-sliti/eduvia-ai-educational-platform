FROM node:20-slim as build

WORKDIR /app

COPY package*.json ./
RUN npm install -g @angular/cli@18
RUN npm install

COPY . .

RUN ng build --configuration production --output-path=dist

FROM nginx:alpine
COPY --from=build /app/dist/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
