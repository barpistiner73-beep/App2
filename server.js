const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./database');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Background task: Auto-close past open daily reports every 10 minutes
setInterval(() => {
  try {
    db.autoClosePastReports();
  } catch (err) {
    console.error('[Server] Auto-close background error:', err.message);
  }
}, 10 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- API Routes ---
  if (pathname.startsWith('/api/')) {
    try {
      // GET /api/trainees
      if (pathname === '/api/trainees' && method === 'GET') {
        const trainees = db.getTrainees();
        return sendJson(res, 200, { success: true, trainees });
      }

      // POST /api/trainees/create (Coach registers a new trainee)
      if (pathname === '/api/trainees/create' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.name) {
          return sendJson(res, 400, { success: false, error: 'Trainee name is required' });
        }
        const created = db.createTrainee(body);
        return sendJson(res, 201, { success: true, trainee: created });
      }

      // --- User & Pending Approval API Routes ---
      // GET /api/users/pending (Fetch all pending trainer & trainee approvals)
      if (pathname === '/api/users/pending' && method === 'GET') {
        const pendingUsers = db.getPendingApprovals();
        return sendJson(res, 200, { success: true, count: pendingUsers.length, pendingUsers });
      }

      // GET /api/users/status?userId=...&email=... (User checking approval status)
      if (pathname === '/api/users/status' && method === 'GET') {
        const identifier = parsedUrl.query.userId || parsedUrl.query.email;
        if (!identifier) {
          return sendJson(res, 400, { success: false, error: 'Missing userId or email' });
        }
        const user = db.getUserByIdOrEmail(identifier);
        return sendJson(res, 200, { success: true, user });
      }

      // POST /api/users/register (Submit registration for manager approval)
      if (pathname === '/api/users/register' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.email && !body.userId && !body.id) {
          return sendJson(res, 400, { success: false, error: 'User identifier or email required' });
        }
        const user = db.registerUser(body);
        return sendJson(res, 201, { success: true, user });
      }

      // POST /api/users/approve (Manager approves trainer or trainee)
      if (pathname === '/api/users/approve' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId) {
          return sendJson(res, 400, { success: false, error: 'userId is required' });
        }
        const approved = db.approveUser(body.userId, body.managerId || 'usr_mgr');
        return sendJson(res, 200, { success: true, user: approved });
      }

      // POST /api/users/reject (Manager rejects user)
      if (pathname === '/api/users/reject' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId) {
          return sendJson(res, 400, { success: false, error: 'userId is required' });
        }
        const rejected = db.rejectUser(body.userId, body.reason);
        return sendJson(res, 200, { success: true, user: rejected });
      }

      // GET /api/users (Manager user directory)
      if (pathname === '/api/users' && method === 'GET') {
        const role = parsedUrl.query.role || null;
        const status = parsedUrl.query.status || null;
        const users = db.getUsers({ role, status });
        return sendJson(res, 200, { success: true, users });
      }

      // GET /api/system/status (App Manager system & Firebase monitor)
      if (pathname === '/api/system/status' && method === 'GET') {
        const trainees = db.getTrainees();
        const reportsCount = Object.keys(db.data.dailyReports || {}).length;
        const auditLogs = db.getAuditLogs(30);
        return sendJson(res, 200, {
          success: true,
          system: {
            status: 'online',
            environment: 'production',
            uptimeSeconds: Math.round(process.uptime()),
            nodeVersion: process.version,
            serverPort: PORT
          },
          firebase: {
            projectId: 'fitnessnutritionapp-ab381',
            region: 'me-west1 (Tel Aviv)',
            firestoreStatus: 'connected',
            authStatus: 'active',
            authProviders: ['emailPassword', 'googleSignIn'],
            hostingUrl: 'https://fitnessnutritionapp-ab381.web.app'
          },
          database: {
            traineesCount: trainees.length,
            totalReportsLogged: reportsCount,
            storageType: 'per-trainee-folders',
            storagePath: 'data/trainees/'
          },
          auditLogs
        });
      }

      // POST /api/system/log (Client logs an activity)
      if (pathname === '/api/system/log' && method === 'POST') {
        const body = await parseJsonBody(req);
        const log = db.logActivity(body.type || 'INFO', body.description || '', body.meta || {});
        return sendJson(res, 200, { success: true, log });
      }

      // GET /api/reports?traineeId=...&days=14&startDate=...&endDate=...
      if (pathname === '/api/reports' && method === 'GET') {
        const traineeId = parsedUrl.query.traineeId || 'client_1';
        const days = parsedUrl.query.days ? parseInt(parsedUrl.query.days, 10) : 14;
        const startDate = parsedUrl.query.startDate || null;
        const endDate = parsedUrl.query.endDate || null;

        const reports = db.getReports(traineeId, { days, startDate, endDate });
        return sendJson(res, 200, { success: true, traineeId, count: reports.length, reports });
      }

      // GET /api/reports/monthly?traineeId=...&month=YYYY-MM
      if (pathname === '/api/reports/monthly' && method === 'GET') {
        const traineeId = parsedUrl.query.traineeId || 'client_1';
        const month = parsedUrl.query.month || new Date().toISOString().substring(0, 7);
        const monthData = db.getMonthlyReports(traineeId, month);
        return sendJson(res, 200, { success: true, ...monthData });
      }

      // GET /api/trainees/:traineeId/stats
      const statsMatch = pathname.match(/^\/api\/trainees\/([a-zA-Z0-9_\-]+)\/stats$/);
      if (statsMatch && method === 'GET') {
        const traineeId = statsMatch[1];
        const stats = db.getTraineeStats(traineeId);
        if (!stats) {
          return sendJson(res, 404, { success: false, error: 'Stats not found for trainee' });
        }
        return sendJson(res, 200, { success: true, stats });
      }

      // GET /api/reports/:traineeId/:date
      const reportMatch = pathname.match(/^\/api\/reports\/([a-zA-Z0-9_\-]+)\/([0-9]{4}-[0-9]{2}-[0-9]{2})$/);
      if (reportMatch && method === 'GET') {
        const traineeId = reportMatch[1];
        const date = reportMatch[2];
        const report = db.getReport(traineeId, date);
        if (!report) {
          return sendJson(res, 404, { success: false, error: 'Report not found' });
        }
        return sendJson(res, 200, { success: true, report });
      }

      // POST /api/reports/save (Auto-save / draft update)
      if (pathname === '/api/reports/save' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.date) {
          return sendJson(res, 400, { success: false, error: 'Missing traineeId or date' });
        }
        const saved = db.saveReport(body);
        return sendJson(res, 200, { success: true, report: saved });
      }

      // POST /api/reports/finalize (Manual end-of-day submit)
      if (pathname === '/api/reports/finalize' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.date) {
          return sendJson(res, 400, { success: false, error: 'Missing traineeId or date' });
        }
        const finalized = db.finalizeReport(body.traineeId, body.date);
        return sendJson(res, 200, { success: true, report: finalized });
      }

      // POST /api/reports/feedback (Coach feedback)
      if (pathname === '/api/reports/feedback' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.date) {
          return sendJson(res, 400, { success: false, error: 'Missing traineeId or date' });
        }
        const updated = db.addCoachFeedback(body.traineeId, body.date, body);
        return sendJson(res, 200, { success: true, report: updated });
      }

      // POST /api/auto-close
      if (pathname === '/api/auto-close' && method === 'POST') {
        db.autoClosePastReports();
        return sendJson(res, 200, { success: true, message: 'Past reports auto-closed successfully' });
      }

      // --- Israeli Culinary & Food Database Endpoints ---
      // GET /api/foods?query=...&category=...
      if (pathname === '/api/foods' && method === 'GET') {
        const query = (parsedUrl.query.query || '').trim().toLowerCase();
        const category = parsedUrl.query.category || 'all';
        const catalogPath = path.join(__dirname, 'data', 'israeli_culinary_database', 'foods_catalog.json');
        let foodsList = [];
        try {
          if (fs.existsSync(catalogPath)) {
            foodsList = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
          }
        } catch (e) {
          console.error('[Server Foods API] Error loading catalog:', e.message);
        }

        const filtered = foodsList.filter(food => {
          const catMatches = category === 'all' || food.category === category;
          if (!catMatches) return false;
          if (!query) return true;
          const searchable = [food.name, food.nameEn, food.brand, food.categoryName, ...(food.dietaryTags || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return searchable.includes(query);
        });

        return sendJson(res, 200, { success: true, count: filtered.length, totalCatalog: foodsList.length, foods: filtered });
      }

      // POST /api/foods (Add new food item)
      if (pathname === '/api/foods' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.name || body.calories === undefined) {
          return sendJson(res, 400, { success: false, error: 'Food name and calories are required' });
        }
        const catalogPath = path.join(__dirname, 'data', 'israeli_culinary_database', 'foods_catalog.json');
        let foodsList = [];
        try {
          if (fs.existsSync(catalogPath)) {
            foodsList = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
          }
        } catch (e) {}

        const newFood = {
          id: body.id || `il_custom_${Date.now()}`,
          name: body.name,
          nameEn: body.nameEn || '',
          brand: body.brand || '',
          category: body.category || 'supermarket_staples',
          categoryName: body.categoryName || '',
          unitName: body.unitName || '100 גרם',
          defaultGrams: Number(body.defaultGrams || 100),
          calories: Number(body.calories || 0),
          protein: Number(body.protein || 0),
          carbs: Number(body.carbs || 0),
          fat: Number(body.fat || 0),
          fiber: Number(body.fiber || 0),
          sodium: Number(body.sodium || 0),
          sugar: Number(body.sugar || 0),
          dietaryTags: Array.isArray(body.dietaryTags) ? body.dietaryTags : (body.tags || []),
          locationType: body.locationType || '',
          region: body.region || '',
          address: body.address || '',
          verified: Boolean(body.verified),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const existingIdx = foodsList.findIndex(f => f.id === newFood.id);
        if (existingIdx >= 0) foodsList[existingIdx] = newFood;
        else foodsList.unshift(newFood);

        fs.writeFileSync(catalogPath, JSON.stringify(foodsList, null, 2), 'utf8');
        return sendJson(res, 201, { success: true, food: newFood });
      }

      return sendJson(res, 404, { success: false, error: 'API endpoint not found' });
    } catch (err) {
      console.error('[Server API Error]', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --- Static File Serving ---
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safeSuffix = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safeSuffix);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`FitPulse server with Daily Reports API running at http://localhost:${PORT}`);
});
