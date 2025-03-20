import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.ufsa.gov.mz';
const ENDPOINTS = {
  concursos: '/query/Busca_concurso1.php',
  adjudicacoes: '/query/Busca_adjudicacao.php',
  ajustesDirectos: '/query/Busca_ajustes_directos.php'
};

const DETAIL_ENDPOINTS = {
  concursos: 'concurso_detalhes.php',
  adjudicacoes: 'adjudicacao_detalhes.php',
  ajustesDirectos: 'ajustes_directos_detalhes.php'
};

// Browser-like headers
const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

// Configure axios with enhanced retry logic
const client = axios.create({
  headers,
  timeout: 30000 // Increased timeout
});

axiosRetry(client, {
  retries: 5,
  retryDelay: (retryCount) => {
    const delay = Math.min(1000 * (2 ** retryCount), 10000);
    const randomization = Math.random() * 1000;
    return delay + randomization;
  },
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status >= 500 ||
      error.response?.status === 429 ||
      error.response?.status === 530 ||
      error.response?.status === 404
    );
  }
});

// Add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPage(url) {
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
    throw error;
  }
}

async function fetchConcursos() {
  try {
    const $ = await fetchPage(`${BASE_URL}${ENDPOINTS.concursos}`);
    const concursos = [];
    
    $('table tbody tr').each((i, element) => {
      const tipo = $(element).find('td:nth-child(1)').text().trim().replace("Ver detalhes","").replaceAll("\n","")
      const concurso = {
        tipo_concurso: tipo.substring(0,tipo.indexOf(':')),
        referencia: tipo.substring(tipo.indexOf(':')+1),
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
    throw error.message;
  }
}

async function fetchAdjudicacoes() {
  try {
    const $ = await fetchPage(`${BASE_URL}${ENDPOINTS.adjudicacoes}`);
    const adjudicacoes = [];

    $('table tbody tr').each((i, element) => {
      const adjudicacao = {
        referencia: $(element).find('td:nth-child(1)').text().trim().replace("Ver detalhes",""),
        objeto: $(element).find('td:nth-child(2)').text().trim(),
        data_adjudicacao: $(element).find('td:nth-child(3)').text().trim(),
        link_detalhes: $(element).find('td:nth-child(1) a').attr('href')
      };
      adjudicacoes.push(adjudicacao);
    });
    adjudicacoes.pop();

    return adjudicacoes;
  } catch (error) {
    console.error('Error fetching adjudicacoes:', error);
    throw error;
  }
}

async function fetchAjustesDirectos() {
  try {
    const $ = await fetchPage(`${BASE_URL}${ENDPOINTS.ajustesDirectos}`);
    const ajustes = [];

    $('table tbody tr').each((i, element) => {
      const contratada = $(element).find('td:nth-child(4)').text().trim()
      const ajuste = {
        referencia: $(element).find('td:nth-child(1)').text().trim().replace("Ver detalhes",""),
        objeto: $(element).find('td:nth-child(2)').text().trim().replace("\n"," "),
        ugea: $(element).find('td:nth-child(3)').text().trim(),
        contratada: contratada.substring(contratada.indexOf(' ')).trim(),
        valor: parseFloat($(element).find('td:nth-child(5)').text().trim().replace(/[^\d.-]/g, '')),
        data: $(element).find('td:nth-child(6)').text().trim(),
        link_detalhes: $(element).find('td:nth-child(1) a').attr('href')
      };
      ajustes.push(ajuste);
    });
    ajustes.pop();

    return ajustes;
  } catch (error) { 
    console.error('Error fetching ajustes directos:', error);
    throw error;
  }
}

async function fetchDetails(type, referencia) {
  try {
    const endpoint = DETAIL_ENDPOINTS[type];
    const url = `${BASE_URL}/${endpoint}?referencia=${encodeURIComponent(referencia)}`;
    const $ = await fetchPage(url);
    
    const details = {};
    $('table tbody tr').each((i, element) => {
      const key = $(element).find('td:nth-child(1)').text().trim().toLowerCase();
      const value = $(element).find('td:nth-child(2)').text().trim();
      details[key] = value;
    });

    return details;
  } catch (error) {
    console.error(`Error fetching details for ${type}:`, error);
    return null;
  }
}

export async function fetchUfsaData() {
  try {
    const [concursos, adjudicacoes, ajustes] = await Promise.all([
      fetchConcursos(),
      fetchAdjudicacoes(),
      fetchAjustesDirectos()
    ]);

    // Add metadata
    const data = {
      meta: {
        ultima_atualizacao: new Date().toISOString(),
        versao: "1.0.0",
        estatisticas: {
          concursos_abertos: concursos.length,
          concursos_adjudicados: adjudicacoes.length,
          ajustes_diretos: ajustes.length
        }
      },
      dados: {
        concursos_abertos: concursos,
        concursos_adjudicados: adjudicacoes,
        ajustes_diretos: ajustes
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