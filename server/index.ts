import express from 'express';

const app = express();
app.use(express.json());
app.get('/api/ping', (_req: any, res: any) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

// Vercel serverless needs either export default or module.exports
export default app;
