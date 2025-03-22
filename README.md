# UFSA Concursos API Documentation

## Base URL

Development:
```
http://localhost:3000
```

Production:
```
https://ufsa-concursos-api.stackblitz.app
```

> **Note**: Since this API is running locally in development, you'll need to deploy it to make it accessible from other applications. You can deploy it to a platform of your choice or use StackBlitz's deployment features.

## Authentication
Currently, the API is open and does not require authentication.

## Endpoints

### Get All Open Tenders
```http
GET /api/concursos/abertos
```

Query Parameters:
- `provincia` (string): Filter by province
- `tipo_concurso` (string): Filter by tender type
- `entidade` (string): Filter by contracting entity
- `search` (string): Search across all fields
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of results per page

Example Response:
```json
{
  "total": 100,
  "page": 1,
  "totalPages": 10,
  "results": [
    {
      "tipo_concurso": "Concurso Público",
      "referencia": "27A001141/CP/001/2025",
      "objeto": "Fornecimento de Material de Escritório",
      "ugea": "Ministério da Educação",
      "provincia": "Maputo",
      "data_lancamento": "2025-03-19",
      "data_abertura": "2025-04-02",
      "hora_abertura": "10:00"
    }
  ],
  "dataSource": {
    "isUsingPersistedData": false,
    "lastUpdate": "2025-03-20T13:20:21.000Z",
    "retryAttempts": 0
  }
}
```

### Get All Awarded Tenders
```http
GET /api/concursos/adjudicados
```

Query Parameters:
- `search` (string): Search across all fields
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of results per page

Example Response:
```json
{
  "total": 50,
  "page": 1,
  "totalPages": 5,
  "results": [
    {
      "referencia": "27A001141/CP/001/2025",
      "objeto": "Fornecimento de Material de Escritório",
      "data_adjudicacao": "2025-03-15"
    }
  ],
  "dataSource": {
    "isUsingPersistedData": false,
    "lastUpdate": "2025-03-20T13:20:21.000Z",
    "retryAttempts": 0
  }
}
```

### Get All Direct Adjustments
```http
GET /api/concursos/ajustes-directos
```

Query Parameters:
- `entidade` (string): Filter by contracting entity
- `contratada` (string): Filter by contracted company
- `valor_min` (number): Minimum value filter
- `valor_max` (number): Maximum value filter
- `search` (string): Search across all fields
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of results per page

Example Response:
```json
{
  "total": 75,
  "page": 1,
  "totalPages": 8,
  "results": [
    {
      "referencia": "27A001141/AD/001/2025",
      "objeto": "Manutenção de Equipamentos",
      "ugea": "Ministério da Saúde",
      "contratada": "TechServ Lda",
      "valor": 150000.00,
      "data": "2025-03-18"
    }
  ],
  "dataSource": {
    "isUsingPersistedData": false,
    "lastUpdate": "2025-03-20T13:20:21.000Z",
    "retryAttempts": 0
  }
}
```

### Get Dashboard Statistics
```http
GET /api/stats/dashboard
```

Returns comprehensive statistics and analytics about tenders and direct adjustments.

Example Response:
```json
{
  "primary_metrics": {
    "total_open_tenders": 100,
    "total_awarded_tenders": 50,
    "total_direct_adjustments": 75,
    "total_direct_adjustments_value": 15000000.00,
    "growth_rates": {
      "open_tenders": 25.5,
      "awarded_tenders": 10.2,
      "direct_adjustments": -5.3
    }
  },
  "secondary_metrics": {
    "unique_entities": 45,
    "unique_provinces": 11,
    "average_direct_adjustment_value": 200000.00,
    "average_days_until_opening": 15
  },
  "distribution_metrics": {
    "province_distribution": {
      "Maputo": {
        "count": 30,
        "percentage": 30.0
      }
    },
    "tender_type_distribution": {
      "Concurso Público": {
        "count": 50,
        "percentage": 50.0
      }
    },
    "value_distribution": {
      "0-100k": 20,
      "100k-500k": 30,
      "500k-1M": 15,
      "1M-5M": 8,
      "5M+": 2
    }
  },
  "time_based_analytics": {
    "monthly_trends": [
      {
        "month": "2025-03",
        "open_tenders": 35,
        "awarded_tenders": 20,
        "direct_adjustments": 25
      }
    ]
  },
  "entity_analytics": {
    "top_entities": [
      {
        "entity": "Ministério da Educação",
        "count": 25
      }
    ]
  },
  "recent_activity": {
    "recent_awards": [
      {
        "referencia": "27A001141/CP/001/2025",
        "objeto": "Fornecimento de Material de Escritório",
        "data_adjudicacao": "2025-03-15"
      }
    ]
  },
  "period_comparisons": {
    "current_month": {
      "open": 35,
      "awarded": 20,
      "direct": 25
    },
    "previous_month": {
      "open": 28,
      "awarded": 18,
      "direct": 27
    }
  }
}
```

### Get Available Provinces
```http
GET /api/concursos/provincias
```

Example Response:
```json
[
  "Maputo",
  "Gaza",
  "Inhambane",
  "Sofala",
  "Manica"
]
```

### Get Tender Types
```http
GET /api/concursos/tipos
```

Example Response:
```json
[
  "Concurso Público",
  "Concurso Limitado",
  "Concurso por Cotações"
]
```

### Get Contracting Entities
```http
GET /api/concursos/entidades
```

Example Response:
```json
[
  "Ministério da Educação",
  "Ministério da Saúde",
  "Ministério das Obras Públicas"
]
```

### Export Data
```http
GET /api/concursos/export
```

Query Parameters:
- `type` (string, default: 'abertos'): Type of tenders to export ('abertos', 'adjudicados', 'ajustes-directos')
- `format` (string, default: 'json'): Export format ('json', 'csv')

For JSON format, returns the same structure as the respective endpoints.
For CSV format, downloads a file with all records.

### API Status
```http
GET /api/status
```

Example Response:
```json
{
  "status": "operational",
  "isUsingPersistedData": false,
  "lastUpdate": "2025-03-20T13:20:21.000Z",
  "retryAttempts": 0,
  "statistics": {
    "concursos_abertos": 100,
    "concursos_adjudicados": 50,
    "ajustes_diretos": 75
  }
}
```

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 400: Bad Request (invalid parameters)
- 500: Internal Server Error

Error Response Format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Data Source Information

The API includes a `dataSource` object in responses that indicates:
- `isUsingPersistedData`: Whether the data is from cache or live
- `lastUpdate`: When the data was last updated
- `retryAttempts`: Number of failed update attempts

## Rate Limiting

Currently, there are no rate limits implemented.