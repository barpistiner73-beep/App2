/**
 * FitPulse Core Backend API & Web Server
 * Clean REST API with unified Authentication & Data Management.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
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

// Background auto-close task every 10 minutes
setInterval(() => {
  try {
    db.autoClosePastReports();
  } catch (err) {
    console.error('[Server] Auto-close background notice:', err.message);
  }
}, 10 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const query = parsedUrl.searchParams;
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- API Routes ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. POST /api/auth/login (Unified Email/Username Login)
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        const identifier = body.email || body.identifier || body.userId;
        const result = db.authenticate(identifier, body.password);
        if (result.error) {
          const status = result.code === 'account-rejected' || result.code === 'account-suspended' ? 403 : (result.isPending ? 403 : 401);
          return sendJson(res, status, { success: false, ...result });
        }
        return sendJson(res, 200, { success: true, user: result.user });
      }

      // 2. POST /api/auth/google (Google Authentication & Registration Workflow)
      if (pathname === '/api/auth/google' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = db.registerOrLoginGoogleUser(body);
        if (result.error) {
          const status = result.code === 'account-rejected' || result.code === 'account-suspended' ? 403 : 400;
          return sendJson(res, status, { success: false, ...result });
        }
        return sendJson(res, 200, { success: true, ...result });
      }

      // 3. GET /api/users (Admin: List Users)
      if (pathname === '/api/users' && method === 'GET') {
        const role = query.get('role') || 'all';
        const status = query.get('status') || 'all';
        const users = db.getUsers({ role, status });
        return sendJson(res, 200, { success: true, count: users.length, users });
      }

      // 4. GET /api/users/pending (Admin: Pending Registrations)
      if (pathname === '/api/users/pending' && method === 'GET') {
        const pendingUsers = db.getPendingApprovals();
        return sendJson(res, 200, { success: true, count: pendingUsers.length, pendingUsers, users: pendingUsers });
      }

      // 5. POST /api/users/approve (Admin: Approve User)
      if (pathname === '/api/users/approve' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId) return sendJson(res, 400, { success: false, error: 'userId is required' });
        const approved = db.approveUser(body.userId, body.managerId || 'system');
        return sendJson(res, 200, { success: true, user: approved });
      }

      // 6. POST /api/users/reject (Admin: Reject User)
      if (pathname === '/api/users/reject' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId) return sendJson(res, 400, { success: false, error: 'userId is required' });
        const rejected = db.rejectUser(body.userId, body.reason);
        return sendJson(res, 200, { success: true, user: rejected });
      }

      // 7. POST /api/users/status (Admin: Update Status - Suspend / Unsuspend)
      if (pathname === '/api/users/status' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId || !body.status) {
          return sendJson(res, 400, { success: false, error: 'userId and status are required' });
        }
        const validStatuses = ['active', 'pending_approval', 'suspended', 'rejected'];
        if (!validStatuses.includes(body.status)) {
          return sendJson(res, 400, { success: false, error: 'Invalid status value' });
        }
        try {
          const updated = db.setUserStatus(body.userId, body.status, body.managerId || 'system');
          return sendJson(res, 200, { success: true, user: updated });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // 8. POST /api/users/role (Admin: Change Role coach <-> trainee)
      if (pathname === '/api/users/role' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId || !body.role) {
          return sendJson(res, 400, { success: false, error: 'userId and role are required' });
        }
        const updated = db.setUserRole(body.userId, body.role, body.managerId || 'system');
        return sendJson(res, 200, { success: true, user: updated });
      }

      // 9. DELETE /api/users/:userId (Admin: Permanently Purge User)
      if (pathname.startsWith('/api/users/') && method === 'DELETE') {
        const targetUserId = pathname.slice('/api/users/'.length);
        if (!targetUserId) {
          return sendJson(res, 400, { success: false, error: 'userId is required' });
        }
        try {
          const deleted = db.deleteUser(targetUserId);
          return sendJson(res, 200, { success: true, user: deleted });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // 10. GET /api/users/status?userId=...
      if (pathname === '/api/users/status' && method === 'GET') {
        const identifier = query.get('userId') || query.get('email');
        if (!identifier) return sendJson(res, 400, { success: false, error: 'Missing userId or email' });
        const user = db.getUserByIdOrEmail(identifier);
        return sendJson(res, 200, { success: true, user });
      }

      // 10b. POST /api/users/register (Direct user registration/sync from client)
      if (pathname === '/api/users/register' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.email && !body.id && !body.userId) {
          return sendJson(res, 400, { success: false, error: 'User data required' });
        }
        const registered = db.registerUser(body);
        return sendJson(res, 200, { success: true, user: registered });
      }

      // --- Coach Discovery & Trainership APIs ---

      // GET /api/coaches (Public Coach Directory - strictly active coaches with isPublicVisible == true, no manager)
      if (pathname === '/api/coaches' && method === 'GET') {
        const coaches = db.getCoachPublicDirectory();
        return sendJson(res, 200, { success: true, count: coaches.length, coaches });
      }

      // POST /api/coach/visibility (Coach toggles public visibility)
      if (pathname === '/api/coach/visibility' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.userId) return sendJson(res, 400, { success: false, error: 'userId is required' });
        try {
          const updated = db.setCoachVisibility(body.userId, body.isPublicVisible);
          return sendJson(res, 200, { success: true, user: updated, isPublicVisible: updated.isPublicVisible });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // POST /api/coach/request (Trainee sends connection request to Coach)
      if (pathname === '/api/coach/request' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.coachId) {
          return sendJson(res, 400, { success: false, error: 'traineeId and coachId are required' });
        }
        try {
          const request = db.requestCoachConnection(body.traineeId, body.coachId, body.traineeName);
          return sendJson(res, 200, { success: true, request });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // POST /api/coach/respond (Coach responds to trainee connection request)
      if (pathname === '/api/coach/respond' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.requestId) return sendJson(res, 400, { success: false, error: 'requestId is required' });
        try {
          const result = db.respondCoachConnection(body.requestId, body.accept, body.coachName);
          return sendJson(res, 200, { success: true, request: result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // POST /api/coach/cancel-request (Trainee cancels pending request)
      if (pathname === '/api/coach/cancel-request' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId) return sendJson(res, 400, { success: false, error: 'traineeId is required' });
        const cancelled = db.cancelCoachConnectionRequest(body.traineeId);
        return sendJson(res, 200, { success: true, cancelled });
      }

      // POST /api/coach/terminate (Trainee or Coach ends relationship)
      if (pathname === '/api/coach/terminate' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId) return sendJson(res, 400, { success: false, error: 'traineeId is required' });
        const result = db.terminateTrainership(body.traineeId, body.coachId, body.initiatedBy || 'user');
        return sendJson(res, 200, { success: true, ...result });
      }

      // GET /api/coach/status?traineeId=... (Trainee's coach connection status)
      if (pathname === '/api/coach/status' && method === 'GET') {
        const traineeId = query.get('traineeId');
        if (!traineeId) return sendJson(res, 400, { success: false, error: 'traineeId is required' });
        const status = db.getTrainershipStatus(traineeId);
        return sendJson(res, 200, { success: true, ...status });
      }

      // GET /api/coach/trainees?coachId=... (Coach's active trainees and pending requests)
      if (pathname === '/api/coach/trainees' && method === 'GET') {
        const coachId = query.get('coachId');
        if (!coachId) return sendJson(res, 400, { success: false, error: 'coachId is required' });
        const data = db.getCoachTrainees(coachId);
        return sendJson(res, 200, { success: true, ...data });
      }

      // 11. Trainees & Roster
      if (pathname === '/api/trainees' && method === 'GET') {
        const trainees = db.getTrainees();
        return sendJson(res, 200, { success: true, count: trainees.length, trainees });
      }

      if (pathname === '/api/trainees/create' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.name) return sendJson(res, 400, { success: false, error: 'Trainee name is required' });
        const created = db.createTrainee(body);
        return sendJson(res, 201, { success: true, trainee: created });
      }

      // 12. Reports
      if (pathname === '/api/reports' && method === 'GET') {
        const traineeId = query.get('traineeId') || 'usr_trainee_real';
        const days = query.get('days') ? parseInt(query.get('days'), 10) : 14;
        const reports = db.getReports(traineeId, { days });
        return sendJson(res, 200, { success: true, traineeId, count: reports.length, reports });
      }

      if (pathname === '/api/reports/save' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.date) {
          return sendJson(res, 400, { success: false, error: 'Missing traineeId or date' });
        }
        const saved = db.saveReport(body);
        return sendJson(res, 200, { success: true, report: saved });
      }

      if (pathname === '/api/reports/finalize' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.date) {
          return sendJson(res, 400, { success: false, error: 'Missing traineeId or date' });
        }
        const finalized = db.finalizeReport(body.traineeId, body.date);
        return sendJson(res, 200, { success: true, report: finalized });
      }

      if (pathname === '/api/reports/feedback' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.traineeId || !body.date) {
          return sendJson(res, 400, { success: false, error: 'Missing traineeId or date' });
        }
        const updated = db.addCoachFeedback(body.traineeId, body.date, body);
        return sendJson(res, 200, { success: true, report: updated });
      }

      // 13. Foods Catalog
      if (pathname === '/api/foods' && method === 'GET') {
        const searchQuery = (query.get('query') || '').trim().toLowerCase();
        const category = query.get('category') || 'all';
        const catalogPath = path.join(__dirname, 'data', 'israeli_culinary_database', 'foods_catalog.json');
        let foodsList = [];
        try {
          if (fs.existsSync(catalogPath)) {
            foodsList = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
          }
        } catch (e) {}

        const filtered = foodsList.filter(food => {
          const catMatches = category === 'all' || food.category === category;
          if (!catMatches) return false;
          if (!searchQuery) return true;
          const searchable = [food.name, food.nameEn, food.brand, food.categoryName, ...(food.dietaryTags || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return searchable.includes(searchQuery);
        });

        return sendJson(res, 200, { success: true, count: filtered.length, foods: filtered });
      }

      // 14. System Status
      if (pathname === '/api/system/status' && method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          system: {
            status: 'online',
            environment: 'production',
            uptimeSeconds: Math.round(process.uptime()),
            nodeVersion: process.version,
            serverPort: PORT
          },
          database: {
            usersCount: db.data.users.length,
            traineesCount: db.data.trainees.length,
            reportsCount: Object.keys(db.data.dailyReports || {}).length
          },
          auditLogs: db.getAuditLogs(20)
        });
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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`FitPulse Unified Server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
