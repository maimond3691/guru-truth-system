# Peak Content Moderation Platform Documentation

This repository contains comprehensive technical documentation and architecture diagrams for the Peak Content Moderation Platform.

## Contents

- **[Doc1.md](Doc1.md)** - Complete technical documentation covering:
  - System architecture
  - Technology stack
  - API integration
  - Database schemas
  - Development setup
  - Deployment guidelines

- **[diagrams/](diagrams/)** - Architecture diagrams in PNG format:
  - `system_architecture.png` - Overall system design
  - `user_signup_experience.png` - Authentication flow sequence
  - `data_flow_architecture.png` - Data processing flow
  - `api_key_generation_flow.png` - API key creation process
  - `supabase_database_schema.png` - Main database structure
  - `google_cloud_sql_schema.png` - Subscription data schema

## Overview

Peak is a comprehensive content moderation platform providing industry-leading CSAM and NSFW detection APIs for images, featuring an interactive dashboard, API key management, and usage analytics.

## Technology Stack

- **Frontend**: Next.js 15.3.4, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase, Google Cloud
- **Infrastructure**: Vercel hosting, BigTable analytics
- **External APIs**: Peak.tools content moderation engine

## Getting Started

See [Doc1.md](Doc1.md) for complete setup instructions and technical details.

## Architecture Diagrams

All diagrams are generated from mermaid code and available as PNG files in the [diagrams/](diagrams/) directory for easy integration into documentation platforms. 