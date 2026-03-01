FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5001

# On start: run schema (drops/recreates tables), seed, then app. Set SKIP_SCHEMA_SEED=1 to skip schema+seed.
CMD ["sh", "-c", "if [ -z \"$SKIP_SCHEMA_SEED\" ]; then node scripts/run-schema.js && node scripts/seed.js; fi && exec node app.js"]
