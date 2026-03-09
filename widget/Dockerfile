FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/widget.conf
COPY widget.js  /usr/share/nginx/html/widget.js
COPY widget.css /usr/share/nginx/html/widget.css

EXPOSE 3000

