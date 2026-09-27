# Production image for the frontend (VPS): CRA/craco build served by nginx.
FROM node:20 AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 600000

COPY . .
# Public URL of the site (API is served under /api on the same domain). Baked in at build time.
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL} \
    GENERATE_SOURCEMAP=false \
    DISABLE_ESLINT_PLUGIN=true \
    CI=false
RUN test -n "$REACT_APP_BACKEND_URL" && yarn build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
