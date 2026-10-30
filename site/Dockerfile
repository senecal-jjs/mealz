# Build from the repo root (the site reads the app icon and privacy policy from there):
# `npm run deploy` in this folder does that. See README.md.
FROM node:24-slim AS build
WORKDIR /repo/site
COPY site/package.json site/package-lock.json ./
RUN npm ci
COPY site ./
COPY assets/images/icon.png /repo/assets/images/icon.png
COPY docs/privacy-policy.html /repo/docs/privacy-policy.html
RUN npm run build

FROM nginx:1.29-alpine
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/site/dist /usr/share/nginx/html
EXPOSE 8080
