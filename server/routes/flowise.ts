// @ts-nocheck
import { Router } from 'express';

const router = Router();

const FLOWISE_URL = process.env.FLOWISE_URL || 'http://localhost:3000';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || '';

// Proxy: Executar flow (prediction)
router.post('/predict/:chatflowId', async (req, res) => {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

    const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${req.params.chatflowId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Flowise predict error:', error.message);
    res.status(500).json({ error: 'Flowise connection failed', details: error.message });
  }
});

// Proxy: Listar flows do Flowise
router.get('/chatflows', async (req, res) => {
  try {
    const headers: any = {};
    if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

    const response = await fetch(`${FLOWISE_URL}/api/v1/chatflows`, { headers });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Flowise list error:', error.message);
    res.status(500).json({ error: 'Flowise connection failed' });
  }
});

// Proxy: Criar flow no Flowise
router.post('/chatflows', async (req, res) => {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

    const response = await fetch(`${FLOWISE_URL}/api/v1/chatflows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Flowise create error:', error.message);
    res.status(500).json({ error: 'Flowise connection failed' });
  }
});

// Proxy: Deletar flow no Flowise
router.delete('/chatflows/:id', async (req, res) => {
  try {
    const headers: any = {};
    if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

    const response = await fetch(`${FLOWISE_URL}/api/v1/chatflows/${req.params.id}`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Flowise delete error:', error.message);
    res.status(500).json({ error: 'Flowise connection failed' });
  }
});

// Proxy: Atualizar flow no Flowise
router.put('/chatflows/:id', async (req, res) => {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

    const response = await fetch(`${FLOWISE_URL}/api/v1/chatflows/${req.params.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Flowise update error:', error.message);
    res.status(500).json({ error: 'Flowise connection failed' });
  }
});

// Proxy: Status do Flowise
router.get('/status', async (req, res) => {
  try {
    const response = await fetch(`${FLOWISE_URL}/api/v1/ping`);
    const data = await response.json();
    res.json({ connected: true, flowise: data, url: FLOWISE_URL });
  } catch (error: any) {
    res.json({ connected: false, url: FLOWISE_URL, error: error.message });
  }
});

export default router;
