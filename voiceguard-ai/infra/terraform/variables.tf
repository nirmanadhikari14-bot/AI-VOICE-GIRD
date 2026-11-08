# =============================================================================
# VoiceGuard AI — Terraform: Provider-Neutral Infrastructure Variables
# Phase 32: Production Infrastructure
#
# This module defines the shared variable schema used across all provider
# implementations (AWS, GCP, Azure). Provider-specific modules live in:
#   infra/terraform/envs/staging/
#   infra/terraform/envs/production/
# =============================================================================

terraform {
  required_version = ">= 1.6.0"
}

variable "environment" {
  description = "Deployment environment (staging | production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'"
  }
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "voiceguard"
}

variable "region" {
  description = "Cloud provider region for deployment"
  type        = string
}

variable "domain" {
  description = "Production domain (e.g. voiceguard.yourdomain.com)"
  type        = string
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed SSH and monitoring access"
  type        = list(string)
  default     = []
}

# ── Compute ───────────────────────────────────────────────────────────────────
variable "compute_instance_type" {
  description = "Instance type for primary application server"
  type        = string
  # Examples: "t3.xlarge" (AWS), "e2-standard-4" (GCP), "Standard_D4s_v3" (Azure)
  # Minimum recommended: 4 vCPU, 8GB RAM
}

variable "compute_disk_size_gb" {
  description = "Root disk size in GB for compute instances"
  type        = number
  default     = 100
}

variable "enable_gpu" {
  description = "Enable GPU instance for AI inference (additional cost)"
  type        = bool
  default     = false
}

variable "gpu_instance_type" {
  description = "GPU instance type (only used if enable_gpu = true)"
  type        = string
  default     = ""
  # Examples: "g4dn.xlarge" (AWS T4), "n1-standard-4+nvidia-tesla-t4" (GCP)
}

# ── Database ──────────────────────────────────────────────────────────────────
variable "db_instance_class" {
  description = "Database instance class (for managed PostgreSQL)"
  type        = string
  # Examples: "db.t3.medium" (AWS RDS), "db-g1-small" (GCP Cloud SQL)
  default     = ""  # Empty = use self-hosted PostgreSQL in Docker
}

variable "db_allocated_storage_gb" {
  description = "Database storage size in GB"
  type        = number
  default     = 50
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated database backups"
  type        = number
  default     = 30
}

# ── Object Storage ────────────────────────────────────────────────────────────
variable "audio_storage_bucket" {
  description = "Object storage bucket name for audio and model artifacts"
  type        = string
  default     = ""
}

variable "audio_retention_days" {
  description = "Days to retain audio files (0 = indefinite)"
  type        = number
  default     = 90
}

# ── Tags ──────────────────────────────────────────────────────────────────────
variable "common_tags" {
  description = "Tags applied to all infrastructure resources"
  type        = map(string)
  default = {
    Project   = "VoiceGuard AI"
    ManagedBy = "Terraform"
    Phase     = "32"
  }
}

