import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { backOff } from 'exponential-backoff';

const BASE_URL = 'https://www.ufsa.gov.mz';
const ENDPOINTS = {
  concursos: '/query/Busca_concurso1.php'
};

const DETAIL_ENDPOINT = 'concurso_detalhes.php';

// Browser-like headers
const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Connection': 'keep-alive',
};

// Configure axios with enhanced retry logic
const client = axios.create({
  headers,
});

axiosRetry(client, {
  retries: 5,
  retryDelay: (retryCount) => {
    const delay = Math.min(1000 * (2 ** retryCount), 10000);
    const randomization = Math.random() * 1000;
    return delay + randomization;
  },
  retryCondition: (error) => {
    // Add 523 to the list of retryable status codes
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status >= 500 ||
      error.response?.status === 429 ||
      error.response?.status === 523 ||
      error.response?.status === 530 ||
      error.response?.status === 404
    );
  }
});

// Add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithBackoff(url) {
  return backOff(
    async () => {
      try {
        // Random delay between 2-5 seconds
        await delay(2000 + Math.random() * 3000);

        const response = await client.get(url);
        return cheerio.load(response.data);
      } catch (error) {
        console.error(`Error fetching page ${url}:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });

        // If we get a 523, throw a specific error
        if (error.response?.status === 523) {
          throw new Error('Origin server unreachable (523)');
        }
        throw error;
      }
    },
    {
      numOfAttempts: 5,
      startingDelay: 1000,
      timeMultiple: 2,
      maxDelay: 30000,
      jitter: true
    }
  );
}

export async function fetchTenderDetails(referencia) {
  try {
    const url = `${BASE_URL}/${DETAIL_ENDPOINT}?referencia=${encodeURIComponent(referencia)}`;
    const $ = await fetchWithBackoff(url);

    const details = {};
    $('#lista tbody tr').each((i, element) => {
      const key = $(element).find('th:first').text().trim();

      const value = $(element).find('th:last-child, td:last-child').text().trim();
      if (/valor|garantia/.test(key) && !isNaN(value.replace(/[^\d.-]/g, ''))) {
        details[key] = parseFloat(value.replace(/[^\d.-]/g, ''));
      } else if (key === 'numero_de_lotes' && !isNaN(value)) {
        details[key] = parseInt(value);
      } else {
        details[key] = value;
      }
    });
    $('#lista2 tbody tr').each((i, element) => {
      const link1 = $(element).find('td:first a').attr('href');
      details["Ficheiro do Anuncio"] = "https://www.ufsa.gov.mz/" + link1

      const link2 = $(element).find('td:last-child a').attr('href');
      details["Documento do Concurso"] = "https://www.ufsa.gov.mz/" + link2
    });
    return details;
  } catch (error) {
    console.error('Error fetching tender details:', error);
    throw error;
  }
}

async function fetchConcursos() {
  try {
    const $ = await fetchWithBackoff(`${BASE_URL}${ENDPOINTS.concursos}`);
    const concursos = [];

    $('table tbody tr').each((i, element) => {
      const tipo = $(element).find('td:nth-child(1)').text().trim().replace("Ver detalhes", "").replaceAll("\n", "")
      const concurso = {
        tipo_concurso: tipo.substring(0, tipo.indexOf(':')),
        referencia: tipo.substring(tipo.indexOf(':') + 1),
        objeto: $(element).find('td:nth-child(2)').text().trim(),
        ugea: $(element).find('td:nth-child(3)').text().trim(),
        provincia: $(element).find('td:nth-child(4)').text().trim(),
        data_lancamento: $(element).find('td:nth-child(5)').text().trim(),
        data_abertura: $(element).find('td:nth-child(6)').text().trim().substring(0, 9),
        hora_abertura: $(element).find('td:nth-child(6)').text().trim().substring(10),
        link_detalhes: $(element).find('td:nth-child(1) a').attr('href')
      };
      concursos.push(concurso);
    });

    concursos.pop();
    return concursos;
  } catch (error) {
    console.error('Error fetching concursos:', error.message);
    throw error;
  }
}

// Only fetchConcursos is needed as we're focusing only on open tenders

export async function fetchPdfDocument(referencia, type = 'document') {
  try {
    // Determine the URL based on the type of document requested
    let url;
    let fileName;

    if (type === 'announcement') {
      // URL for the official tender announcement document
      url = `${BASE_URL}/includes/Baixar_anuncio.php?REFERENCIA=${encodeURIComponent(referencia)}`;
      fileName = `anuncio-${referencia}.pdf`;
    } else {
      // URL for the tender terms and references document (default)
      url = `${BASE_URL}/includes/Baixar_cad_enc.php?REFERENCIA=${encodeURIComponent(referencia)}`;
      fileName = `documento-${referencia}.pdf`;
    }

    console.log(`Fetching PDF from: ${url}`);

    // Use axios to fetch the PDF with responseType set to 'arraybuffer'
    const response = await client.get(url, {
      responseType: 'arraybuffer',
      // Don't parse the response as it's binary data
      transformResponse: [(data) => data],
      // Set headers that might help with PDF content
      headers: {
        ...headers,
        'Accept': 'application/pdf,application/octet-stream'
      }
    });

    // Return both the data and content type for proper handling in the route
    return {
      data: response.data,
      contentType: response.headers['content-type'] || 'application/pdf',
      contentLength: response.headers['content-length'],
      fileName: fileName
    };
  } catch (error) {
    console.error('Error fetching PDF document:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    throw error;
  }
}

export async function fetchUfsaData() {
  try {
    const concursos = await fetchConcursos();

    // Add metadata
    const data = {
      meta: {
        ultima_atualizacao: new Date().toISOString(),
        versao: "1.0.0",
        estatisticas: {
          concursos_abertos: concursos.length
        }
      },
      dados: {
        concursos_abertos: concursos
      }
    };

    return data;
  } catch (error) {
    console.error('Error fetching UFSA data:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url || BASE_URL
    });
    throw error;
  }
}