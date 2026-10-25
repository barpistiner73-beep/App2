const assert = require('assert');
const { Readable } = require('stream');
const server = require('../server');
const db = require('../database');

function callRoute(method, url, body = null) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const req = new Readable({
      read() {
        if (bodyStr) this.push(bodyStr);
        this.push(null);
      }
    });

    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'host': 'localhost:3000',
      ...(bodyStr ? { 'content-length': Buffer.byteLength(bodyStr).toString() } : {})
    };

    let statusCode = 200;
    let headers = {};
    let chunks = [];

    const res = {
      writeHead(code, h = {}) {
        statusCode = code;
        headers = { ...headers, ...h };
      },
      setHeader(k, v) { headers[k] = v; },
      getHeader(k) { return headers[k]; },
      write(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const json = raw ? JSON.parse(raw) : null;
          resolve({ status: statusCode, body: json, raw });
        } catch (e) {
          resolve({ status: statusCode, body: null, raw });
        }
      }
    };

    server.emit('request', req, res);
  });
}

async function runTests() {
  console.log('--- In-Process Native Server API Route Verification ---');

  // 1. System status
  const sys = await callRoute('GET', '/api/system/status');
  assert.strictEqual(sys.status, 200);
  assert.strictEqual(sys.body.system.status, 'online');
  console.log('✓ GET /api/system/status online.');

  // 2. Auth login: manager
  const mgr = await callRoute('POST', '/api/auth/login', {
    identifier: 'manager@fitpulse.com',
    password: 'ManagerPass123!'
  });
  assert.strictEqual(mgr.status, 200);
  assert.strictEqual(mgr.body.success, true);
  assert.strictEqual(mgr.body.user.role, 'manager');
  console.log('✓ POST /api/auth/login (manager) succeeded.');

  // 3. Auth login: coach
  const coach = await callRoute('POST', '/api/auth/login', {
    identifier: 'coach.real@fitpulse.com',
    password: 'TrainerPass123!'
  });
  assert.strictEqual(coach.status, 200);
  assert.strictEqual(coach.body.success, true);
  assert.strictEqual(coach.body.user.role, 'coach');
  console.log('✓ POST /api/auth/login (coach) succeeded.');

  // 4. Auth login: trainee
  const trainee = await callRoute('POST', '/api/auth/login', {
    identifier: 'trainee.real@fitpulse.com',
    password: 'TraineePass123!'
  });
  assert.strictEqual(trainee.status, 200);
  assert.strictEqual(trainee.body.success, true);
  assert.strictEqual(trainee.body.user.role, 'trainee');
  console.log('✓ POST /api/auth/login (trainee) succeeded.');

  // 5. Auth google: new user
  const gUser = await callRoute('POST', '/api/auth/google', {
    uid: 'google_user_route_test',
    email: 'googleroutetest@gmail.com',
    displayName: 'בודק מסלול גוגל'
  });
  assert.strictEqual(gUser.status, 200);
  assert.strictEqual(gUser.body.isPending, true);
  assert.strictEqual(gUser.body.user.status, 'pending_approval');
  console.log('✓ POST /api/auth/google auto-registered pending user.');

  // 6. List pending
  const pending = await callRoute('GET', '/api/users/pending');
  assert.strictEqual(pending.status, 200);
  assert.ok(pending.body.users.some(u => u.id === 'google_user_route_test'));
  console.log('✓ GET /api/users/pending returns pending users.');

  // 7. Approve user
  const approve = await callRoute('POST', '/api/users/approve', { userId: 'google_user_route_test' });
  assert.strictEqual(approve.status, 200);
  assert.strictEqual(approve.body.user.status, 'active');
  console.log('✓ POST /api/users/approve works.');

  // 8. Suspend user
  const suspend = await callRoute('POST', '/api/users/status', { userId: 'google_user_route_test', status: 'suspended' });
  assert.strictEqual(suspend.status, 200);
  assert.strictEqual(suspend.body.user.status, 'suspended');
  console.log('✓ POST /api/users/status (suspended) works.');

  // 9. Attempt login for suspended user
  const suspLogin = await callRoute('POST', '/api/auth/login', { identifier: 'googleroutetest@gmail.com' });
  assert.strictEqual(suspLogin.status, 403);
  console.log('✓ Suspended user login returns 403.');

  // 10. Unsuspend user -> resets to pending_approval
  const unsuspend = await callRoute('POST', '/api/users/status', { userId: 'google_user_route_test', status: 'pending_approval' });
  assert.strictEqual(unsuspend.status, 200);
  assert.strictEqual(unsuspend.body.user.status, 'pending_approval');
  console.log('✓ Unsuspend resets to pending_approval.');

  // 11. Reject user
  const reject = await callRoute('POST', '/api/users/reject', { userId: 'google_user_route_test' });
  assert.strictEqual(reject.status, 200);
  assert.strictEqual(reject.body.user.status, 'rejected');
  console.log('✓ POST /api/users/reject works.');

  // 12. Attempt login for rejected user
  const rejLogin = await callRoute('POST', '/api/auth/login', { identifier: 'googleroutetest@gmail.com' });
  assert.strictEqual(rejLogin.status, 403);
  console.log('✓ Rejected user login returns 403.');

  // 13. Permanently delete user
  const del = await callRoute('DELETE', '/api/users/google_user_route_test');
  assert.strictEqual(del.status, 200);
  console.log('✓ DELETE /api/users/:userId permanently deletes user.');

  // 14. Cannot delete or suspend special users
  const delMgr = await callRoute('DELETE', '/api/users/usr_mgr');
  assert.strictEqual(delMgr.status, 400);

  const suspCoach = await callRoute('POST', '/api/users/status', { userId: 'usr_coach_real', status: 'suspended' });
  assert.strictEqual(suspCoach.status, 400);
  console.log('✓ Special users protection enforced across endpoints.');

  // 15. Coach Directory & Visibility API
  const coachesRes = await callRoute('GET', '/api/coaches');
  assert.strictEqual(coachesRes.status, 200);
  assert.ok(coachesRes.body.coaches.every(c => c.role === 'coach' && c.isPublicVisible === true && c.role !== 'manager'));
  console.log('✓ GET /api/coaches returns only visible coaches without manager.');

  // Toggle coach visibility off and on
  const visOff = await callRoute('POST', '/api/coach/visibility', { userId: 'usr_coach_real', isPublicVisible: false });
  assert.strictEqual(visOff.status, 200);
  assert.strictEqual(visOff.body.isPublicVisible, false);

  const coachesEmpty = await callRoute('GET', '/api/coaches');
  assert.strictEqual(coachesEmpty.body.coaches.length, 0);

  const visOn = await callRoute('POST', '/api/coach/visibility', { userId: 'usr_coach_real', isPublicVisible: true });
  assert.strictEqual(visOn.status, 200);
  assert.strictEqual(visOn.body.isPublicVisible, true);
  console.log('✓ POST /api/coach/visibility toggles public directory visibility.');

  // 16. Coach Connection Request & Response
  const reqRes = await callRoute('POST', '/api/coach/request', {
    traineeId: 'usr_trainee_real',
    coachId: 'usr_coach_real',
    traineeName: 'מתאמן (חשבון אמת)'
  });
  assert.strictEqual(reqRes.status, 200);
  assert.strictEqual(reqRes.body.request.status, 'pending');

  const statusPending = await callRoute('GET', '/api/coach/status?traineeId=usr_trainee_real');
  assert.strictEqual(statusPending.body.hasCoach, false);
  assert.strictEqual(statusPending.body.status, 'pending');

  // Accept request
  const respRes = await callRoute('POST', '/api/coach/respond', {
    requestId: reqRes.body.request.id,
    accept: true,
    coachName: 'מאמן (חשבון אמת)'
  });
  assert.strictEqual(respRes.status, 200);
  assert.strictEqual(respRes.body.request.status, 'accepted');

  const statusActive = await callRoute('GET', '/api/coach/status?traineeId=usr_trainee_real');
  assert.strictEqual(statusActive.body.hasCoach, true);
  assert.strictEqual(statusActive.body.status, 'active');
  assert.strictEqual(statusActive.body.coach.id, 'usr_coach_real');
  console.log('✓ Full connection request & accept lifecycle via API verified.');

  // 17. Terminate connection
  const termRes = await callRoute('POST', '/api/coach/terminate', {
    traineeId: 'usr_trainee_real',
    coachId: 'usr_coach_real',
    initiatedBy: 'trainee'
  });
  assert.strictEqual(termRes.status, 200);

  const statusNone = await callRoute('GET', '/api/coach/status?traineeId=usr_trainee_real');
  assert.strictEqual(statusNone.body.hasCoach, false);
  assert.strictEqual(statusNone.body.status, 'none');
  console.log('✓ POST /api/coach/terminate resets relationship on both sides.');

  // Clean up any remaining test user from database file
  db.data.users = db.data.users.filter(u => u.id !== 'google_user_route_test');
  db.save();

  console.log('--- All Server Route Tests Passed Successfully! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Route Test Failed:', err);
  process.exit(1);
});
