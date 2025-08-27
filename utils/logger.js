const isProduction = process.env.NODE_ENV === 'production';

function formatDev(level, message, context) {
  const time = new Date().toISOString();
  const icon = level === 'info' ? '✓' : level === 'warn' ? '!' : '✗';
  const ctx = context ? ` | ${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ')}` : '';
  return `${time} ${icon} ${message}${ctx}`;
}

function log(level, message, context) {
  if (isProduction) {
    const payload = { level, message, context, time: new Date().toISOString() };
    // eslint-disable-next-line no-console
    (level === 'error' ? console.error : console.log)(JSON.stringify(payload));
    return;
  }
  const line = formatDev(level, message, context);
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)(line);
}

module.exports = {
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context)
};


