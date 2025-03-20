import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupLogging() {
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(__dirname, '../../logs', `${today}.log`);

  // Create a write stream
  const accessLogStream = fs.createWriteStream(logFile, { flags: 'a' });

  // Also log to console
  const logger = {
    write: (message) => {
      console.log(message.trim());
      accessLogStream.write(message);
    }
  };

  return logger;
}