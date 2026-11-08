# =============================================================================
# VoiceGuard AI — Production Terraform Environment
# Phase 32: Production Infrastructure (SIH26104)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4.0"
    }
  }

  # Production backend: Encrypted remote backend recommended (e.g., S3/GCS/Azure Blob)
  # backend "s3" {
  #   bucket         = "voiceguard-terraform-state-prod"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-south-1"
  #   encrypt        = true
  #   dynamodb_table = "voiceguard-lock-table-prod"
  # }
}

locals {
  environment  = "production"
  project_name = "voiceguard-ai"
  tags = {
    Project     = "VoiceGuard-AI"
    Environment = "production"
    ManagedBy   = "Terraform"
    Team        = "VoiceGuard-SIH26104"
  }
}

# Production server specification (e.g. 8 vCPU, 16 GB RAM, 100 GB NVMe SSD)
resource "local_file" "production_inventory" {
  filename = "${path.module}/production_inventory.ini"
  content  = <<-EOT
    # Production Deployment Inventory
    [voiceguard_production]
    prod-app-01 ansible_host=prod.voiceguard.internal ansible_user=deploy

    [voiceguard_production:vars]
    environment=production
    app_dir=/opt/voiceguard
    domain=voiceguard.ai
    tls_email=security@voiceguard.ai
  EOT
}

output "environment" {
  description = "Target deployment environment"
  value       = local.environment
}

output "production_firewall_allowed_ports" {
  description = "Publicly exposed ingress ports for production"
  value       = [80, 443]
}
