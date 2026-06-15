import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const AWS_DIR = resolve(__dirname, '..', '..', '..', 'infra', 'aws');
const TF_DIR = resolve(AWS_DIR, 'terraform');

describe('AWS infrastructure scripts', () => {
  describe('CYB-09: WAF setup', () => {
    const script = readFileSync(resolve(AWS_DIR, '01-waf-setup.sh'), 'utf-8');

    it('creates Web ACL for CloudFront', () => {
      expect(script).toContain('wafv2 create-web-acl');
      expect(script).toContain('CLOUDFRONT');
    });

    it('includes AWS managed rule groups', () => {
      expect(script).toContain('AWSManagedRulesCommonRuleSet');
      expect(script).toContain('AWSManagedRulesSQLiRuleSet');
      expect(script).toContain('AWSManagedRulesKnownBadInputsRuleSet');
    });

    it('includes IP rate limiting', () => {
      expect(script).toContain('RateBasedStatement');
      expect(script).toContain('"Limit": 2000');
    });

    it('associates with CloudFront distribution', () => {
      expect(script).toContain('associate-web-acl');
      expect(script).toContain('ECR03RA6F872Q');
    });

    it('supports dry-run mode', () => {
      expect(script).toContain('--dry-run');
      expect(script).toContain('DRY RUN');
    });
  });

  describe('CYB-22: GuardDuty enable', () => {
    const script = readFileSync(resolve(AWS_DIR, '02-guardduty-enable.sh'), 'utf-8');

    it('creates GuardDuty detector', () => {
      expect(script).toContain('guardduty create-detector');
      expect(script).toContain('--enable');
    });

    it('enables S3, ECS, and RDS monitoring', () => {
      expect(script).toContain('S3_DATA_EVENTS');
      expect(script).toContain('ECS_RUNTIME_MONITORING');
      expect(script).toContain('RDS_LOGIN_EVENTS');
    });

    it('creates SNS topic for findings', () => {
      expect(script).toContain('sns create-topic');
      expect(script).toContain('guardduty-findings');
    });

    it('supports dry-run mode', () => {
      expect(script).toContain('--dry-run');
    });
  });

  describe('CYB-13: Inspector enable', () => {
    const script = readFileSync(resolve(AWS_DIR, '03-inspector-enable.sh'), 'utf-8');

    it('enables Inspector v2', () => {
      expect(script).toContain('inspector2 enable');
    });

    it('scans ECR, Lambda, and EC2', () => {
      expect(script).toContain('ECR');
      expect(script).toContain('LAMBDA');
      expect(script).toContain('EC2');
    });

    it('configures enhanced ECR scanning', () => {
      expect(script).toContain('ENHANCED');
      expect(script).toContain('SCAN_ON_PUSH');
    });

    it('supports dry-run mode', () => {
      expect(script).toContain('--dry-run');
    });
  });

  describe('DAT-01: RDS Read Replica', () => {
    const script = readFileSync(resolve(AWS_DIR, '04-rds-read-replica.sh'), 'utf-8');

    it('creates read replica from source', () => {
      expect(script).toContain('create-db-instance-read-replica');
      expect(script).toContain('monitoreo-v2-db');
      expect(script).toContain('monitoreo-v2-db-replica');
    });

    it('uses appropriate instance class', () => {
      expect(script).toContain('db.t3.small');
    });

    it('is not publicly accessible', () => {
      expect(script).toContain('--no-publicly-accessible');
    });

    it('enables performance insights', () => {
      expect(script).toContain('--enable-performance-insights');
    });

    it('waits for replica availability', () => {
      expect(script).toContain('rds wait db-instance-available');
    });

    it('supports dry-run mode', () => {
      expect(script).toContain('--dry-run');
    });
  });

  describe('ARQ-16: Terraform IaC', () => {
    const tf = readFileSync(resolve(TF_DIR, 'main.tf'), 'utf-8');

    it('Terraform file exists', () => {
      expect(existsSync(resolve(TF_DIR, 'main.tf'))).toBe(true);
    });

    it('requires AWS provider', () => {
      expect(tf).toContain('hashicorp/aws');
      expect(tf).toContain('required_version');
    });

    it('defines RDS instance', () => {
      expect(tf).toContain('aws_db_instance');
      expect(tf).toContain('monitoreo-v2-db');
      expect(tf).toContain('storage_encrypted');
      expect(tf).toContain('deletion_protection');
    });

    it('defines ECS cluster and service', () => {
      expect(tf).toContain('aws_ecs_cluster');
      expect(tf).toContain('aws_ecs_service');
      expect(tf).toContain('FARGATE');
    });

    it('defines S3 bucket with versioning and encryption', () => {
      expect(tf).toContain('aws_s3_bucket');
      expect(tf).toContain('aws_s3_bucket_versioning');
      expect(tf).toContain('AES256');
    });

    it('defines CloudFront distribution', () => {
      expect(tf).toContain('aws_cloudfront_distribution');
      expect(tf).toContain('redirect-to-https');
    });

    it('defines ECR with scan-on-push and lifecycle', () => {
      expect(tf).toContain('aws_ecr_repository');
      expect(tf).toContain('scan_on_push');
      expect(tf).toContain('aws_ecr_lifecycle_policy');
    });

    it('exports key outputs', () => {
      expect(tf).toContain('output "rds_endpoint"');
      expect(tf).toContain('output "ecs_cluster_arn"');
      expect(tf).toContain('output "cloudfront_domain"');
    });

    it('tags resources with Anexo 07 IDs', () => {
      expect(tf).toContain('Anexo07');
    });
  });
});
