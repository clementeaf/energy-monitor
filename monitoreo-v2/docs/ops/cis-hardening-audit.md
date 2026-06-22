# CIS Hardening Audit — Energy Monitor Platform

> Generated: 2026-06-20
> Based on: CIS AWS Foundations Benchmark v3.0, CIS Docker Benchmark v1.6

## Summary

| ECS Fargate | 6 OK | 2 REVIEW | 8 total |
| RDS PostgreSQL | 7 OK | 2 REVIEW | 9 total |
| S3 | 4 OK | 1 REVIEW | 5 total |
| CloudFront | 2 OK | 2 REVIEW | 4 total |
| IAM / Access | 4 OK | 1 REVIEW | 5 total |

**Total: 23 OK, 8 REVIEW, 31 checks**

## ECS Fargate

| ID | Control | Status | Notes |
|----|---------|--------|-------|
| ECS-01 | Task definition uses non-root user | ✅ OK | Dockerfile: USER node |
| ECS-02 | Read-only root filesystem | ✅ OK | readonlyRootFilesystem: true in task def |
| ECS-03 | No privileged containers | ✅ OK | Fargate does not allow privileged mode |
| ECS-04 | CloudWatch logs enabled | ✅ OK | awslogs driver configured |
| ECS-05 | Task role follows least privilege | 🔍 REVIEW | Review task role policy quarterly |
| ECS-06 | Platform version is latest | ✅ OK | LATEST (1.4.0+) |
| ECS-07 | Secrets via SSM/Secrets Manager, not env vars | 🔍 REVIEW | DB_PASSWORD via env — migrate to Secrets Manager |
| ECS-08 | Network mode awsvpc with security groups | ✅ OK | Fargate requires awsvpc |

## RDS PostgreSQL

| ID | Control | Status | Notes |
|----|---------|--------|-------|
| RDS-01 | Encryption at rest enabled | ✅ OK | StorageEncrypted: true (AES-256) |
| RDS-02 | SSL/TLS enforced for connections | ✅ OK | rds.force_ssl=1, rejectUnauthorized: true |
| RDS-03 | Not publicly accessible | ✅ OK | PubliclyAccessible: false |
| RDS-04 | Automated backups enabled | ✅ OK | BackupRetentionPeriod: 7 days |
| RDS-05 | Minor version auto-upgrade | ✅ OK | AutoMinorVersionUpgrade: true |
| RDS-06 | Enhanced monitoring enabled | 🔍 REVIEW | Enable Performance Insights |
| RDS-07 | Deletion protection enabled | ✅ OK | DeletionProtection: true |
| RDS-08 | Multi-AZ for production | 🔍 REVIEW | Currently single-AZ — upgrade for HA |
| RDS-09 | Database audit logging | ✅ OK | pgaudit or audit_logs hypertable |

## S3

| ID | Control | Status | Notes |
|----|---------|--------|-------|
| S3-01 | Block public access enabled | ✅ OK | BlockPublicAcls + RestrictPublicBuckets |
| S3-02 | Server-side encryption | ✅ OK | SSE-S3 (AES-256) |
| S3-03 | Versioning enabled | ✅ OK | Frontend + data buckets |
| S3-04 | Access logging enabled | 🔍 REVIEW | Enable server access logging to audit bucket |
| S3-05 | Lifecycle policies configured | ✅ OK | Export jobs purged after 90 days |

## CloudFront

| ID | Control | Status | Notes |
|----|---------|--------|-------|
| CF-01 | HTTPS only (redirect HTTP) | ✅ OK | ViewerProtocolPolicy: redirect-to-https |
| CF-02 | TLS 1.2 minimum | ✅ OK | MinimumProtocolVersion: TLSv1.2_2021 |
| CF-03 | WAF associated | 🔍 REVIEW | Script ready — run 01-waf-setup.sh (CYB-09) |
| CF-04 | Access logging enabled | 🔍 REVIEW | Enable standard logging to S3 |

## IAM / Access

| ID | Control | Status | Notes |
|----|---------|--------|-------|
| IAM-01 | Root account MFA enabled | ✅ OK | Verified in console |
| IAM-02 | No root access keys | ✅ OK | No root access keys exist |
| IAM-03 | IAM roles use least privilege | 🔍 REVIEW | Quarterly review checklist in security-processes.md |
| IAM-04 | CloudTrail enabled in all regions | ✅ OK | Multi-region trail active |
| IAM-05 | Password policy enforced | ✅ OK | OAuth-only — no IAM console passwords for app users |

## Remediation Plan

| Priority | ID | Action |
|----------|----|--------|
| Medium | ECS-05 | Review task role policy quarterly |
| Medium | ECS-07 | DB_PASSWORD via env — migrate to Secrets Manager |
| Medium | RDS-06 | Enable Performance Insights |
| Medium | RDS-08 | Currently single-AZ — upgrade for HA |
| Medium | S3-04 | Enable server access logging to audit bucket |
| Medium | CF-03 | Script ready — run 01-waf-setup.sh (CYB-09) |
| Medium | CF-04 | Enable standard logging to S3 |
| Medium | IAM-03 | Quarterly review checklist in security-processes.md |
