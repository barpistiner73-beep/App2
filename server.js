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

      // GET /api/reports?traineeId=...&days=14&startDate=...&endDate=...
      if (pathname === '/api/reports' && method === 'GET') {
        const traineeId = parsedUrl.query.traineeId || 'client_1';
        const days = parsedUrl.query.days ? parseInt(parsedUrl.query.days, 10) : 14;
        const startDate = parsedUrl.query.startDate || null;
        const endDate = parsedUrl.query.endDate || null;

        const reports = db.getReports(traineeId, { days, startDate, endDate });
        return sendJson(res, 200, { success: true, traineeId, count: reports.length, reports });
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
