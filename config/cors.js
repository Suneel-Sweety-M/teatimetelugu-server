const allowed = (process.env.CLIENT_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const corsOptions = {
  origin(origin, cb) {
    // Allow Postman/cURL (no origin)
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true, // needed if you use cookies for refresh token
};
