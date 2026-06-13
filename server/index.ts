import express from 'express';
const app = express();
app.get('/api/ping', (_req: any, res: any) => { res.json({ status: 'ok' }); });
export default app;
