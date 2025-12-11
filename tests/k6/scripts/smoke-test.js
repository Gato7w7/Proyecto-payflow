import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métrica personalizada para tasa de errores
const errorRate = new Rate('errors');

export const options = {
  vus: 1, // 1 usuario virtual
  duration: '1m', // 1 minuto
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de requests < 500ms
    errors: ['rate<0.1'], // Menos del 10% de errores
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // Test 1: Health check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response has status': (r) => r.json('status') === 'healthy',
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Ready check
  let readyRes = http.get(`${BASE_URL}/ready`);
  check(readyRes, {
    'ready status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Validate transaction
  const payload = JSON.stringify({
    transactionId: `txn-${Date.now()}-${Math.random()}`,
    amount: Math.floor(Math.random() * 10000) + 100,
    currency: 'MXN',
    userId: `user-${Math.floor(Math.random() * 1000)}`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  let validateRes = http.post(`${BASE_URL}/api/v1/validate`, payload, params);
  
  const validateCheck = check(validateRes, {
    'validate status is 200 or 500': (r) => r.status === 200 || r.status === 500,
    'validate has response': (r) => r.body.length > 0,
    'validate latency < 300ms': (r) => r.timings.duration < 300,
  });

  if (!validateCheck) {
    errorRate.add(1);
  }

  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '../results/smoke-test-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;
  
  let output = '\n' + indent + '█▀▀ █▀▄▀█ █▀█ █▄▀ █▀▀   ▀█▀ █▀▀ █▀ ▀█▀\n';
  output += indent + '▄▄█ █░▀░█ █▄█ █░█ ██▄   ░█░ ██▄ ▄█ ░█░\n\n';
  
  const metrics = data.metrics;
  
  output += indent + '✓ Checks........................: ' + 
    (metrics.checks.values.passes / (metrics.checks.values.passes + metrics.checks.values.fails) * 100).toFixed(2) + '%\n';
  output += indent + '✓ HTTP req duration.............: avg=' + metrics.http_req_duration.values.avg.toFixed(2) + 'ms ' +
    'p(95)=' + metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms\n';
  output += indent + '✓ HTTP requests.................: ' + metrics.http_reqs.values.count + ' total\n';
  output += indent + '✓ Iteration duration............: avg=' + metrics.iteration_duration.values.avg.toFixed(2) + 'ms\n';
  output += indent + '✓ Errors........................: ' + (metrics.errors ? (metrics.errors.values.rate * 100).toFixed(2) : '0.00') + '%\n\n';
  
  return output;
}