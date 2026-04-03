FROM node:20-alpine

WORKDIR /app

# Configure npm to be more resilient
# Increase timeout and disable strict SSL if needed
RUN npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retries 5

COPY package*.json ./

# Install dependencies with legacy-peer-deps to avoid conflict errors
# and use --verbose to see progress if it hangs
RUN npm install --legacy-peer-deps --no-audit

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
