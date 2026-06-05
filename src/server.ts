import app from './app';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Alankrit Backend running on http://0.0.0.0:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`📊 API Health: http://0.0.0.0:${PORT}/api/health`);
});
