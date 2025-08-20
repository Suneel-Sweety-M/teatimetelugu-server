// middlewares/errorHandler.js
export const notFound = (_req, _res, next) =>
  next({ status: 404, message: 'Not Found' });

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Server error';
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  res.status(status).json({ success: false, message });
};
