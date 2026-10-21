/**
 * Upload Israeli Food & Culinary Database to Cloud Firestore
 * Project: fitnessnutritionapp-ab381
 * Collection: foods/{foodId}
 * 
 * Authenticates with Firebase Auth (Coach / Manager) and commits documents
 * to Cloud Firestore using the Firestore REST API.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = "AIzaSyBmZ55Vlmy7pUeY3AV4K1XjbWWvxbAb7hE";
const PROJECT_ID = "fitnessnutritionapp-ab381";

// Auth credentials
const AUTH_EMAIL = process.env.FITPULSE_EMAIL || 'coach.real@fitpulse.com';
const AUTH_PASSWORD = process.env.FITPULSE_PASSWORD || 'TrainerPass123!';

// Load catalog
const CATALOG_FILE = path.join(__dirname, '..', 'data', 'israeli_culinary_database', 'foods_catalog.json');
if (!fs.existsSync(CATALOG_FILE)) {
  console.error("Error: Catalog file not found at " + CATALOG_FILE);
  process.exit(1);
}

const foods = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
console.log(`[Upload] Loaded ${foods.length} items from ${path.basename(CATALOG_FILE)}`);

// Convert JavaScript value to Firestore REST Value format
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert whole object to Firestore fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

async function main() {
  console.log(`[Upload] Authenticating with Firebase Auth as ${AUTH_EMAIL}...`);
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const signInRes = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD, returnSecureToken: true })
  }).then(r => r.json());

  if (signInRes.error) {
    throw new Error(`Auth failed: ${signInRes.error.message}`);
  }

  const idToken = signInRes.idToken;
  const uid = signInRes.localId;
  console.log(`[Upload] Authenticated successfully. UID: ${uid}`);

  // Upload in chunks of 50 using Firestore batch commit
  const BATCH_SIZE = 50;
  let totalUploaded = 0;
  let totalFailed = 0;

  for (let i = 0; i < foods.length; i += BATCH_SIZE) {
    const chunk = foods.slice(i, i + BATCH_SIZE);
    const writes = chunk.map(food => {
      const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/foods/${food.id}`;
      return {
        update: {
          name: docPath,
          fields: toFirestoreFields({
            name: food.name,
            nameEn: food.nameEn || '',
            brand: food.brand || '',
            category: food.category,
            categoryName: food.categoryName || '',
            unitName: food.unitName || '',
            defaultGrams: Number(food.defaultGrams || 100),
            calories: Number(food.calories || 0),
            protein: Number(food.protein || 0),
            carbs: Number(food.carbs || 0),
            fat: Number(food.fat || 0),
            fiber: Number(food.fiber || 0),
            sodium: Number(food.sodium || 0),
            sugar: Number(food.sugar || 0),
            dietaryTags: Array.isArray(food.dietaryTags) ? food.dietaryTags : [],
            locationType: food.locationType || '',
            region: food.region || '',
            address: food.address || '',
            verified: true,
            createdAt: food.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
      };
    });

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;
    const commitRes = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ writes })
    }).then(r => r.json());

    if (commitRes.error) {
      console.warn(`[Upload] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${commitRes.error.message}. Retrying with individual writes...`);
      // Fallback: Individual document PATCH writes
      for (const food of chunk) {
        try {
          const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/foods/${food.id}`;
          const patchRes = await fetch(docUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              fields: toFirestoreFields({
                name: food.name,
                nameEn: food.nameEn || '',
                brand: food.brand || '',
                category: food.category,
                categoryName: food.categoryName || '',
                unitName: food.unitName || '',
                defaultGrams: Number(food.defaultGrams || 100),
                calories: Number(food.calories || 0),
                protein: Number(food.protein || 0),
                carbs: Number(food.carbs || 0),
                fat: Number(food.fat || 0),
                fiber: Number(food.fiber || 0),
                sodium: Number(food.sodium || 0),
                sugar: Number(food.sugar || 0),
                dietaryTags: Array.isArray(food.dietaryTags) ? food.dietaryTags : [],
                locationType: food.locationType || '',
                region: food.region || '',
                address: food.address || '',
                verified: true,
                createdAt: food.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })
            })
          }).then(r => r.json());

          if (patchRes.error) {
            console.error(`  - Failed writing ${food.id}:`, patchRes.error.message);
            totalFailed++;
          } else {
            totalUploaded++;
          }
        } catch (e) {
          console.error(`  - Error writing ${food.id}:`, e.message);
          totalFailed++;
        }
      }
    } else {
      totalUploaded += chunk.length;
      console.log(`[Upload] Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${chunk.length} items). Total uploaded: ${totalUploaded}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`[Upload Complete] Successfully wrote ${totalUploaded} items to Cloud Firestore 'foods' collection.`);
  if (totalFailed > 0) {
    console.log(`[Upload Warnings] ${totalFailed} items failed.`);
  }
  console.log(`======================================================\n`);

  // Verification step: Read documents from Cloud Firestore
  console.log(`[Verification] Reading documents from Firestore 'foods' collection...`);
  const listUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/foods?pageSize=10`;
  const listRes = await fetch(listUrl, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  }).then(r => r.json());

  if (listRes.documents && listRes.documents.length > 0) {
    console.log(`[Verification SUCCESS] Found ${listRes.documents.length} sample documents in Cloud Firestore 'foods' collection!`);
    listRes.documents.slice(0, 3).forEach(doc => {
      const name = doc.fields?.name?.stringValue;
      const cals = doc.fields?.calories?.integerValue || doc.fields?.calories?.doubleValue;
      const protein = doc.fields?.protein?.integerValue || doc.fields?.protein?.doubleValue;
      console.log(`  ✓ Document: ${doc.name.split('/').pop()} -> "${name}" (${cals} kcal, ${protein}g protein)`);
    });
  } else {
    console.warn(`[Verification Notice] No documents returned or error:`, listRes);
  }
}

main().catch(err => {
  console.error("[Upload Fatal Error]", err);
  process.exit(1);
});
