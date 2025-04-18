# UFSA Concursos Abertos API Documentation

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

## PDF Proxy

The API includes a PDF proxy feature that allows you to fetch PDF documents from the UFSA website through the API. This solves CORS issues and ensures proper content-type handling.

### Get Tender Document (Terms and References)

```http
GET /api/proxy-pdf?referencia=CR04J080441CC00032025&type=document
```

### Get Tender Announcement

```http
GET /api/proxy-pdf?referencia=03/04I130241/SDSMASV%202025&type=announcement
```

Query Parameters:

- `referencia` (string, required): The reference number of the tender
- `type` (string, optional): The type of document to fetch
  - `document` (default): Fetches the tender terms and references document
  - `announcement`: Fetches the official tender announcement document

Response:

- Content-Type: application/pdf
- Content-Disposition: inline; filename="[filename].pdf"

The PDF will be streamed directly to the client and can be displayed in a browser or downloaded.

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

<!-- Removed sections for awarded tenders and direct adjustments -->

### Get Dashboard Statistics

```http
GET /api/stats/dashboard
```

Returns comprehensive statistics and analytics about open tenders, including upcoming tenders, geographical insights, content analysis, and more.

Example Response:

```json
{
  "meta": {
    "generated_at": "2025-04-10T14:30:45.123Z",
    "current_date": "2025-04-10",
    "data_source": {
      "total_tenders_analyzed": 100
    }
  },
  "primary_metrics": {
    "total_open_tenders": 100,
    "growth_rates": {
      "open_tenders": 25.5
    },
    "upcoming_tenders": {
      "next_7_days": 12,
      "next_14_days": 18,
      "next_30_days": 35
    }
  },
  "secondary_metrics": {
    "unique_entities": 45,
    "unique_provinces": 11,
    "average_days_until_opening": 15,
    "time_to_opening_distribution": {
      "already_opened": 10,
      "1-7_days": 12,
      "8-14_days": 6,
      "15-30_days": 17,
      "more_than_30_days": 55
    }
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
    }
  },
  "time_based_analytics": {
    "monthly_trends": [
      {
        "month": "2025-03",
        "open_tenders": 35
      }
    ],
    "tender_types_trend": [
      {
        "month": "2025-03",
        "Concurso Público": 20,
        "Concurso Limitado": 10,
        "Concurso por Cotações": 5
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
  "geographical_insights": {
    "Maputo": {
      "count": 30,
      "percentage": 30.0,
      "types": {
        "Concurso Público": {
          "count": 15,
          "percentage": 50.0
        },
        "Concurso Limitado": {
          "count": 10,
          "percentage": 33.3
        },
        "Concurso por Cotações": {
          "count": 5,
          "percentage": 16.7
        }
      }
    }
  },
  "content_analytics": {
    "common_keywords": [
      {
        "word": "fornecimento",
        "count": 25
      },
      {
        "word": "construção",
        "count": 18
      }
    ]
  },
  "recent_tenders": [
    {
      "referencia": "27A001141/CP/001/2025",
      "objeto": "Fornecimento de Material de Escritório",
      "ugea": "Ministério da Educação",
      "provincia": "Maputo",
      "data_lancamento": "2025-04-05",
      "data_abertura": "2025-04-20"
    }
  ],
  "period_comparisons": {
    "current_month": {
      "open": 35
    },
    "previous_month": {
      "open": 28
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
    "concursos_abertos": 100
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

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ufsa-concursos-api.git
cd ufsa-concursos-api

# Install dependencies
yarn install

# Copy the example environment file
cp .env.example .env

# Start the server
yarn start
```

## Environment Variables

The application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=3000                   # Port to run the server on
NODE_ENV=development        # Environment (development, production)

# UFSA API Configuration
UFSA_BASE_URL=https://www.ufsa.gov.mz  # Base URL for UFSA website

# Persistence API Configuration
PERSISTENCE_API_URL=https://ejitech.co.mz/data-api.php  # API for data persistence

# Cache Configuration (in milliseconds)
CACHE_INTERVAL=28800000     # Cache refresh interval (8 hours)
MAX_RETRY_ATTEMPTS=2        # Maximum retry attempts for cache updates
RETRY_DELAY=300000          # Delay between retry attempts (5 minutes)

# Request Configuration
REQUEST_MIN_DELAY=2000      # Minimum delay between requests (2 seconds)
REQUEST_MAX_DELAY=5000      # Maximum delay between requests (5 seconds)
REQUEST_MAX_ATTEMPTS=5      # Maximum retry attempts for requests
```
