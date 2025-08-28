const admin = require('firebase-admin');
const axios = require('axios');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase environment variables');
  }

  // Handle escaped newlines in env var
  privateKey = privateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });

  initialized = true;
  return admin;
}

async function sendVerificationEmailWithIdToken(idToken) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing FIREBASE_API_KEY');
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;

  const payload = { requestType: 'VERIFY_EMAIL', idToken };

  // Add continue URL if set in environment variables
  const continueUrl = process.env.FIREBASE_CONTINUE_URL;
  if (continueUrl && continueUrl.trim()) {
    payload.continueUrl = continueUrl.trim();
  }

  try {
    await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    const apiError = err && err.response && err.response.data && err.response.data.error;
    const reason = apiError && apiError.message ? apiError.message : (err.message || 'Unknown error');
    const enriched = new Error(`sendOobCode failed: ${reason}`);
    enriched.statusCode = err && err.response && err.response.status;
    throw enriched;
  }
}

async function signInWithPassword(email, password) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing FIREBASE_API_KEY');
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  let idToken;
  let refreshToken;
  try {
    const resp = await axios.post(
      signInUrl,
      { email, password, returnSecureToken: true },
      { headers: { 'Content-Type': 'application/json' } }
    );
    idToken = resp.data && resp.data.idToken;
    refreshToken = resp.data && resp.data.refreshToken;
  } catch (err) {
    const apiError = err && err.response && err.response.data && err.response.data.error;
    const reason = apiError && apiError.message ? apiError.message : (err.message || 'Unknown error');
    const enriched = new Error(`signInWithPassword failed: ${reason}`);
    enriched.statusCode = err && err.response && err.response.status;
    throw enriched;
  }
  if (!idToken) throw new Error('Failed to obtain idToken during sign-in');
  return { idToken, refreshToken };
}

async function signInAndSendVerificationEmail(email, password) {
  const { idToken } = await signInWithPassword(email, password);
  await sendVerificationEmailWithIdToken(idToken);
  return { idToken };
}

module.exports = {
  initFirebaseAdmin,
  sendVerificationEmailWithIdToken,
  signInAndSendVerificationEmail,
  signInWithPassword
};


