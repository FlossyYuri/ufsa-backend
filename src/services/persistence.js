import axios from 'axios';

const API_URL = 'https://ejitech.co.mz/data-api.php';

export async function saveData(data) {
  try {
    await axios.post(API_URL, data);
    console.log('Data saved successfully to remote API');
    return true;
  } catch (error) {
    console.error('Error saving data to remote API:', error);
    return false;
  }
}

export async function loadData() {
  try {
    const response = await axios.get(API_URL);
    console.log('Data loaded successfully from remote API');
    return response.data;
  } catch (error) {
    console.error('Error loading data from remote API:', error);
    return null;
  }
}

export async function getLastUpdateDate() {
  try {
    const data = await loadData();
    return data?.meta?.ultima_atualizacao || null;
  } catch (error) {
    console.error('Error getting last update date:', error);
    return null;
  }
}