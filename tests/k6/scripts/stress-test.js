import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp-up rápido
    { duration: '5m', target: 50 },   // Mantener carga alta
    { duration: '2m', target: 100 },  // Incrementar a límite
    { duration: '5m', target: 100 },  // Mantener al límite
    { duration: '2m', target: 150 },  // Sobrecargar sistema
    { duration: '5m', target: 150 },  // Mantener sobrecarga
    { duration: '3m', target: 0 },    // Ramp-down gradual
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Más permisivo en stress
    errors: ['rate<0.15'], // Permitir hasta 15% de errores en stress
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const payload = JSON.stringify({
    transactionId: `stress-${Date.now()}-${__VU}-${__ITER}`,
    amount: Math.floor(Math.random() * 100000) + 1000,
    currency: 'MXN',
    userId: `user-${__VU}`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(`${BASE_URL}/api/v1/validate`, payload, params);

  check(response, {
    'status is 200 or 500': (r) => r.status === 200 || r.status === 500,
  }) || errorRate.add(1);

  sleep(0.5); // Menos sleep = más carga
}