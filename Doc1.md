# Peak Content Moderation Platform

## Overview

Peak is a comprehensive content moderation platform that provides industry-leading CSAM (Child Sexual Abuse Material) and NSFW content detection APIs for images. The platform offers a user-friendly dashboard for testing APIs, managing API keys, and monitoring usage analytics.

### Key Features

- **Content Moderation APIs**: CSAM and NSFW detection with high accuracy
- **Interactive Sandbox**: Real-time image analysis testing interface
- **API Key Management**: Secure JWT-based authentication system
- **Usage Analytics**: Comprehensive tracking and reporting
- **Trial System**: 100 free requests per day with upgrade options
- **Professional Email Integration**: Work email validation and verification

## System Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[Dashboard UI] --> B[Authentication Pages]
        A --> C[Sandbox Testing]
        A --> D[API Key Management]
        A --> E[Usage Analytics]
        A --> F[Documentation]
    end
    
    subgraph "Backend Services"
        G[Next.js API Routes] --> H[Authentication API]
        G --> I[Image Analysis API]
        G --> J[API Key Generation]
        G --> K[Usage Tracking]
    end
    
    subgraph "External Services"
        L[Supabase] --> M[PostgreSQL Database]
        L --> N[Authentication]
        O[Peak.tools API] --> P[Content Moderation Engine]
        Q[Google Cloud] --> R[Cloud SQL]
        Q --> S[BigTable Analytics]
        T[Resend] --> U[Email Service]
        V[Vercel] --> W[Hosting & Deployment]
    end
    
    A --> G
    H --> L
    I --> O
    J --> Q
    K --> S
    H --> T
    
    style A fill:#3b82f6,color:#fff
    style O fill:#ef4444,color:#fff
    style L fill:#10b981,color:#fff
    style Q fill:#f59e0b,color:#fff
```

## Technology Stack

### Frontend
- **Next.js 15.3.4** - React framework with App Router
- **TypeScript** - Type safety and development experience
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations and transitions
- **Lucide React** - Icon library
- **Recharts** - Data visualization

### Backend & Infrastructure
- **Supabase** - Authentication and primary database
- **Google Cloud SQL** - PostgreSQL for subscription data
- **Google BigTable** - Analytics and usage tracking
- **Peak.tools API** - External content moderation service
- **Resend** - Email delivery service
- **Vercel** - Hosting and deployment

### Authentication & Security
- **JWT Tokens** - API authentication
- **Row Level Security (RLS)** - Database access control
- **Work Email Validation** - Professional account verification
- **CRC32 Checksums** - API ID generation

## User Signup Experience

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Routes
    participant SB as Supabase
    participant EV as Email Validator
    participant RS as Resend
    participant GCP as Google Cloud

    U->>FE: Fill signup form
    FE->>API: POST /api/signup
    API->>EV: Validate work email format
    EV-->>API: Format validation result
    API->>EV: Validate email via API
    EV-->>API: Email existence confirmed
    API->>SB: Check for existing account
    SB-->>API: No duplicate found
    API->>SB: Create user account
    SB-->>API: User created with ID
    API->>SB: Create user profile
    SB-->>API: Profile saved
    API->>SB: Store verification token
    SB-->>API: Token stored
    API->>RS: Send verification email
    RS-->>API: Email sent
    API-->>FE: Success response
    FE-->>U: Check email message
    
    Note over U,GCP: User clicks verification link
    U->>FE: Visit /auth/verify?token=xxx
    FE->>API: POST /api/verify-email
    API->>SB: Validate token
    SB-->>API: Token valid
    API->>SB: Mark email as verified
    SB-->>API: Email confirmed
    API-->>FE: Verification success
    FE-->>U: Redirect to set password
    
    U->>FE: Set password
    FE->>API: POST /api/set-password-with-token
    API->>SB: Update user password
    SB-->>API: Password set
    API-->>FE: Account activated
    FE-->>U: Redirect to dashboard
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "User Input"
        A[Image Upload] 
        B[Image URL]
    end
    
    subgraph "Dashboard Processing"
        C[Sandbox Interface] --> D[Input Validation]
        D --> E[Usage Limit Check]
        E --> F[API Key Retrieval]
    end
    
    subgraph "External API Integration"
        F --> G[Peak.tools API Call]
        G --> H[Content Analysis Engine]
        H --> I[CSAM Detection]
        H --> J[NSFW Detection]
        I --> K[Results Processing]
        J --> K
    end
    
    subgraph "Data Storage & Analytics"
        K --> L[Usage Increment]
        L --> M[Supabase Database]
        K --> N[BigTable Analytics]
        N --> O[Review Feed Data]
        M --> P[Usage Dashboard]
    end
    
    subgraph "User Experience"
        K --> Q[Results Display]
        P --> R[Usage Tracking]
        O --> S[Review Feed]
        Q --> T[Interactive Dashboard]
        R --> T
        S --> T
    end
    
    A --> C
    B --> C
    
    style H fill:#ef4444,color:#fff
    style M fill:#10b981,color:#fff
    style N fill:#f59e0b,color:#fff
    style T fill:#3b82f6,color:#fff
```

## API Key Generation Flow

```mermaid
flowchart TD
    A[User Requests API Key] --> B[Authenticate User]
    B --> C[Get User Profile Data]
    C --> D[Generate CRC32 Checksum from Email]
    D --> E[Create API ID from Checksum]
    E --> F[Extract Email Domain]
    F --> G[Connect to Google Cloud SQL]
    G --> H[Insert/Update Subscription Record]
    H --> I[Generate JWT Payload]
    I --> J[Sign JWT with Secret Key]
    J --> K[Save API Key to Supabase]
    K --> L[Return API Key to User]
    
    subgraph "JWT Payload"
        M[Email Address]
        N[IP Address]
        O[API ID]
        P[Expiration: 2 weeks]
        Q[Audience & Timestamps]
    end
    
    I --> M
    I --> N
    I --> O
    I --> P
    I --> Q
    
    style A fill:#3b82f6,color:#fff
    style L fill:#10b981,color:#fff
    style G fill:#f59e0b,color:#fff
```

## Database Schema

### Supabase Tables

```mermaid
erDiagram
    profiles {
        uuid user_id PK
        text first_name
        text last_name
        text work_email
        text organization
        text role
        timestamp created_at
        timestamp updated_at
    }
    
    api_keys {
        uuid id PK
        uuid user_id FK
        text api_id
        text jwt_token
        timestamp expires_at
        timestamp created_at
    }
    
    email_verification_tokens {
        uuid id PK
        uuid user_id FK
        text token
        text email
        timestamp expires_at
        timestamp created_at
    }
    
    daily_usage {
        uuid id PK
        uuid user_id FK
        date usage_date
        integer request_count
        timestamp created_at
        timestamp updated_at
    }
    
    profiles ||--o{ api_keys : "user_id"
    profiles ||--o{ email_verification_tokens : "user_id"
    profiles ||--o{ daily_usage : "user_id"
```

### Google Cloud SQL Tables

```mermaid
erDiagram
    subscriptions {
        date date_created
        date date_last_modified
        text customer_name
        text company_name
        text customer_id
        text whitelisted_email
        text whitelisted_domain
        date valid_through
        text api_id
        boolean has_customer_instance
        text customer_region
        text last_modified_by
        integer subscription_tier
        json models
    }
```

## Core Application Features

### 1. Sandbox Testing Environment
- **Real-time Image Analysis**: Upload files or provide URLs for instant content moderation
- **Multiple Detection Models**: CSAM, NSFW, or both simultaneously
- **Results Visualization**: Clear confidence scores and predictions
- **Usage Monitoring**: Real-time usage indicators and limit tracking

### 2. API Key Management
- **Secure Generation**: CRC32-based API IDs with JWT authentication
- **Automatic Expiration**: 2-week token lifecycle with renewal options
- **Usage Tracking**: Per-key analytics and monitoring
- **Integration Ready**: Copy-paste API credentials for external use

### 3. Usage Analytics & Monitoring
- **Daily Limits**: 100 free requests per day for trial users
- **BigTable Integration**: Comprehensive analytics and request logging
- **Review Feed**: Historical analysis results and performance tracking
- **Real-time Updates**: Instant usage counter updates via cache invalidation

### 4. Account Management
- **Work Email Validation**: API-based email verification for business accounts
- **Profile Management**: Organization and role tracking
- **Password Management**: Secure password reset and update flows
- **Trial Status**: Upgrade prompts and limitation notifications

## API Integration

### Content Moderation Endpoint
```
PUT https://api.peak.tools/sentry
```

**Headers Required:**
- `api-id`: Your unique API identifier
- `Authorization`: Bearer JWT token
- `x-from-gui`: "True" (for dashboard requests)

**Supported Formats:**
- **File Upload**: `multipart/form-data` with image file
- **URL Analysis**: `application/json` with `target_url`

**Models Available:**
- `csam`: Child Sexual Abuse Material detection
- `nsfw`: Not Safe For Work content detection
- `csam,nsfw`: Both models simultaneously

### Response Format
```json
{
  "url": "https://example.com/image.jpg",
  "results": [
    {
      "model": "csam",
      "prediction": "safe"
    },
    {
      "model": "nsfw", 
      "prediction": "nsfw"
    }
  ]
}
```

## Email System Integration

### Work Email Validation
- **Format Validation**: Regex-based professional email format checking
- **API Validation**: External service verification for email existence
- **Domain Filtering**: Business domain requirements (no generic providers)

### Email Flows
- **Verification**: Welcome email with account activation link
- **Password Reset**: Secure token-based password recovery
- **Resend Options**: Re-trigger verification emails as needed

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Google Cloud Platform account
- Resend account for email delivery

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Cloud Configuration  
GCP_SERVICE_ACCOUNT_JSON=your_service_account_json
GCP_DB_INSTANCE_CONNECTION_NAME=your_instance_connection

# API Configuration
SECRET_KEY=your_jwt_secret
AUDIENCE=your_jwt_audience

# Email Configuration
RESEND_API_KEY=your_resend_api_key
```

### Installation & Running
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database Setup
1. **Supabase**: Create tables for profiles, api_keys, daily_usage, email_verification_tokens
2. **Google Cloud SQL**: Set up subscriptions table for API key management
3. **BigTable**: Configure analytics tables for usage tracking

## Deployment

### Vercel Configuration
The application is optimized for Vercel deployment with:
- **Build Command**: `npm run build`
- **Framework**: Next.js automatic detection
- **Region**: `iad1` (US East)
- **Environment**: Production, preview, and development configurations

### Security Considerations
- **Row Level Security**: Supabase RLS policies ensure user data isolation
- **JWT Validation**: All API routes verify user authentication
- **Rate Limiting**: Daily usage limits prevent abuse
- **Input Sanitization**: File uploads and URLs are validated and sanitized

## Monitoring & Analytics

### Usage Tracking
- **Real-time Counters**: Immediate usage updates via Supabase functions
- **Daily Aggregation**: Per-user request counting and limit enforcement
- **BigTable Analytics**: Comprehensive request logging and analysis
- **Cache Management**: Strategic invalidation for real-time dashboard updates

### Performance Optimization
- **Image Processing**: Efficient file handling and multipart uploads
- **Database Queries**: Optimized with proper indexing and RLS
- **Client-side Caching**: Strategic use of React state and browser storage
- **API Response Caching**: Smart cache invalidation strategies

---

## Support & Contact

For technical support, API questions, or account issues, please contact the Peak team through the dashboard or visit our documentation portal.

**Dashboard**: [Your Dashboard URL]  
**API Documentation**: Available in the dashboard documentation section  
**Status Page**: Monitor service availability and performance
