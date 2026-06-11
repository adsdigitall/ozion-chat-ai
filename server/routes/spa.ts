import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Serve SPA - all non-API routes return index.html
router.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(__dirname, '../public/index.html'));
  }
});

export default router;
