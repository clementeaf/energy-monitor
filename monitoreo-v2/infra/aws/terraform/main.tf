# ARQ-16: Infrastructure as Code — Energy Monitor v2
#
# Describes the existing AWS infrastructure.
# Import existing resources with: terraform import <resource> <id>
#
# Usage:
#   cd infra/aws/terraform
#   terraform init
#   terraform plan
#   terraform import aws_cloudfront_distribution.frontend ECR03RA6F872Q
#   terraform import aws_db_instance.main monitoreo-v2-db

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# ──────────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────────

variable "region" {
  default     = "us-east-1"
  description = "AWS region"
}

variable "project" {
  default     = "energy-monitor"
  description = "Project name for tagging"
}

variable "db_instance_class" {
  default     = "db.t3.small"
  description = "RDS instance class"
}

variable "ecs_cluster_name" {
  default     = "energy-monitor-cluster"
  description = "ECS cluster name"
}

# ──────────────────────────────────────────────────
# RDS PostgreSQL (TimescaleDB)
# ──────────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier     = "monitoreo-v2-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  storage_type          = "gp3"

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:05:00-sun:06:00"

  publicly_accessible          = false
  deletion_protection          = true
  skip_final_snapshot          = false
  final_snapshot_identifier    = "monitoreo-v2-db-final"
  copy_tags_to_snapshot        = true
  performance_insights_enabled = true

  tags = {
    Project = var.project
    Anexo07 = "ARQ-02,ARQ-11,ARQ-12"
  }

  lifecycle {
    ignore_changes = [password, engine_version]
  }
}

# ──────────────────────────────────────────────────
# ECS Fargate
# ──────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Project = var.project
    Anexo07 = "ARQ-13,CYB-14"
  }
}

resource "aws_ecs_service" "backend" {
  name            = "monitoreo-v2-backend-restored"
  cluster         = aws_ecs_cluster.main.id
  launch_type     = "FARGATE"
  desired_count   = 1
  platform_version = "LATEST"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60

  tags = {
    Project = var.project
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}

# ──────────────────────────────────────────────────
# S3 Buckets
# ──────────────────────────────────────────────────

resource "aws_s3_bucket" "frontend" {
  bucket = "power-monitor-frontend"

  tags = {
    Project = var.project
    Anexo07 = "ARQ-09"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ──────────────────────────────────────────────────
# CloudFront
# ──────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-frontend"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-frontend"

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project = var.project
    Anexo07 = "ARQ-09,CYB-04"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior]
  }
}

# ──────────────────────────────────────────────────
# ECR
# ──────────────────────────────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "monitoreo-v2-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project = var.project
    Anexo07 = "CYB-13"
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only 5 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ──────────────────────────────────────────────────
# Outputs
# ──────────────────────────────────────────────────

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "ecr_repo_url" {
  value = aws_ecr_repository.backend.repository_url
}
