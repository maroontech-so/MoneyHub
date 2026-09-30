import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// Vercel does not run server.js as a local process, so attach the static
// frontend routes to the serverless Express handler explicitly.
app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('*', (req, res) => {
  const cleanPath = req.path.replace(/^\/+|\/+$/g, '');
  const htmlFilePath = path.join(publicDir, `${cleanPath}.html`);
  const directPath = path.join(publicDir, cleanPath);

  if (cleanPath && fs.existsSync(htmlFilePath)) {
    return res.sendFile(htmlFilePath);
  }

  if (cleanPath && fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }

  return res.sendFile(path.join(publicDir, 'index.html'));
});

export default app;
