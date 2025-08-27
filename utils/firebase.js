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
  
  await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
}

async function signInAndSendVerificationEmail(email, password) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing FIREBASE_API_KEY');
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const resp = await axios.post(signInUrl, { email, password, returnSecureToken: true }, { headers: { 'Content-Type': 'application/json' } });
  const idToken = resp.data && resp.data.idToken;
  if (!idToken) throw new Error('Failed to obtain idToken during sign-in');
  await sendVerificationEmailWithIdToken(idToken);
}

module.exports = {
  initFirebaseAdmin,
  sendVerificationEmailWithIdToken,
  signInAndSendVerificationEmail
};


