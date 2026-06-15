# Sub-Processors Inventory — monitoreo-v2

> Ley 21.719 (Chile) Art. 15: Data controller must inform data subjects of sub-processors.
> PRI-07: Updated list of sub-processors with service, purpose, country, and safeguards.

> 6 sub-processors cataloged. Last updated: 2026-06-15.
> Re-generate: `npm run privacy:inventory`

## Sub-Processors

### Amazon Web Services (AWS)

| Aspect | Detail |
|--------|--------|
| **Services** | ECS Fargate, RDS PostgreSQL, S3, CloudFront, API Gateway, IoT Core, SES, SNS, CloudWatch, ECR, EventBridge |
| **Purpose** | Application hosting, database, storage, CDN, email, SMS, monitoring, IoT ingestion |
| **Country / Region** | United States (us-east-1) |
| **Safeguards** | AWS DPA, SOC 2, ISO 27001, encryption at rest (AES-256) and in transit (TLS 1.2+) |
| **Data Types** | All platform data (readings, user PII encrypted, audit logs, session tokens) |

### Microsoft Azure AD

| Aspect | Detail |
|--------|--------|
| **Services** | OAuth 2.0 / OpenID Connect, MSAL |
| **Purpose** | User authentication (SSO) for enterprise tenants |
| **Country / Region** | United States / Global |
| **Safeguards** | Microsoft DPA, SOC 2, ISO 27001. Only auth tokens exchanged — no PII stored by Microsoft on behalf of platform |
| **Data Types** | OAuth tokens, user email (for identity matching), provider ID |

### Google Cloud (Identity)

| Aspect | Detail |
|--------|--------|
| **Services** | Google Sign-In, OAuth 2.0, JWKS |
| **Purpose** | User authentication (OAuth login) |
| **Country / Region** | United States / Global |
| **Safeguards** | Google DPA, SOC 2, ISO 27001. Only auth tokens exchanged |
| **Data Types** | OAuth tokens, user email (for identity matching), provider ID |

### GitHub

| Aspect | Detail |
|--------|--------|
| **Services** | GitHub Repositories, GitHub Actions |
| **Purpose** | Source code hosting, CI/CD pipeline |
| **Country / Region** | United States |
| **Safeguards** | GitHub DPA, SOC 2. No production data — source code only |
| **Data Types** | Source code, build artifacts, deployment scripts |

### Docker Hub / AWS ECR

| Aspect | Detail |
|--------|--------|
| **Services** | Container registry |
| **Purpose** | Docker image storage for deployments |
| **Country / Region** | United States |
| **Safeguards** | Images contain compiled code only — no PII. ECR lifecycle policy (5 images) |
| **Data Types** | Docker images (compiled application code) |

### Siemens (IoT Core)

| Aspect | Detail |
|--------|--------|
| **Services** | POC3000 MQTT telemetry |
| **Purpose** | Energy meter data ingestion via MQTT over TLS |
| **Country / Region** | Device on-premise (Chile) → AWS IoT Core (us-east-1) |
| **Safeguards** | TLS mutual auth, X.509 certificates, IoT Core policy scoped to powercenter/* topic |
| **Data Types** | Electrical measurements (voltage, current, power, energy) — no PII |

---

## Data Flow Summary

```
User browser → CloudFront (CDN) → API Gateway → ECS Fargate (NestJS)
  → RDS PostgreSQL (encrypted at rest, PII encrypted at app layer)
  → S3 (CSV imports, backups)

Siemens POC3000 → MQTT/TLS → AWS IoT Core → S3 → Lambda → RDS

Auth: Microsoft/Google OAuth → JWT cookies (httpOnly, __Host- prefix)
Email: AWS SES (invitations, alerts)
SMS: AWS SNS (optional invitations)
```
