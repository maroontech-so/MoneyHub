/**
 * EARNWAVE - Persistent File-Based Storage Engine
 * Manages atomic read/write of server data models.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class JsonStore {
  constructor(filename, defaultData = {}) {
    this.filePath = path.join(DATA_DIR, filename);
    this.defaultData = defaultData;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.write(this.defaultData);
      }
    } catch (e) {
      console.error(`Error initializing JsonStore for ${this.filePath}:`, e);
    }
  }

  read() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return this.defaultData;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error reading ${this.filePath}:`, e);
      return this.defaultData;
    }
  }

  write(data) {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
      return true;
    } catch (e) {
      console.error(`Error writing ${this.filePath}:`, e);
      return false;
    }
  }
}
