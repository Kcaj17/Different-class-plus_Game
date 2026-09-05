require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const { isAIEnabled } = require('./aiEngine');
const { ROLE_TEMPLATES, ROUNDS_DATA } = require('./src/constants/gameData');
const { calculateLorenzAndGini, evaluateFinalResults } = require('./src/engine/economicsEngine');
const { resolvePlayerDndRoll, processDistrictSettlement } = require('./src/engine/settlementEngine');
const {
  rooms,
  generateRoomCode,
  createDistrictRoom,
  createCustomDistrict,
  quickJoinMaster,
  getNationalAggregates,
  finalizeDistrictsAndBots,
  MASTER_SESSION_CODE
} = require('./src/services/roomManager');
const { registerSocketHandlers } = require('./src/socket/socketHandlers');
const { verifyAdminPin, createRateLimiter } = require('./src/utils/security');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Security: Disable technology disclosure
app.disable('x-powered-by');

// Security: HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Security: In-Memory API Rate Limiter (Max 60 requests per minute per IP)
const apiRateLimiter = createRateLimiter(60000, 60);
app.use('/api/', (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'client';
  const status = apiRateLimiter(clientIp);
  if (!status.allowed) {
    return res.status(429).json({
      error: 'ขออภัย คุณส่งคำขอถี่เกินไป กรุณารอสักครู่ (Rate limit reached)',
      retryAfterMs: status.retryAfterMs
    });
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));
app.use(express.json());

// Port configuration with fallback
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3005;

// Helper: Get active Local Wi-Fi / LAN IPv4 Address
function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // Prioritize Wi-Fi and Ethernet subnets (192.168.0.x, 192.168.1.x, 10.x.x.x)
        if (net.address.startsWith('192.168.') && !net.address.startsWith('192.168.56.')) {
          return net.address;
        }
        candidates.push(net.address);
      }
    }
  }
  return candidates[0] || 'localhost';
}

// API: Get Server Info & Real QR Code Data URL
app.get('/api/server-info', async (req, res) => {
  const localIp = getLocalIpAddress();
  const host = req.headers['x-forwarded-host'] || req.headers.host || `${localIp}:${DEFAULT_PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';

  let mobileScanUrl;
  if (process.env.PUBLIC_URL) {
    mobileScanUrl = `${process.env.PUBLIC_URL.replace(/\/$/, '')}/?view=player`;
  } else if (!host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    mobileScanUrl = `${protocol}://${host}/?view=player`;
  } else {
    mobileScanUrl = `${protocol}://${localIp}:${DEFAULT_PORT}/?view=player`;
  }

  // Allow custom URL query override
  const targetUrl = req.query.url || mobileScanUrl;

  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: '#0b0f17',
        light: '#ffffff'
      }
    });

    res.json({
      localIp,
      port: DEFAULT_PORT,
      targetUrl,
      mobileScanUrl,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Verify Master Screen Admin PIN
app.post('/api/verify-admin', (req, res) => {
  const { pin } = req.body || {};
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ success: false, error: 'กรุณากรอกรหัส PIN' });
  }

  if (verifyAdminPin(pin)) {
    return res.json({ success: true, message: 'ยืนยันสิทธิ์ผู้ดูแลระบบสำเร็จ' });
  }

  return res.status(401).json({ success: false, error: 'รหัส PIN ไม่ถูกต้อง' });
});

// Register all Socket.IO Realtime Handlers
registerSocketHandlers(io, rooms, { getLocalIpAddress, QRCode, DEFAULT_PORT, verifyAdminPin });

if (require.main === module) {
  server.listen(DEFAULT_PORT, () => {
    const localIp = getLocalIpAddress();
    console.log(`=======================================================`);
    console.log(` ⚔️  D&D Economic Chronicles: ไทยช่วยไทยพลัส 60/40  ⚔️`);
    console.log(` Localhost URL: http://localhost:${DEFAULT_PORT}`);
    console.log(` 📶 Wi-Fi / LAN URL (สำหรับมือถือ): http://${localIp}:${DEFAULT_PORT}/?view=player`);
    console.log(` 🖥️  Master Screen: http://localhost:${DEFAULT_PORT}/?view=master`);
    console.log(` 📱 Mobile Player Quick Join: http://${localIp}:${DEFAULT_PORT}/?view=player`);
    console.log(` 🗺️  Districts: Dynamic On-Demand Architecture`);
    console.log(` 🤖 AI Dungeon Master: ${isAIEnabled() ? '✅ ENABLED (Gemini 3.7 Flash)' : '⚠️  FALLBACK (Dynamic Lore Templates)'}`);
    console.log(`=======================================================`);
  });
}

module.exports = {
  app,
  server,
  io,
  rooms,
  ROLE_TEMPLATES,
  ROUNDS_DATA,
  calculateLorenzAndGini,
  evaluateFinalResults,
  resolvePlayerDndRoll,
  processDistrictSettlement,
  generateRoomCode,
  createDistrictRoom,
  createCustomDistrict,
  quickJoinMaster,
  getNationalAggregates,
  finalizeDistrictsAndBots,
  getLocalIpAddress,
  MASTER_SESSION_CODE
};
