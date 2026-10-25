const http = require('http');
const assert = require('assert');
const server = require('../server');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function testApi() {
  console.log('--- Starting Server REST API Verification Tests ---');

  // 1. System status
  const sysRes = await request('GET', '/api/system/status');
  assert.strictEqual(sysRes.status, 200);
  assert.strictEqual(sysRes.body.status, 'online');
  console.log('✓ /api/system/status online.');

  // 2. Auth login: manager
  const mgrRes = await request('POST', '/api/auth/login', {
    identifier: 'manager@fitpulse.com',
    password: 'ManagerPass123!'
  });
  assert.strictEqual(mgrRes.status, 200);
  assert.strictEqual(mgrRes.body.success, true);
  assert.strictEqual(mgrRes.body.user.role, 'manager');
  console.log('✓ POST /api/auth/login for manager succeeded.');

  // 3. Auth login: coach
  const coachRes = await request('POST', '/api/auth/login', {
    identifier: 'coach.real@fitpulse.com',
    password: 'TrainerPass123!'
  });
  assert.strictEqual(coachRes.status, 200);
  assert.strictEqual(coachRes.body.user.role, 'coach');
  console.log('✓ POST /api/auth/login for coach succeeded.');

  // 4. Auth login: trainee
  const traineeRes = await request('POST', '/api/auth/login', {
    identifier: 'trainee.real@fitpulse.com',
    password: 'TraineePass123!'
  });
  assert.strictEqual(traineeRes.status, 200);
  assert.strictEqual(traineeRes.body.user.role, 'trainee');
  console.log('✓ POST /api/auth/login for trainee succeeded.');

  // 5. Auth google: new user
  const gRes = await request('POST', '/api/auth/google', {
    uid: 'google_test_user_777',
    email: 'googletest777@gmail.com',
    displayName: 'בודק גוגל'
  });
  assert.strictEqual(gRes.status, 200);
  assert.strictEqual(gRes.body.isPending, true);
  assert.strictEqual(gRes.body.user.status, 'pending_approval');
  console.log('✓ POST /api/auth/google auto-registered new user as pending.');

  // 6. Get pending users
  const pendingRes = await request('GET', '/api/users/pending');
  assert.strictEqual(pendingRes.status, 200);
  assert.ok(pendingRes.body.users.some(u => u.id === 'google_test_user_777'));
  console.log('✓ GET /api/users/pending lists newly registered pending user.');

  // 7. Approve user
  const appRes = await request('POST', '/api/users/approve', { userId: 'google_test_user_777' });
  assert.strictEqual(appRes.status, 200);
  assert.strictEqual(appRes.body.user.status, 'active');
  console.log('✓ POST /api/users/approve approved user.');

  // 8. Suspend user
  const suspRes = await request('POST', '/api/users/status', { userId: 'google_test_user_777', status: 'suspended' });
  assert.strictEqual(suspRes.status, 200);
  assert.strictEqual(suspRes.body.user.status, 'suspended');
  console.log('✓ POST /api/users/status suspended user.');

  // Blocked login for suspended user
  const suspLogin = await request('POST', '/api/auth/login', { identifier: 'googletest777@gmail.com' });
  assert.strictEqual(suspLogin.status, 403);
  console.log('✓ Suspended user login correctly returned 403 Forbidden.');

  // 9. Unsuspend resets to pending_approval
  const unsuspRes = await request('POST', '/api/users/status', { userId: 'google_test_user_777', status: 'pending_approval' });
  assert.strictEqual(unsuspRes.status, 200);
  assert.strictEqual(unsuspRes.body.user.status, 'pending_approval');
  console.log('✓ Unsuspend resets status to pending_approval.');

  // 10. Reject user
  const rejRes = await request('POST', '/api/users/reject', { userId: 'google_test_user_777' });
  assert.strictEqual(rejRes.status, 200);
  assert.strictEqual(rejRes.body.user.status, 'rejected');
  console.log('✓ POST /api/users/reject rejected user.');

  // Blocked login for rejected user
  const rejLogin = await request('POST', '/api/auth/login', { identifier: 'googletest777@gmail.com' });
  assert.strictEqual(rejLogin.status, 403);
  console.log('✓ Rejected user login correctly returned 403 Forbidden.');

  // 11. Delete user permanently
  const delRes = await request('DELETE', '/api/users/google_test_user_777');
  assert.strictEqual(delRes.status, 200);
  assert.strictEqual(delRes.body.success, true);
  console.log('✓ DELETE /api/users/:userId permanently removed user.');

  // 12. Verify special users cannot be deleted or suspended
  const delSpecial = await request('DELETE', '/api/users/usr_mgr');
  assert.strictEqual(delSpecial.status, 400);

  const suspSpecial = await request('POST', '/api/users/status', { userId: 'usr_coach_real', status: 'suspended' });
  assert.strictEqual(suspSpecial.status, 400);
  console.log('✓ Special users protection verified via API.');

  // 13. Verify only 3 special users remain in database
  const allUsersRes = await request('GET', '/api/users');
  assert.strictEqual(allUsersRes.status, 200);
  assert.strictEqual(allUsersRes.body.users.length, 3);
  console.log('✓ Database retains strictly 3 special users.');

  console.log('--- All Server REST API Tests Passed Successfully! ---');
  process.exit(0);
}

// Ensure server is listening
setTimeout(() => {
  testApi().catch(err => {
    console.error('Server API Test Failed:', err);
    process.exit(1);
  });
}, 500);
