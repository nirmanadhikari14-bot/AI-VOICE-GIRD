# =============================================================================
# VoiceGuard AI — Terraform: Staging Environment
# Phase 32: Production Infrastructure
#
# USAGE:
#   cd infra/terraform/envs/staging
#   terraform init
#   terraform plan -var-file="staging.tfvars"
#   terraform apply -var-file="staging.tfvars"
#
# NOTE: Rename staging.tfvars.example → staging.tfvars and fill values.
#       Never commit staging.tfvars (contains secrets).
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  # Remote state (choose one backend — S3, GCS, Azure Blob, or Terraform Cloud)
  # Uncomment and configure the appropriate backend:
  #
  # backend "s3" {
  #   bucket         = "voiceguard-terraform-state"
  #   key            = "staging/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  # }
  #
  # backend "gcs" {
  #   bucket = "voiceguard-terraform-state"
  #   prefix = "staging"
  # }

  required_providers {
    # Uncomment your cloud provider:
    # aws = {
    #   source  = "hashicorp/aws"
    #   version = "~> 5.0"
    # }
    # google = {
    #   source  = "hashicorp/google"
    #   version = "~> 5.0"
    # }
    # azurerm = {
    #   source  = "hashicorp/azurerm"
    #   version = "~> 3.0"
    # }
  }
}

# Provider configuration (fill in your chosen provider)
# Example for AWS:
# provider "aws" {
#   region = var.region
# }

locals {
  environment = "staging"
  name_prefix = "voiceguard-${local.environment}"
  common_tags = merge(var.common_tags, {
    Environment = local.environment
  })
}

# ── Staging deployment notes ──────────────────────────────────────────────────
# For the SIH26104 demonstration and initial production preparation,
# a single-server Docker Compose deployment is RECOMMENDED over a full
# cloud-managed Kubernetes/RDS setup.
#
# Reasons:
#   1. Cost: A single c5.xlarge (AWS) or n2-standard-4 (GCP) instance
#      running all services costs ~$80-150/month vs $400+ for managed services.
#   2. Complexity: Managed services add auth complexity without adding
#      value at this scale.
#   3. Performance: At <50 concurrent audio sessions, a single server
#      with 4 vCPU and 16GB RAM is more than sufficient.
#
# Upgrade path:
#   Phase 1: Single server + Docker Compose (this phase)
#   Phase 2: Separate DB server + managed Redis
#   Phase 3: Multiple backend replicas + load balancer
#   Phase 4: Kubernetes if >500 concurrent sessions required

