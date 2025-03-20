import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'ufsa_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

export function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('No saved data found');
      return null;
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('Data loaded successfully');
    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
}

export function getLastUpdateDate() {
  try {
    const data = loadData();
    return data?.meta?.ultima_atualizacao || null;
  } catch (error) {
    console.error('Error getting last update date:', error);
    return null;
  }
}