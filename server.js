import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

// Route for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback for clean URLs or HTML pages
app.get('*', (req, res) => {
  const cleanPath = req.path.replace(/\/$/, '');
  const htmlFilePath = path.join(__dirname, 'public', cleanPath + '.html');
  if (fs.existsSync(htmlFilePath)) {
    return res.sendFile(htmlFilePath);
  }
  const directPath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }
  // Otherwise send the main index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`EARNWAVE server is running on http://${HOST}:${PORT}`);
});
