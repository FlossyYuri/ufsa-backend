import { Router } from 'express';
import { getCache } from './services/cache.js';
import { createObjectCsvWriter } from 'csv-writer';
import { calculateDashboardStats } from './services/statistics.js';
import { fetchTenderDetails, fetchPdfDocument } from './services/scraper.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupRoutes(app) {
  const router = Router();

  // Home route with API documentation
  router.get('/', (req, res) => {
    res.json({
      message: 'UFSA Concursos API',
      endpoints: {
        '/api/concursos/abertos': 'Get all open tenders with filtering options',
        '/api/concursos/provincias': 'List all available provinces',
        '/api/concursos/tipos': 'List all tender types',
        '/api/concursos/entidades': 'List all contracting entities',
        '/api/concursos/export': 'Export open tenders in CSV or JSON format',
        '/api/stats/dashboard': 'Get dashboard statistics for open tenders',
        '/api/concursos/detalhes?referencia=1': 'Get detailed information for a specific tender (use ?referencia=value)',
        '/api/proxy-pdf?referencia=1&type=document': 'Proxy for PDF documents from the remote server. Use type=document (default) for tender documents or type=announcement for tender announcements',
        '/api/status': 'Check API status'
      }
    });
  });

  // Get tender details
  router.get('/api/concursos/detalhes', async (req, res) => {
    try {
      const { referencia } = req.query;
      if (!referencia) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Tender reference is required as a query parameter'
        });
      }

      const details = await fetchTenderDetails(referencia);

      if (!details) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tender details not found'
        });
      }

      res.json(details);
    } catch (error) {
      console.error('Error fetching tender details:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch tender details'
      });
    }
  });

  // Dashboard Statistics
  router.get('/api/stats/dashboard', (req, res) => {
    const cache = getCache();
    const stats = calculateDashboardStats(cache.tenders.dados);
    res.json(stats);
  });

  // Get all open tenders with filtering
  router.get('/api/concursos/abertos', (req, res) => {
    const cache = getCache();
    let results = [...cache.tenders.dados.concursos_abertos];

    // Apply filters
    const { provincia, tipo_concurso, entidade, search, page = 1, limit = 10 } = req.query;

    if (provincia) {
      results = results.filter(tender =>
        tender.provincia.toLowerCase() === provincia.toLowerCase()
      );
    }

    if (tipo_concurso) {
      results = results.filter(tender =>
        tender.tipo_concurso.toLowerCase() === tipo_concurso.toLowerCase()
      );
    }

    if (entidade) {
      results = results.filter(tender =>
        tender.ugea.toLowerCase().includes(entidade.toLowerCase())
      );
    }

    if (search) {
      results = results.filter(tender =>
        Object.values(tender).some(value =>
          value && value.toString().toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = results.length;

    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      results: paginatedResults,
      dataSource: cache.status
    });
  });

  // Removed endpoints for awarded tenders and direct adjustments

  // Get all provinces
  router.get('/api/concursos/provincias', (req, res) => {
    const cache = getCache();
    const provincias = [...new Set(cache.tenders.dados.concursos_abertos.map(tender => tender.provincia))];
    res.json(provincias);
  });

  // Get all tender types
  router.get('/api/concursos/tipos', (req, res) => {
    const cache = getCache();
    const tipos = [...new Set(cache.tenders.dados.concursos_abertos.map(tender => tender.tipo_concurso))];
    res.json(tipos);
  });

  // Get all contracting entities
  router.get('/api/concursos/entidades', (req, res) => {
    const cache = getCache();
    const entidades = [...new Set(
      cache.tenders.dados.concursos_abertos.map(tender => tender.ugea)
    )];
    res.json(entidades);
  });

  // Export data
  router.get('/api/concursos/export', async (req, res) => {
    const { format = 'json' } = req.query;
    const cache = getCache();
    const data = cache.tenders.dados.concursos_abertos;

    if (format === 'csv') {
      const headers = Object.keys(data[0]).map(key => ({
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
      }));

      const csvWriter = createObjectCsvWriter({
        path: path.join(__dirname, '../temp/export.csv'),
        header: headers
      });

      await csvWriter.writeRecords(data);
      res.download(path.join(__dirname, '../temp/export.csv'));
    } else {
      res.json({
        data,
        dataSource: cache.status
      });
    }
  });

  // API status
  router.get('/api/status', (req, res) => {
    const cache = getCache();
    res.json({
      status: 'operational',
      ...cache.status,
      statistics: cache.tenders.meta.estatisticas
    });
  });

  // PDF Proxy endpoint
  router.get('/api/proxy-pdf', async (req, res) => {
    try {
      const { referencia, type } = req.query;

      if (!referencia) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Reference number (referencia) is required as a query parameter'
        });
      }

      // Validate referencia to prevent abuse (only allow alphanumeric and some special chars)
      if (!/^[a-zA-Z0-9\-\/._\s%]+$/.test(referencia)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid reference number format'
        });
      }

      // Determine document type (announcement or document)
      const documentType = type === 'announcement' ? 'announcement' : 'document';

      // Fetch the PDF document
      const pdfResponse = await fetchPdfDocument(referencia, documentType);

      // Set appropriate headers for PDF response
      res.setHeader('Content-Type', pdfResponse.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdfResponse.fileName}"`);

      if (pdfResponse.contentLength) {
        res.setHeader('Content-Length', pdfResponse.contentLength);
      }

      // Send the PDF data
      res.send(pdfResponse.data);

    } catch (error) {
      console.error('Error proxying PDF:', error);

      // Handle different types of errors
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx range
        if (error.response.status === 404) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'The requested PDF document could not be found'
          });
        } else {
          return res.status(error.response.status || 500).json({
            error: 'Remote Server Error',
            message: 'The remote server returned an error'
          });
        }
      } else if (error.request) {
        // The request was made but no response was received
        return res.status(504).json({
          error: 'Gateway Timeout',
          message: 'The remote server did not respond in time'
        });
      } else {
        // Something happened in setting up the request
        return res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while processing your request'
        });
      }
    }
  });

  app.use(router);
}