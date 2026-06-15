#!/usr/bin/env bash
set -euo pipefail

# INT-04 — Certificate rotation for TLS connections.
#
# Components:
#   1. ACM (CloudFront + ALB)  — auto-renewed by AWS, no action needed
#   2. IoT Core (Siemens MQTT) — rotate device cert via AWS IoT
#   3. RDS CA bundle           — download latest, restart if changed
#
# Usage:
#   ./05-cert-rotation.sh [--dry-run]
#   ./05-cert-rotation.sh --iot-only
#   ./05-cert-rotation.sh --rds-only

REGION="${AWS_REGION:-us-east-1}"
DRY_RUN=false
IOT_ONLY=false
RDS_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --iot-only) IOT_ONLY=true ;;
    --rds-only) RDS_ONLY=true ;;
  esac
done

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"; }

# ── 1. ACM status check ─────────────────────────────────
check_acm() {
  log "Checking ACM certificate status..."
  local certs
  certs=$(aws acm list-certificates --region "$REGION" \
    --query "CertificateSummaryList[?Status!='ISSUED'].{Domain:DomainName,Status:Status}" \
    --output text 2>/dev/null || echo "")

  if [ -n "$certs" ]; then
    log "WARNING: Non-ISSUED ACM certificates found:"
    echo "$certs"
  else
    log "All ACM certificates are ISSUED (auto-renewal active)"
  fi
}

# ── 2. IoT Core cert rotation ───────────────────────────
rotate_iot_cert() {
  local thing_name="${IOT_THING_NAME:-siemens-poc3000}"
  log "Rotating IoT Core cert for thing: $thing_name"

  # List current certificates
  local current_certs
  current_certs=$(aws iot list-thing-principals --thing-name "$thing_name" --region "$REGION" \
    --query "principals" --output text 2>/dev/null || echo "")

  if [ -z "$current_certs" ]; then
    log "No certificates found for $thing_name — skipping"
    return
  fi

  if $DRY_RUN; then
    log "[DRY-RUN] Would create new cert, attach to $thing_name, deactivate old"
    return
  fi

  # Create new certificate
  local new_cert
  new_cert=$(aws iot create-keys-and-certificate --set-as-active --region "$REGION" \
    --query "{certArn:certificateArn,certId:certificateId}" --output json)

  local new_arn
  new_arn=$(echo "$new_cert" | python3 -c "import sys,json;print(json.load(sys.stdin)['certArn'])")
  local new_id
  new_id=$(echo "$new_cert" | python3 -c "import sys,json;print(json.load(sys.stdin)['certId'])")

  log "New certificate created: $new_id"

  # Copy policy from old cert to new
  local old_arn
  old_arn=$(echo "$current_certs" | head -1)
  local old_id
  old_id=$(echo "$old_arn" | grep -o '[^/]*$')

  local policies
  policies=$(aws iot list-attached-policies --target "$old_arn" --region "$REGION" \
    --query "policies[].policyName" --output text 2>/dev/null || echo "")

  for policy in $policies; do
    aws iot attach-policy --policy-name "$policy" --target "$new_arn" --region "$REGION"
    log "Attached policy $policy to new cert"
  done

  # Attach new cert to thing
  aws iot attach-thing-principal --thing-name "$thing_name" --principal "$new_arn" --region "$REGION"
  log "Attached new cert to $thing_name"

  # Deactivate old cert (do not delete yet — allow graceful transition)
  aws iot update-certificate --certificate-id "$old_id" --new-status INACTIVE --region "$REGION"
  log "Deactivated old cert: $old_id"

  log "IoT cert rotation complete. Deploy new cert to device, then delete old."
}

# ── 3. RDS CA bundle update ─────────────────────────────
update_rds_ca() {
  local bundle_path="backend/certs/rds-global-bundle.pem"
  local bundle_url="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"

  log "Checking RDS CA bundle..."

  local current_hash=""
  if [ -f "$bundle_path" ]; then
    current_hash=$(shasum -a 256 "$bundle_path" | cut -d' ' -f1)
  fi

  if $DRY_RUN; then
    log "[DRY-RUN] Would download $bundle_url and compare with $bundle_path"
    return
  fi

  local tmp_bundle="/tmp/rds-global-bundle-new.pem"
  curl -sS -o "$tmp_bundle" "$bundle_url"
  local new_hash
  new_hash=$(shasum -a 256 "$tmp_bundle" | cut -d' ' -f1)

  if [ "$current_hash" = "$new_hash" ]; then
    log "RDS CA bundle is up to date"
    rm -f "$tmp_bundle"
    return
  fi

  cp "$tmp_bundle" "$bundle_path"
  rm -f "$tmp_bundle"
  log "RDS CA bundle updated — redeploy backend to pick up new bundle"
}

# ── Main ─────────────────────────────────────────────────
log "Certificate rotation check started (dry-run=$DRY_RUN)"

if ! $IOT_ONLY && ! $RDS_ONLY; then
  check_acm
  rotate_iot_cert
  update_rds_ca
elif $IOT_ONLY; then
  rotate_iot_cert
elif $RDS_ONLY; then
  update_rds_ca
fi

log "Done."
