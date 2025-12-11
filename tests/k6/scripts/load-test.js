import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const successfulTransactions = new Counter('successful_transactions');
const transactionDuration = new Trend('transaction_duration');

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp-up a 10 usuarios
    { duration: '5m', target: 10 },  // Mantener 10 usuarios
    { duration: '2m', target: 20 },  // Ramp-up a 20 usuarios
    { duration: '5m', target: 20 },  // Mantener 20 usuarios
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<600'],
    errors: ['rate<0.05'], // Máximo 5% de errores
    successful_transactions: ['count>1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const payload = JSON.stringify({
    transactionId: `load-${Date.now()}-${__VU}-${__ITER}`,
    amount: Math.floor(Math.random() * 50000) + 100,
    currency: 'MXN',
    userId: `user-${__VU}`,
    merchantId: `merchant-${Math.floor(Math.random() * 100)}`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { test_type: 'load' },
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/v1/validate`, payload, params);
  const duration = Date.now() - startTime;

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'status is not 500': (r) => r.status !== 500,
    'has transaction result': (r) => r.json('transactionId') !== undefined,
    'latency acceptable': (r) => r.timings.duration < 500,
  });

  if (success) {
    successfulTransactions.add(1);
    transactionDuration.add(duration);
  } else {
    errorRate.add(1);
  }

  sleep(Math.random() * 2 + 1); // Sleep entre 1-3 segundos
}