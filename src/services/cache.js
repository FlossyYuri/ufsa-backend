import { fetchUfsaData } from './scraper.js';
import { saveData, loadData, getLastUpdateDate } from './persistence.js';
import axios from 'axios';
import config from '../config.js';

let cache = {
  tenders: [],
  lastUpdate: null,
  retryAttempts: 0,
  isUsingPersistedData: false
};

const { interval: CACHE_INTERVAL, maxRetryAttempts: MAX_RETRY_ATTEMPTS, retryDelay: RETRY_DELAY } = config.cache;
const { baseUrl: UFSA_BASE_URL } = config.ufsa;

async function checkUfsaAvailability() {
  try {
    const response = await axios.get(UFSA_BASE_URL, {
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    return response.status < 500;
  } catch (error) {
    console.error('UFSA availability check failed:', error.message);
    return false;
  }
}

export async function initializeCache() {
  try {
    // Always try to load saved data first as a fallback
    const savedData = await loadData();
    if (savedData) {
      cache = {
        tenders: savedData,
        lastUpdate: await getLastUpdateDate(),
        retryAttempts: 0,
        isUsingPersistedData: true
      };
      console.log('Cache initialized from saved data');
    }

    // Try to update cache with fresh data
    await updateCache();

    // Set up periodic cache updates
    setInterval(updateCache, CACHE_INTERVAL);
  } catch (error) {
    console.error('Failed to initialize cache:', error);

    // Try to load saved data if cache is empty
    const savedData = await loadData();
    if (!cache.tenders.length && savedData) {
      // If fresh fetch fails but we have saved data, use it
      cache = {
        tenders: savedData,
        lastUpdate: await getLastUpdateDate(),
        retryAttempts: 0,
        isUsingPersistedData: true
      };
      console.log('Using persisted data due to initialization failure');
    } else if (!cache.tenders.length) {
      // If no data at all, retry after delay
      setTimeout(initializeCache, RETRY_DELAY);
    }
  }
}

async function updateCache() {
  try {
    // Check UFSA availability first
    const isUfsaAvailable = await checkUfsaAvailability();

    if (!isUfsaAvailable) {
      console.log('UFSA website is not available, using persisted data');
      const savedData = await loadData();
      if (savedData) {
        cache = {
          tenders: savedData,
          lastUpdate: await getLastUpdateDate(),
          retryAttempts: cache.retryAttempts + 1,
          isUsingPersistedData: true
        };
        console.log('Using persisted data due to UFSA unavailability');
        return;
      }
    }

    // Only proceed with full data fetch if UFSA is available
    const newData = await fetchUfsaData();

    // Only update if we got valid data
    if (newData && newData.dados && Object.keys(newData.dados).length > 0) {
      cache = {
        tenders: newData,
        lastUpdate: new Date(),
        retryAttempts: 0,
        isUsingPersistedData: false
      };

      // Save the new data for future fallback
      await saveData(newData);
      console.log('Cache updated and saved successfully');
    } else {
      throw new Error('Invalid or empty data received from UFSA');
    }
  } catch (error) {
    console.error('Failed to update cache:', error);

    // Load saved data as fallback if available
    const savedData = await loadData();
    if (savedData) {
      cache = {
        tenders: savedData,
        lastUpdate: await getLastUpdateDate(),
        retryAttempts: cache.retryAttempts + 1,
        isUsingPersistedData: true
      };
      console.log('Using persisted data due to update failure');
    }

    // Schedule retry if under max attempts
    if (cache.retryAttempts < MAX_RETRY_ATTEMPTS) {
      console.log(`Retry attempt ${cache.retryAttempts} of ${MAX_RETRY_ATTEMPTS} in ${RETRY_DELAY / 1000} seconds`);
      setTimeout(updateCache, RETRY_DELAY);
    } else {
      console.error('Max retry attempts reached. Will try again at next scheduled update.');
      cache.retryAttempts = 0;
    }
  }
}

export function getCache() {
  return {
    ...cache,
    status: {
      isUsingPersistedData: cache.isUsingPersistedData,
      lastUpdate: cache.lastUpdate,
      retryAttempts: cache.retryAttempts
    }
  };
}