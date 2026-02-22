# Usamos Node 18 (igual que en tu ci.yml)
FROM node:18-slim

# Instalamos pnpm globalmente
RUN npm install -g pnpm@9

WORKDIR /app

# Copiamos archivos de configuración primero (para aprovechar la caché)
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY api/package.json ./api/
COPY client/package.json ./client/

# Instalamos con las mismas flags que el CI
# Usamos --no-frozen-lockfile porque el lock de tu Windows puede diferir del de Linux
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copiamos el resto del código
COPY . .

# Bypass para oxc-parser (el problema que teníamos)
ENV NUXT_SKIP_OXC=true

# Ejecutamos el Lint para ver si los errores de InMemoryUserRepository persisten
RUN pnpm --filter api run lint

# Ejecutamos el Build del cliente (que es lo que hacía explotar a oxc-parser)
RUN pnpm --filter client run build