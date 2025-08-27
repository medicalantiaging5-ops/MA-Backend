const express = require('express');
const authRouter = require('./auth');
const departmentsRouter = require('./departments');
const allowlistRouter = require('./allowlist');
const patientsRouter = require('./patients');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', authRouter);
router.use('/departments', departmentsRouter);
router.use('/allowlist', allowlistRouter);
router.use('/patients', patientsRouter);

module.exports = router;


