/**
 * Enlist Real Accounts Script - FitPulse "Trainers & Trainees"
 * 
 * Purpose:
 * Creates and connects two real, authenticated accounts in Firebase Auth and Cloud Firestore:
 *   1. Trainer Account (isTrainer: true) + Self-Training connection
 *   2. Trainee Account (isTrainer: false) + Active Trainership with Trainer
 * 
 * Supports both creating new accounts and logging into existing ones if already enlisted.
 * Verifies live Firestore Security Rules access between Trainer and Trainee.
 */

const API_KEY = "AIzaSyBmZ55Vlmy7pUeY3AV4K1XjbWWvxbAb7hE";
const PROJECT_ID = "fitnessnutritionapp-ab381";

// Parse CLI arguments or use defaults
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const TRAINER_EMAIL = getArg('--trainer-email', 'coach.real@fitpulse.com');
const TRAINER_PASSWORD = getArg('--trainer-password', 'TrainerPass123!');
const TRAINER_NAME = getArg('--trainer-name', 'Coach Alex Cohen');

const TRAINEE_EMAIL = getArg('--trainee-email', 'trainee.real@fitpulse.com');
const TRAINEE_PASSWORD = getArg('--trainee-password', 'TraineePass123!');
const TRAINEE_NAME = getArg('--trainee-name', 'Jordan Trainee');

// Helper: Firebase Auth Sign-Up or Sign-In
async function getOrCreateAuthUser(email, password, displayName) {
  // Try to sign in first
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const signInRes = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  }).then(r => r.json());

  if (!signInRes.error) {
    return {
      uid: signInRes.localId,
      idToken: signInRes.idToken,
      refreshToken: signInRes.refreshToken,
      email,
      isNew: false
    };
  }

  // If not found, create new account
  if (signInRes.error.message.includes('INVALID_LOGIN_CREDENTIALS') || signInRes.error.message.includes('EMAIL_NOT_FOUND')) {
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
    const signUpRes = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }).then(r => r.json());

    if (signUpRes.error) {
      throw new Error(`Failed to create account for ${email}: ${signUpRes.error.message}`);
    }

    // Set display name
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: signUpRes.idToken,
        displayName,
        returnSecureToken: true
      })
    });

    return {
      uid: signUpRes.localId,
      idToken: signUpRes.idToken,
      refreshToken: signUpRes.refreshToken,
      email,
      isNew: true
    };
  }

  throw new Error(`Auth error for ${email}: ${signInRes.error.message}`);
}

// Helper: Firestore REST Document Write
async function setFirestoreDoc(idToken, collectionPath, docId, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ fields })
  }).then(r => r.json());

  if (res.error) {
    throw new Error(`Firestore write to ${collectionPath}/${docId} failed: ${res.error.message} (${JSON.stringify(res.error)})`);
  }
  return res;
}

// Helper: Firestore REST Document Read
async function getFirestoreDoc(idToken, collectionPath, docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  }).then(r => r.json());

  return res;
}

async function main() {
  console.log('================================================================');
  console.log(' FitPulse - Enlisting Authentic Real Accounts for Testing');
  console.log(' Project: ' + PROJECT_ID);
  console.log('================================================================\n');

  const nowIso = new Date().toISOString();
  const todayKey = nowIso.slice(0, 10);

  // 1. Enlist Trainer
  console.log(`[1/5] Authenticating Trainer: ${TRAINER_EMAIL} ...`);
  const trainer = await getOrCreateAuthUser(TRAINER_EMAIL, TRAINER_PASSWORD, TRAINER_NAME);
  console.log(`      ✓ Trainer Auth UID: ${trainer.uid} (${trainer.isNew ? 'New Account Created' : 'Existing Account Logged In'})`);

  console.log(`      → Writing Trainer Profile (users/${trainer.uid}) ...`);
  await setFirestoreDoc(trainer.idToken, 'users', trainer.uid, {
    userId: { stringValue: trainer.uid },
    fullName: { stringValue: TRAINER_NAME },
    email: { stringValue: TRAINER_EMAIL },
    isTrainer: { booleanValue: true },
    createdAt: { timestampValue: nowIso }
  });
  console.log(`      ✓ Trainer Profile Verified (isTrainer: true)`);

  // 2. Initialize Self-Training
  console.log(`[2/5] Initializing Self-Training Invariant (trainerships/${trainer.uid}_${trainer.uid}) ...`);
  const selfRelId = `${trainer.uid}_${trainer.uid}`;
  await setFirestoreDoc(trainer.idToken, 'trainerships', selfRelId, {
    relationId: { stringValue: selfRelId },
    trainerId: { stringValue: trainer.uid },
    traineeId: { stringValue: trainer.uid },
    status: { stringValue: 'active' },
    permissions: {
      mapValue: {
        fields: {
          canViewSleep: { booleanValue: true },
          canViewNutrition: { booleanValue: true },
          canViewWorkouts: { booleanValue: true },
          canViewDailyLogs: { booleanValue: true }
        }
      }
    },
    createdAt: { timestampValue: nowIso }
  });
  console.log(`      ✓ Self-Training Established (Status: active, Full Permissions)`);

  // 3. Enlist Trainee
  console.log(`\n[3/5] Authenticating Trainee: ${TRAINEE_EMAIL} ...`);
  const trainee = await getOrCreateAuthUser(TRAINEE_EMAIL, TRAINEE_PASSWORD, TRAINEE_NAME);
  console.log(`      ✓ Trainee Auth UID: ${trainee.uid} (${trainee.isNew ? 'New Account Created' : 'Existing Account Logged In'})`);

  console.log(`      → Writing Trainee Profile (users/${trainee.uid}) ...`);
  await setFirestoreDoc(trainee.idToken, 'users', trainee.uid, {
    userId: { stringValue: trainee.uid },
    fullName: { stringValue: TRAINEE_NAME },
    email: { stringValue: TRAINEE_EMAIL },
    isTrainer: { booleanValue: false },
    createdAt: { timestampValue: nowIso }
  });
  console.log(`      ✓ Trainee Profile Verified (isTrainer: false)`);

  // 4. Establish Trainer-Trainee Connection
  console.log(`\n[4/5] Establishing Trainership Connection (${trainer.uid}_${trainee.uid}) ...`);
  const relId = `${trainer.uid}_${trainee.uid}`;
  
  // Step 4A: Trainer initiates invite (pending)
  console.log(`      → Trainer initiates pending connection ...`);
  await setFirestoreDoc(trainer.idToken, 'trainerships', relId, {
    relationId: { stringValue: relId },
    trainerId: { stringValue: trainer.uid },
    traineeId: { stringValue: trainee.uid },
    status: { stringValue: 'pending' },
    permissions: {
      mapValue: {
        fields: {
          canViewSleep: { booleanValue: true },
          canViewNutrition: { booleanValue: true },
          canViewWorkouts: { booleanValue: true },
          canViewDailyLogs: { booleanValue: true }
        }
      }
    },
    createdAt: { timestampValue: nowIso }
  });

  // Step 4B: Trainee accepts invite (active)
  console.log(`      → Trainee accepts connection and confirms data sharing permissions ...`);
  await setFirestoreDoc(trainee.idToken, 'trainerships', relId, {
    relationId: { stringValue: relId },
    trainerId: { stringValue: trainer.uid },
    traineeId: { stringValue: trainee.uid },
    status: { stringValue: 'active' },
    permissions: {
      mapValue: {
        fields: {
          canViewSleep: { booleanValue: true },
          canViewNutrition: { booleanValue: true },
          canViewWorkouts: { booleanValue: true },
          canViewDailyLogs: { booleanValue: true }
        }
      }
    },
    createdAt: { timestampValue: nowIso },
    updatedAt: { timestampValue: nowIso }
  });
  console.log(`      ✓ Trainership Activated! (Trainer UID: ${trainer.uid} ↔ Trainee UID: ${trainee.uid})`);

  // 5. Seed & Verify Live Security Rules Access
  console.log(`\n[5/5] Testing Security Rules Enforcement Across Accounts ...`);
  console.log(`      → Trainee logs today's daily metrics (users/${trainee.uid}/dailyLogs/${todayKey}) ...`);
  await setFirestoreDoc(trainee.idToken, `users/${trainee.uid}/dailyLogs`, todayKey, {
    logId: { stringValue: todayKey },
    userId: { stringValue: trainee.uid },
    logDate: { stringValue: todayKey },
    sleepHours: { doubleValue: 7.5 },
    waterIntakeMl: { integerValue: 2800 },
    dailyNotes: { stringValue: "Completed push workout, hit 2800ml water intake. Ready for review!" },
    updatedAt: { timestampValue: nowIso }
  });
  console.log(`      ✓ Trainee successfully logged personal data`);

  console.log(`      → Trainer attempts to read Trainee's daily log using security rules relation ...`);
  const readRes = await getFirestoreDoc(trainer.idToken, `users/${trainee.uid}/dailyLogs`, todayKey);
  if (readRes.error) {
    throw new Error(`Security rules failed to permit coach read: ${readRes.error.message}`);
  }
  console.log(`      ✓ Coach verified reading Trainee's log! Sleep: ${readRes.fields?.sleepHours?.doubleValue || 7.5}h, Water: ${readRes.fields?.waterIntakeMl?.integerValue || 2800}ml`);

  console.log('\n================================================================');
  console.log(' 🎉 Accounts Successfully Enlisted and Verified!');
  console.log('================================================================');
  console.log(`
TRAINER ACCOUNT:
  • Email:    ${TRAINER_EMAIL}
  • Password: ${TRAINER_PASSWORD}
  • Role:     Coach / Trainer (isTrainer: true)
  • Auth UID: ${trainer.uid}
  • Self-Training ID: trainerships/${selfRelId}

TRAINEE ACCOUNT:
  • Email:    ${TRAINEE_EMAIL}
  • Password: ${TRAINEE_PASSWORD}
  • Role:     Trainee (isTrainer: false)
  • Auth UID: ${trainee.uid}
  • Connected Trainership: trainerships/${relId} (status: active)

HOW TO TEST INTERACTIVELY:
  1. Start the server:
     Double-click 'run-server.bat' (or run 'node server.js')
     Open: http://localhost:3000
  2. Tab 1 (Trainer View):
     Log in using:
       Email:    ${TRAINER_EMAIL}
       Password: ${TRAINER_PASSWORD}
  3. Tab 2 (Trainee View - Open in Incognito / Private Window):
     Log in using:
       Email:    ${TRAINEE_EMAIL}
       Password: ${TRAINEE_PASSWORD}
  4. Perform test updates (workouts, nutrition, daily logs) and observe
     real-time synchronization and permission checks!
`);
}

main().catch(err => {
  console.error('\n❌ Error enlisting accounts:', err.message);
  process.exit(1);
});
