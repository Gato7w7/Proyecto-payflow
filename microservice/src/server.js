const express = require('express');
const promBundle = require('express-prom-bundle');
const { logger } = require('./utils/logger');
const { initTracing } = require('./utils/tracing');
const { register, collectDefaultMetrics } = require('prom-client');

// Inicializar trazas distribuidas
initTracing('transaction-validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Métricas de Prometheus (automáticas)
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { service: 'transaction-validator' },
  promClient: { collectDefaultMetrics: {} }
});
app.use(metricsMiddleware);

// Logging de todas las peticiones HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// ========== ENDPOINTS ==========

// Health check (para Kubernetes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'transaction-validator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// 🔥 ENDPOINT PRINCIPAL: Validar transacción
app.post('/api/v1/validate', async (req, res) => {
  const { transactionId, amount, currency, userId } = req.body;
  
  logger.info('Transaction validation started', { transactionId, amount, userId });

  // Validar campos requeridos
  if (!transactionId || !amount || !currency || !userId) {
    logger.warn('Invalid transaction data', { transactionId });
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'transactionId, amount, currency, and userId are required'
    });
  }

  // Simular latencia variable (50-200ms) - PROBLEMA DEL ESCENARIO
  const latency = Math.random() * 150 + 50;
  await new Promise(resolve => setTimeout(resolve, latency));

  // Simular 0.8% de errores 500 - PROBLEMA DEL ESCENARIO
  const shouldFail = Math.random() < 0.008;
  
  if (shouldFail) {
    logger.error('Transaction validation failed', { transactionId });
    return res.status(500).json({
      error: 'Internal validation error',
      transactionId,
      timestamp: new Date().toISOString()
    });
  }

  // Validación exitosa
  const result = {
    transactionId,
    status: 'approved',
    amount,
    currency,
    userId,
    validatedAt: new Date().toISOString(),
    validationDuration: `${latency.toFixed(2)}ms`
  };

  logger.info('Transaction validated successfully', { transactionId });
  res.json(result);
});

// Endpoint para simular ALTA LATENCIA (para pruebas)
app.post('/api/v1/validate-slow', async (req, res) => {
  const { transactionId } = req.body;
  logger.warn('Slow endpoint called', { transactionId });
  
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 500));
  
  res.json({
    transactionId,
    status: 'approved',
    warning: 'High latency simulation',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para forzar ERRORES (para pruebas)
app.post('/api/v1/validate-error', (req, res) => {
  const { transactionId } = req.body;
  logger.error('Error endpoint called', { transactionId });
  
  res.status(500).json({
    error: 'Forced error for testing',
    transactionId,
    timestamp: new Date().toISOString()
  });
});

// Endpoint de métricas para Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// 404 para rutas no encontradas
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path });
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 Transaction Validator started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
