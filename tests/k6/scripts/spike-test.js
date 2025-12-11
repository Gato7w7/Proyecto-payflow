import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Carga normal
    { duration: '1m', target: 10 },    // Mantener
    { duration: '30s', target: 200 },  // SPIKE repentino
    { duration: '3m', target: 200 },   // Mantener spike
    { duration: '30s', target: 10 },   // Bajar a normal
    { duration: '1m', target: 10 },    // Mantener normal
    { duration: '30s', target: 0 },    // Finalizar
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Muy permisivo
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const payload = JSON.stringify({
    transactionId: `spike-${Date.now()}-${__VU}`,
    amount: Math.random() * 10000,
    currency: 'MXN',
  });

  http.post(`${BASE_URL}/api/v1/validate`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  sleep(1);
}