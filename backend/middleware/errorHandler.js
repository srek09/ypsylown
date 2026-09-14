function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  } else {
    console.error(err.message);
  }

  res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandler;
