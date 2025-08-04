# ==========================================
# SUPER BEES AI - PRODUCTION DEPLOYMENT
# Nigerian Creative Industry Backend
# ==========================================

# ==========================================
# 1. ENVIRONMENT VARIABLES (.env.production)
# ==========================================

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# AI API Keys
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Application Configuration
NODE_ENV=production
PORT=3000
DOMAIN=superbees.ai

# CORS Origins (production domains)
ALLOWED_ORIGINS=https://superbees.ai,https://www.superbees.ai,https://app.superbees.ai

# Nigerian Payment Integration (Future)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-your-key-here
FLUTTERWAVE_SECRET_KEY=FLWSECK-your-secret-here

# Monitoring & Analytics
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# ==========================================
# 2. PACKAGE.JSON
# ==========================================

cat > package.json << 'EOF'
{
  "name": "superbees-ai-backend",
  "version": "1.0.0",
  "description": "Super Bees AI Assistant Backend - Nigerian Creative Industry",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build step needed'",
    "test": "echo 'Tests not implemented yet'",
    "deploy": "vercel --prod",
    "setup-db": "node scripts/setup-database.js"
  },
  "keywords": ["ai", "creative", "nigeria", "design", "assistant"],
  "author": "Super Bees AI",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.26.0",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# ==========================================
# 3. VERCEL DEPLOYMENT CONFIG
# ==========================================

cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "superbees-ai-backend",
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
EOF

# ==========================================
# 4. DOCKER CONFIGURATION (Alternative)
# ==========================================

cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S superbees -u 1001

# Change ownership
RUN chown -R superbees:nodejs /app
USER superbees

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
EOF

# ==========================================
# 5. NGINX CONFIGURATION
# ==========================================

cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name superbees.ai www.superbees.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name superbees.ai www.superbees.ai;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/superbees.ai.crt;
    ssl_certificate_key /etc/ssl/private/superbees.ai.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

# ==========================================
# 6. DATABASE SETUP SCRIPT
# ==========================================

cat > scripts/setup-database.js << 'EOF'
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Super Bees AI database...');
    
    // Read SQL schema
    const schema = readFileSync(join(__dirname, '../schema.sql'), 'utf8');
    
    // Execute schema
    const { error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Database setup complete');
    console.log('🐝 Super Bees AI is ready for production!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
EOF

# ==========================================
# 7. MONITORING SETUP
# ==========================================

cat > scripts/monitor.js << 'EOF'
import fetch from 'node-fetch';

const ENDPOINTS = [
  'https://superbees.ai/api/health',
  'https://superbees.ai/api/chat'
];

async function healthCheck() {
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: endpoint.includes('chat') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.includes('chat') ? JSON.stringify({
          query: 'health check',
          userId: 'monitor'
        }) : undefined
      });
      
      const status = response.ok ? '✅' : '❌';
      console.log(`${status} ${endpoint}: ${response.status}`);
      
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

setInterval(healthCheck, 30000); // Every 30 seconds
healthCheck(); // Run immediately
EOF

# ==========================================
# 8. DEPLOYMENT COMMANDS
# ==========================================

echo "🐝 Super Bees AI Backend - Deployment Ready"
echo "==========================================="
echo ""
echo "1. Install dependencies:"
echo "   npm install"
echo ""
echo "2. Set up environment variables:"
echo "   cp .env.example .env.production"
echo "   # Edit .env.production with your actual keys"
echo ""
echo "3. Set up database:"
echo "   npm run setup-db"
echo ""
echo "4. Deploy to Vercel:"
echo "   npm run deploy"
echo ""
echo "5. Alternative - Docker deployment:"
echo "   docker build -t superbees-ai ."
echo "   docker run -p 3000:3000 --env-file .env.production superbees-ai"
echo ""
echo "6. Health check:"
echo "   curl https://superbees.ai/api/health"
echo ""
echo "✅ Your Super Bees AI backend is production-ready!"
echo "🇳🇬 Built for Nigerian creative professionals"