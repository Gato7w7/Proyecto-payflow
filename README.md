# PayFlow MX - Transaction Validator

Microservicio crítico de validación de transacciones para PayFlow MX con observabilidad completa.

##Arquitectura

- **Microservicio**: Node.js + Express
- **Métricas**: Prometheus
- **Logs**: Winston (JSON estructurado)
- **Trazas**: OpenTelemetry + Jaeger
- **CI/CD**: GitHub Actions
- **Despliegue**: Blue/Green en Kubernetes

## Estructura del Proyecto
```
payflow-project/
├── microservice/       # Código del microservicio
├── pipeline/          # Configuración CI/CD
├── monitoring/        # Stack de observabilidad
├── docs/             # Documentación técnica
└── tests/            # Pruebas de carga (k6)
```

## Quick Start

### Ejecutar localmente
```bash
cd microservice
npm install
npm start
```

### Ejecutar con Docker
```bash
docker build -t transaction-validator:v1.0.0 ./microservice
docker run -p 3000:3000 transaction-validator:v1.0.0
```

## Endpoints

- `GET /health` - Health check
- `GET /ready` - Readiness check
- `POST /api/v1/validate` - Validar transacción
- `GET /metrics` - Métricas Prometheus

## SLO/SLA

- **Disponibilidad**: 99.5% mensual
- **Latencia p95**: < 250ms
- **Tasa de error**: < 1%

## Autores

- Johany Carrillo Martinez

## Licencia

MIT
