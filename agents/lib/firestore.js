/**
 * lib/firestore.js
 * Firebase Admin SDK wrapper voor agent scripts.
 *
 * Verwachte env-var:
 *   FIREBASE_SERVICE_ACCOUNT  – absoluut pad naar serviceAccount.json
 *                               OF inline JSON-string (voor CI/secrets managers)
 */

const admin = require('firebase-admin');

let _db = null;

function getDb() {
  if (_db) return _db;

  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');

    let credential;
    if (raw.trim().startsWith('{')) {
      credential = admin.credential.cert(JSON.parse(raw));
    } else {
      credential = admin.credential.cert(require(raw));
    }
    admin.initializeApp({ credential });
  }

  _db = admin.firestore();
  return _db;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getDoc(collection, id) {
  const snap = await getDb().collection(collection).doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function query(collection, filters = {}) {
  let ref = getDb().collection(collection);
  for (const [k, v] of Object.entries(filters)) {
    ref = ref.where(k, '==', v);
  }
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateDoc(collection, id, data) {
  await getDb().collection(collection).doc(id).update({
    ...data,
    updated_date: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function createDoc(collection, data) {
  const ref = await getDb().collection(collection).add({
    ...data,
    created_date: admin.firestore.FieldValue.serverTimestamp(),
    updated_date: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

module.exports = { getDb, getDoc, query, updateDoc, createDoc };
