# TunAgri — B2B Marketplace Platform

Multi-tenant B2B e-commerce marketplace for **Medical** & **Agricultural** sectors, built for the Tunisian market.

## Architecture

```
AgriEcommerce/
├── apps/
│   └── web/                 # Next.js 14 App Router (frontend + API)
├── packages/
│   ├── db/                  # Mongoose models & seed script
│   └── types/               # Shared Zod schemas & TypeScript types
├── docker-compose.yml       # MongoDB 7, Redis 7, Meilisearch 1.6
├── turbo.json               # Turborepo build orchestration
└── pnpm-workspace.yaml      # Monorepo workspace config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS v3, Shadcn/UI, Radix UI, Framer Motion |
| State | Zustand v5, TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Database | MongoDB 7 + Mongoose 8 |
| Search | Meilisearch 1.6 |
| Cache | Redis 7 + ioredis |
| Auth | JWT (jose, HS256) — HttpOnly cookies |
| Monorepo | Turborepo + pnpm |
| Testing | Vitest |

## Quick Start

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9
- Docker & Docker Compose

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

This starts:
- **MongoDB 7** on port 27017 (user: admin, pwd: password)
- **Redis 7** on port 6379
- **Meilisearch 1.6** on port 7700 (key: local-dev-master-key)

### 3. Configure environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Auth secrets (min 32 chars)
- `REDIS_URL` — Redis connection
- `MEILISEARCH_HOST` / `MEILISEARCH_API_KEY` — Search engine

### 4. Build packages

```bash
pnpm build
```

### 5. Seed the database

```bash
pnpm db:seed
```

### 6. Start development

```bash
pnpm dev
```

App runs at **http://localhost:3000**

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tunagri.dz | Admin@2025! |
| Buyer (FREE) | buyer@tunagri.dz | Buyer@2025! |
| Buyer (PRIME) | buyer.prime@tunagri.dz | BuyerPrime@2025! |
| Supplier | contact@medpharma.dz | Supplier@2025! |

## User Roles

- **BUYER** — Browse products, place orders, leave reviews
  - **FREE** tier: Standard pricing only
  - **PRIME** tier: Access to bulk/wholesale pricing
- **SUPPLIER** — Manage products, fulfill orders, invoicing, analytics
- **ADMIN** — Platform oversight, user/supplier management, analytics

## API Routes

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in (sets JWT cookies) |
| POST | `/api/auth/logout` | Sign out (clears cookies) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (paginated, filtered) |
| GET | `/api/products/[slug]` | Product detail |
| GET | `/api/categories` | Category tree |
| GET | `/api/search` | Meilisearch full-text search |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Place order (with stock decrement) |
| GET | `/api/orders` | Buyer's order history |

### Dashboard (Supplier)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/analytics` | Revenue, top products, KPIs |
| GET/POST | `/api/dashboard/products` | Manage supplier products |
| GET | `/api/dashboard/orders` | Supplier's orders |
| PATCH | `/api/dashboard/orders/[id]` | Update order status |

### Account
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/api/account/profile` | User profile |
| GET/POST/DELETE | `/api/wishlist` | Wishlist management |
| GET/POST | `/api/reviews` | Product reviews |
| GET/POST | `/api/messages` | Buyer-supplier messaging |

### Invoices & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/invoices` | Invoice management |
| GET/PATCH | `/api/notifications` | Notifications |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform KPIs |
| GET | `/api/admin/users` | User management |
| GET | `/api/admin/suppliers` | Supplier list |
| PATCH | `/api/admin/suppliers/[id]` | Verify/revoke supplier |
| POST | `/api/admin/sync-search` | Sync products to Meilisearch |

### Supplier
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers/[slug]` | Public supplier profile |
| GET/POST/DELETE | `/api/stock-alerts` | Stock alert management |

## Pages

### Public
- `/` — Homepage with hero, categories, featured products
- `/products` — Product catalog with filters & pagination
- `/products/[slug]` — Product detail
- `/search` — Full-text search
- `/suppliers/[slug]` — Supplier public profile
- `/login` — Sign in
- `/register` — Create account

### Account (Buyer)
- `/account` — Profile management
- `/account/orders` — Order history
- `/account/wishlist` — Saved products
- `/account/messages` — Messaging

### Dashboard (Supplier)
- `/dashboard` — Overview with KPIs
- `/dashboard/products` — Product management
- `/dashboard/orders` — Order management
- `/dashboard/stock` — Stock matrix
- `/dashboard/analytics` — Revenue analytics
- `/dashboard/invoices` — Invoice management
- `/dashboard/promotions` — Promotion management
- `/dashboard/settings` — Company settings

### Admin
- `/admin` — Platform overview (8 KPIs)
- `/admin/users` — User management
- `/admin/suppliers` — Supplier verification
- `/admin/products` — Product oversight
- `/admin/orders` — Order oversight
- `/admin/categories` — Category management
- `/admin/reports` — Reports
- `/admin/audit` — Audit logs

## Key Features

- **Multi-sector support** — Medical (🏥) and Agricultural (🌾) product sectors
- **PRIME pricing** — Bulk/wholesale pricing visible only to PRIME subscribers
- **Atomic stock management** — MongoDB `findOneAndUpdate` with stock movement logging
- **Order splitting** — Multi-supplier carts auto-split into separate orders per supplier
- **TVA 19%** — Tunisian tax calculation on all orders and invoices
- **Meilisearch integration** — Typo-tolerant full-text search with sector/category facets
- **Redis caching** — Cached category trees, product listings, analytics
- **Rate limiting** — Per-path request throttling
- **JWT auth** — Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)

## Testing

```bash
cd apps/web
pnpm test
```

6 tests covering price visibility middleware (PRIME vs FREE users, bulk pricing stripping).

## Database Models (17)

User, Supplier, Category, Product, Order, Invoice, StockMovement, Review, Promotion, Notification, Message, SubscriptionPlan, PageView, Wishlist, StockAlert, Report, AuditLog

## License

Private — All rights reserved.
