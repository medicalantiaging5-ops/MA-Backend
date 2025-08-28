const express = require('express');
const { body, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { initFirebaseAdmin, signInAndSendVerificationEmail, sendVerificationEmailWithIdToken } = require('../utils/firebase');
const logger = require('../utils/logger');
const User = require('../models/User');
const { verifyFirebaseIdToken } = require('../middleware/auth');
const { requireRoleAtLeast } = require('../middleware/roles');
const { ROLES, isRoleAtLeast } = require('../utils/roles');
const Invite = require('../models/Invite');
const { generateToken, hashToken } = require('../utils/tokens');
const axios = require('axios');
const AllowedEmail = require('../models/AllowedEmail');
const { getFounderEmail } = require('../utils/config');

const router = express.Router();

const signupValidators = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').isString().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').isString().trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

router.post('/signup', signupValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) }
    });
  }

  const { email, firstName, lastName, password } = req.body;

  try {
    const admin = initFirebaseAdmin();
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
      disabled: false
    });

    // Founder auto-elevation if matches configured founder email
    const isFounder = email.toLowerCase() === getFounderEmail().toLowerCase();
    const initialRole = isFounder ? 'founder' : 'patient';
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: initialRole });

    try {
      const profile = await User.create({
        uid: userRecord.uid,
        email: userRecord.email,
        firstName,
        lastName,
        role: initialRole,
        emailVerified: false
      });

      // Attempt to send verification email and surface result in response
      let verificationEmail = { sent: false };
      try {
        await signInAndSendVerificationEmail(email, password);
        verificationEmail = { sent: true };
        logger.info('Verification email requested');
      } catch (e) {
        const message = 'Verification Email Failed';
        const reason = e && (e.stack || e.message) ? (e.stack || e.message) : 'unknown error';
        verificationEmail = { sent: false, error: { message, reason } };
        logger.warn('Verification email request failed', { reason: e && e.message ? e.message : 'unknown' });
      }

      return res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          profile: { id: profile._id, firstName: profile.firstName, lastName: profile.lastName, role: profile.role, emailVerified: profile.emailVerified },
          verificationEmail
        }
      });
    } catch (dbErr) {
      // Rollback Firebase user if DB persistence fails
      await admin.auth().deleteUser(userRecord.uid).catch(() => {});
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Signup Failed', reason: dbErr.stack || dbErr.message || String(dbErr) }
      });
    }
    // (moved email sending above, before return)
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: 'Signup Failed', reason: err.stack || err.message || String(err) }
    });
  }
});

router.get('/me', verifyFirebaseIdToken, async (req, res) => {
  try {
    const admin = initFirebaseAdmin();
    const user = await admin.auth().getUser(req.user.uid);
    let profile = await User.findOne({ uid: req.user.uid }).lean();
    const { uid, email, displayName, customClaims, emailVerified } = user;
    // Persist emailVerified status if changed
    if (profile && profile.emailVerified !== emailVerified) {
      await User.updateOne({ _id: profile._id }, { $set: { emailVerified } });
      profile.emailVerified = emailVerified;
    }
    // Auto-provision profile on first sign-in (e.g., Google sign-in)
    if (!profile) {
      const founderEmail = getFounderEmail().toLowerCase();
      const initialRole = email && email.toLowerCase() === founderEmail ? 'founder' : 'patient';
      const parts = (displayName || '').trim().split(/\s+/);
      const inferredFirst = parts[0] || '';
      const inferredLast = parts.slice(1).join(' ') || '';
      // Ensure role claim aligns
      const currentRole = (customClaims && customClaims.role) || 'patient';
      if (currentRole !== initialRole) {
        await admin.auth().setCustomUserClaims(uid, { role: initialRole });
      }
      const created = await User.create({
        uid,
        email,
        firstName: inferredFirst,
        lastName: inferredLast,
        role: initialRole,
        emailVerified: !!emailVerified
      });
      profile = { _id: created._id, firstName: created.firstName, lastName: created.lastName, role: created.role, emailVerified: created.emailVerified };
    }
    return res.json({
      success: true,
      data: {
        uid,
        email,
        displayName,
        claims: customClaims || null,
        emailVerified: !!emailVerified,
        profile: profile
          ? { id: String(profile._id), firstName: profile.firstName, lastName: profile.lastName, role: profile.role, emailVerified: profile.emailVerified }
          : null
      }
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { message: 'Fetch Profile Failed', reason: err.stack || err.message || String(err) }
    });
  }
});

module.exports = router;
router.post(
  '/roles/assign',
  verifyFirebaseIdToken,
  requireRoleAtLeast(ROLES.COFOUNDER),
  [
    body('uid').isString().trim().isLength({ min: 1 }).withMessage('uid is required'),
    body('role')
      .isString()
      .isIn(Object.values(ROLES))
      .withMessage(`role must be one of: ${Object.values(ROLES).join(', ')}`)
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) }
      });
    }

    const { uid, role } = req.body;
    const actorRole = req.user.role || 'patient';

    if (actorRole === ROLES.COFOUNDER && role === ROLES.FOUNDER) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { message: 'Forbidden', reason: 'Cofounders cannot assign founder role' }
      });
    }

    if (req.user.uid === uid) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { message: 'Forbidden', reason: 'Self role changes are not allowed' }
      });
    }

    try {
      const admin = initFirebaseAdmin();
      const currentUser = await admin.auth().getUser(uid);
      const prevRole = (currentUser.customClaims && currentUser.customClaims.role) || ROLES.PATIENT;

      if (!isRoleAtLeast(actorRole, prevRole) || !isRoleAtLeast(actorRole, role)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          error: { message: 'Forbidden', reason: 'Insufficient role permissions for target change' }
        });
      }

      await admin.auth().setCustomUserClaims(uid, { role });

      const existing = await User.findOne({ uid });
      if (existing) {
        existing.role = role;
        await existing.save();
      } else {
        await User.create({
          uid,
          email: currentUser.email,
          firstName: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
          lastName: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : '',
          role
        });
      }

      return res.json({ success: true, data: { uid, role } });
    } catch (err) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Role Assignment Failed', reason: err.stack || err.message || String(err) }
      });
    }
  }
);
router.post('/password-reset', [body('email').isEmail().withMessage('Valid email is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) }
    });
  }

  const { email } = req.body;
  try {
    const admin = initFirebaseAdmin();
    const link = await admin.auth().generatePasswordResetLink(email);
    // In a real app, send the link via your email provider. Here we return success without exposing whether the user exists.
    return res.json({ success: true, data: { sent: true } });
  } catch (err) {
    // Return generic success to avoid account enumeration
    return res.json({ success: true, data: { sent: true } });
  }
});

// Create invitation (cofounder and above)
router.post(
  '/invitations',
  verifyFirebaseIdToken,
  requireRoleAtLeast(ROLES.COFOUNDER),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').isString().isIn(Object.values(ROLES)).withMessage('Invalid role'),
    body('ttlMs').optional().isInt({ min: 60_000, max: 30 * 24 * 60 * 60 * 1000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) } });
    }
    const { email, role } = req.body;
    const ttlMs = Number(req.body.ttlMs || 7 * 24 * 60 * 60 * 1000);

    if (role === ROLES.FOUNDER) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, error: { message: 'Forbidden', reason: 'Cannot invite founder role' } });
    }

    const { token, hash } = generateToken(32);
    const expiresAt = new Date(Date.now() + ttlMs);
    await Invite.create({ email, role, tokenHash: hash, expiresAt, createdBy: req.user.uid });

    // In real app, send token via email. Here we return the token for testing.
    return res.status(StatusCodes.CREATED).json({ success: true, data: { token, email, role, expiresAt } });
  }
);

// Resend email verification (must present valid ID token)
router.post('/email/verification', verifyFirebaseIdToken, async (req, res) => {
  try {
    const admin = initFirebaseAdmin();
    const user = await admin.auth().getUser(req.user.uid);
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, error: { message: 'Server Misconfiguration', reason: 'Missing FIREBASE_API_KEY' } });
    }
    // Client can also call sendOobCode with ID token; we proxy here for convenience
    const idToken = req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    if (!idToken) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Bad Request', reason: 'Missing ID token' } });
    }
    await sendVerificationEmailWithIdToken(idToken);
    return res.json({ success: true, data: { sent: true, email: user.email } });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Verification Email Failed', reason: err.stack || err.message || String(err) } });
  }
});

// Accept invitation: supply token, along with already-authenticated Firebase user
router.post(
  '/invitations/accept',
  verifyFirebaseIdToken,
  [body('token').isString().isLength({ min: 20 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) } });
    }
    const { token } = req.body;
    const tokenHash = hashToken(token);
    const invite = await Invite.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!invite) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Invalid Invitation', reason: 'Token not found or expired' } });
    }

    // Ensure email matches authenticated user and is on allowlist (or is founder email)
    const admin = initFirebaseAdmin();
    const me = await admin.auth().getUser(req.user.uid);
    const emailLc = (me.email || '').toLowerCase();
    if (!emailLc || emailLc !== invite.email.toLowerCase()) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, error: { message: 'Forbidden', reason: 'Invitation email mismatch' } });
    }

    const founderEmail = getFounderEmail().toLowerCase();
    if (emailLc !== founderEmail) {
      const allowed = await AllowedEmail.findOne({ email: emailLc }).lean();
      if (!allowed) {
        return res.status(StatusCodes.FORBIDDEN).json({ success: false, error: { message: 'Forbidden', reason: 'Email not in allowlist' } });
      }
    }

    // Apply role in Firebase and Mongo
    await admin.auth().setCustomUserClaims(req.user.uid, { role: invite.role });
    const profile = await User.findOneAndUpdate(
      { uid: req.user.uid },
      {
        uid: req.user.uid,
        email: me.email,
        firstName: me.displayName ? me.displayName.split(' ')[0] : '',
        lastName: me.displayName ? me.displayName.split(' ').slice(1).join(' ') : '',
        role: invite.role
      },
      { upsert: true, new: true }
    ).lean();

    // Consume invitation
    await Invite.deleteOne({ _id: invite._id });

    return res.json({ success: true, data: { role: invite.role, profile: { id: String(profile._id), firstName: profile.firstName, lastName: profile.lastName } } });
  }
);

// Exchange refresh token for a new ID token via Google Secure Token API
router.post('/token/refresh', [body('refreshToken').isString().isLength({ min: 20 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) } });
  }

  const { refreshToken } = req.body;
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, error: { message: 'Server Misconfiguration', reason: 'Missing FIREBASE_API_KEY' } });
  }

  try {
    const url = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const response = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = response.data || {};
    return res.json({
      success: true,
      data: {
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        userId: data.user_id,
        projectId: data.project_id
      }
    });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Token Refresh Failed', reason: err.stack || err.message || String(err) } });
  }
});


