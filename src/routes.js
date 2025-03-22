import { Router } from 'express';
import { getCache } from './services/cache.js';
import { createObjectCsvWriter } from 'csv-writer';
import { calculateDashboardStats } from './services/statistics.js';
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
        '/api/concursos/adjudicados': 'Get all awarded tenders with filtering options',
        '/api/concursos/ajustes-directos': 'Get all direct adjustments with filtering options',
        '/api/concursos/provincias': 'List all available provinces',
        '/api/concursos/tipos': 'List all tender types',
        '/api/concursos/entidades': 'List all contracting entities',
        '/api/concursos/export': 'Export tenders in CSV or JSON format',
        '/api/stats/dashboard': 'Get dashboard statistics',
        '/api/status': 'Check API status'
      }
    });
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

  // Get all awarded tenders with filtering
  router.get('/api/concursos/adjudicados', (req, res) => {
    const cache = getCache();
    let results = [...cache.tenders.dados.concursos_adjudicados];

    // Apply filters
    const { search, page = 1, limit = 10 } = req.query;

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

  // Get all direct adjustments with filtering
  router.get('/api/concursos/ajustes-directos', (req, res) => {
    const cache = getCache();
    let results = [...cache.tenders.dados.ajustes_diretos];

    // Apply filters
    const { entidade, contratada, valor_min, valor_max, search, page = 1, limit = 10 } = req.query;

    if (entidade) {
      results = results.filter(tender => 
        tender.ugea.toLowerCase().includes(entidade.toLowerCase())
      );
    }

    if (contratada) {
      results = results.filter(tender => 
        tender.contratada.toLowerCase().includes(contratada.toLowerCase())
      );
    }

    if (valor_min) {
      results = results.filter(tender => tender.valor >= parseFloat(valor_min));
    }

    if (valor_max) {
      results = results.filter(tender => tender.valor <= parseFloat(valor_max));
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
    const entidades = [...new Set([
      ...cache.tenders.dados.concursos_abertos.map(tender => tender.ugea),
      ...cache.tenders.dados.ajustes_diretos.map(tender => tender.ugea)
    ])];
    res.json(entidades);
  });

  // Export data
  router.get('/api/concursos/export', async (req, res) => {
    const { type = 'abertos', format = 'json' } = req.query;
    const cache = getCache();
    let data;

    switch (type) {
      case 'abertos':
        data = cache.tenders.dados.concursos_abertos;
        break;
      case 'adjudicados':
        data = cache.tenders.dados.concursos_adjudicados;
        break;
      case 'ajustes-directos':
        data = cache.tenders.dados.ajustes_diretos;
        break;
      default:
        return res.status(400).json({ error: 'Invalid tender type' });
    }

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

  app.use(router);
}