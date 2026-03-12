#!/usr/bin/env bash
#
# Túnel SSH: localhost:5433 -> RDS energy-monitor (vía bastion EC2 energy-monitor-rds-tunnel en la VPC).
# Uso: ./scripts/tunnel-rds.sh
# Luego: DB_HOST=127.0.0.1 DB_PORT=5433 en backend .env para conectar desde local.
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASTION_HOST="${BASTION_HOST:-44.200.11.139}"
BASTION_USER="${BASTION_USER:-ec2-user}"
KEY="${TUNNEL_SSH_KEY:-$SCRIPT_DIR/energy-monitor-tunnel.pem}"
RDS_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
LOCAL_PORT="${LOCAL_PORT:-5433}"

if [[ ! -f "$KEY" ]]; then
  echo "Clave SSH no encontrada: $KEY. Define TUNNEL_SSH_KEY si la tienes en otra ruta."
  exit 1
fi

echo "Túnel: localhost:$LOCAL_PORT -> $RDS_HOST:5432 (vía $BASTION_USER@$BASTION_HOST)"
echo "Mantén esta ventana abierta. Para el backend local: DB_HOST=127.0.0.1 DB_PORT=$LOCAL_PORT"
exec ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -N -L "${LOCAL_PORT}:${RDS_HOST}:5432" "${BASTION_USER}@${BASTION_HOST}"
