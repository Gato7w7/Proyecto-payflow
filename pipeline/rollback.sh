#!/bin/bash
set -e

NAMESPACE="payflow"
SERVICE_NAME="transaction-validator-service"

echo "Iniciando rollback..."

# Obtener ambiente activo actual
CURRENT_ENV=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}')

if [ -z "$CURRENT_ENV" ]; then
    echo "No se pudo determinar el ambiente activo"
    exit 1
fi

echo "Ambiente activo actual: $CURRENT_ENV"

# Determinar ambiente de rollback
if [ "$CURRENT_ENV" == "blue" ]; then
    ROLLBACK_ENV="green"
else
    ROLLBACK_ENV="blue"
fi

echo "Haciendo rollback a ambiente: $ROLLBACK_ENV"

# Verificar que el ambiente de rollback exista y esté healthy
ROLLBACK_READY=$(kubectl get deployment transaction-validator-$ROLLBACK_ENV -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

if [ "$ROLLBACK_READY" == "0" ]; then
    echo "El ambiente $ROLLBACK_ENV no tiene pods ready. Escalando..."
    kubectl scale deployment/transaction-validator-$ROLLBACK_ENV -n $NAMESPACE --replicas=2
    kubectl rollout status deployment/transaction-validator-$ROLLBACK_ENV -n $NAMESPACE --timeout=2m
fi

# Cambiar tráfico
echo "Cambiando tráfico a $ROLLBACK_ENV..."
kubectl patch service $SERVICE_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"version\":\"$ROLLBACK_ENV\"}}}"

echo "Rollback completado exitosamente"
echo "Ambiente activo ahora: $ROLLBACK_ENV"

# Verificar health
echo "Verificando health del servicio..."
sleep 5
kubectl port-forward -n $NAMESPACE service/$SERVICE_NAME 8080:80 &
PF_PID=$!
sleep 3

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
kill $PF_PID

if [ "$HEALTH_STATUS" == "200" ]; then
    echo "Health check OK"
else
    echo "Health check falló (status: $HEALTH_STATUS)"
fi