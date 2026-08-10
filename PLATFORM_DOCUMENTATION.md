# TunAgri — Comprehensive Platform Documentation

**Complete technical reference for AI agents, developers, and stakeholders**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Platform Domains & Features](#platform-domains--features)
5. [Database Models](#database-models)
6. [API Routes & Endpoints](#api-routes--endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Setup & Configuration](#setup--configuration)
9. [Development Workflow](#development-workflow)
10. [Key Features Deep Dive](#key-features-deep-dive)
11. [Deployment Notes](#deployment-notes)

---

## Project Overview

### What is TunAgri?

**TunAgri** is a B2B multi-tenant e-commerce marketplace designed specifically for the **Tunisian agricultural and medical sectors**. It bridges the gap between agricultural/medical suppliers, training centers, specialists, and buyers.

### Core Mission

- Enable agricultural suppliers (`FOURNISSEUR`) to list products
- Connect agricultural engineers/specialists (`SPECIALIST`) with buyers
- Facilitate training programs via training centers (`CENTRE_DE_FORMATION`)
- Provide formation/event management
- Enable farmer/buyer (`AGRICULTEUR`) procurement
- Admin-controlled content, audit, and site settings
- Onboarding system with email/SMS notifications

### Target Users

- **Farmers/Buyers** (`AGRICULTEUR`): Browse, purchase products, register formations
- **Agricultural Suppliers** (`FOURNISSEUR`): Sell products, manage inventory
- **Training Centers** (`CENTRE_DE_FORMATION`): Host formations, manage participants
- **Agricultural Specialists/Engineers** (`SPECIALIST`): Offer consulting services
- **Admins**: Dashboard, user management, content moderation, reports

---

## Architecture & Tech Stack

### Monorepo Structure

```
AgriEcommerce/
├── apps/
│   └── web/                           # Next.js 14 App Router (frontend + API)
│       ├── src/
│       │   ├── app/                   # Pages & API routes
│       │   ├── components/            # React components
│       │   ├── hooks/                 # Custom React hooks
│       │   ├── lib/                   # Utilities (auth, cache, search, etc.)
│       │   └── stores/                # Zustand state management
│       ├── public/                    # Static assets
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs
│       └── tailwind.config.ts
│
├── packages/
│   ├── db/                            # Database layer
│   │   ├── src/
│   │   │   ├── models/                # Mongoose schemas
│   │   │   ├── connection.ts          # MongoDB connection
│   │   │   ├── seed.ts                # Database seeding
│   │   │   └── index.ts               # Re-exports
│   │   └── package.json
│   │
│   └── types/                         # Shared types & validation
│       ├── src/
│       │   └── index.ts               # Zod schemas & TypeScript types
│       └── package.json
│
├── docker-compose.yml                 # Infrastructure (MongoDB, Redis, Meilisearch)
├── turbo.json                         # Turborepo config
├── pnpm-workspace.yaml               # Monorepo workspace config
├── pnpm-lock.yaml                    # Locked dependencies
├── tsconfig.json                     # Root TypeScript config
└── README.md                         # Quick start guide
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | Frontend + API Routes |
| **Language** | TypeScript | Type safety |
| **UI Framework** | Tailwind CSS v3 | Styling |
| **UI Components** | Shadcn/UI, Radix UI | Reusable components |
| **Animations** | Framer Motion | Page/element transitions |
| **State Management** | Zustand v5 | Client-side state (cart, etc.) |
| **Data Fetching** | TanStack Query v5 | Server state management |
| **Forms** | React Hook Form + Zod | Form validation & submission |
| **Database** | MongoDB 7 | Document NoSQL store |
| **ODM** | Mongoose 8 | MongoDB object modeling |
| **Search Engine** | Meilisearch 1.6 | Full-text product search |
| **Cache** | Redis 7 + ioredis | Session/cache layer |
| **Authentication** | JWT (jose, HS256) | Stateless auth with HttpOnly cookies |
| **Notifications** | Nodemailer + Twilio | Email & SMS delivery |
| **Payments** | Stripe | Payment processing |
| **Monorepo Manager** | Turborepo + pnpm | Workspace orchestration |
| **Testing** | Vitest | Unit & integration tests |

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────┐
│       ADMIN (Super User)    │
├─────────────────────────────┤
│ - Manage all users          │
│ - Audit logs & reporting    │
│ - Site settings & toggles   │
│ - Approve onboarding        │
│ - Manage categories/heroes  │
│ - Access admin dashboard    │
└─────────────────────────────┘
         │     │     │     │
    ┌────┴─────┴─────┴─────┴────┐
    │                            │
┌───▼──────────────┐  ┌──────────▼──────┐
│  AGRICULTEUR     │  │  FOURNISSEUR    │
│  (Farmer/Buyer)  │  │  (Supplier)     │
├──────────────────┤  ├─────────────────┤
│ - Browse         │  │ - List products │
│ - Purchase       │  │ - Manage stock  │
│ - Cart & orders  │  │ - Track orders  │
│ - Wishlist       │  │ - View reports  │
│ - Messages       │  │ - Messages      │
│ - Formations     │  │ - Analytics     │
│ - Account        │  │ - Account       │
└──────────────────┘  └─────────────────┘

┌────────────────────┐  ┌─────────────────────────┐
│  SPECIALIST        │  │ CENTRE_DE_FORMATION     │
│  (Agri Engineer)   │  │ (Training Center)       │
├────────────────────┤  ├─────────────────────────┤
│ - Offer services   │  │ - Host formations       │
│ - Manage calendar  │  │ - Manage participants   │
│ - Messages         │  │ - Track attendance      │
│ - Account          │  │ - Report on programs    │
└────────────────────┘  └─────────────────────────┘
```

### Permission Model

Permissions are enforced via:
- **Role-based checks**: `requireRole('ADMIN')` middleware
- **Ownership validation**: User can only modify their own data
- **API guards**: All admin routes require authentication + ADMIN role
- **Middleware**: `src/lib/auth/session.ts` validates JWT from HttpOnly cookies

---

## Platform Domains & Features

### 1. **Authentication & Account** 

#### Domain: `(auth)` and `account`

**Features:**
- Registration with role selection (AGRICULTEUR, FOURNISSEUR, SPECIALIST, CENTRE_DE_FORMATION)
- Role-specific required fields:
  - **All**: firstName, lastName, phoneNumber
  - **FOURNISSEUR**: companyName (required)
  - **SPECIALIST**: companyName, speciality (required)
  - **CENTRE_DE_FORMATION**: companyName (required)
- Email verification
- JWT-based authentication (HttpOnly cookies)
- Password hashing (bcryptjs)
- Session management
- Account profile management

**Key Routes:**
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — User login
- `POST /api/auth/refresh` — Refresh JWT token
- `GET /api/account/profile` — Get user profile
- `PUT /api/account/profile` — Update profile
- `POST /api/account/change-password` — Change password

---

### 2. **Onboarding & Registration Flow**

#### Domain: `onboarding`

**Features:**
- New user registration paused/frozen via admin toggle (`SiteSetting`)
- Onboarding request submission (`OnboardingRequest` model)
- Admin approval workflow with:
  - Editable fields (name, phone, company, email)
  - AUTO password generation or MANUAL password entry
  - Email notifications with credentials
  - SMS notifications (when configured)
- User creation on approval
- Status tracking: PENDING → APPROVED/REJECTED
- Audit trail (reviewedBy, reviewedAt, adminNote)

**Key Routes:**
- `POST /api/onboarding` — Submit onboarding request
- `GET /api/site-settings/onboarding` — Public check if onboarding active
- `GET /api/admin/onboarding-requests` — List requests (admin)
- `POST /api/admin/onboarding-requests/[id]/approve` — Approve request (admin)
- `GET/PUT /api/admin/site-settings/onboarding` — Toggle onboarding active (admin)

**Key Models:**
- `OnboardingRequest` — Stores pending requests
- `SiteSetting` — Stores feature flags (e.g., `onboardingActive`)

---

### 3. **Product Management & E-Commerce**

#### Domain: `products`, `categories`, `cart`, `orders`, `wishlist`

**Features:**
- Product catalog with categories/subcategories
- Product search via Meilisearch (full-text, filters)
- Stock management (quantity, alerts, movements)
- Shopping cart (Zustand state, persistent)
- Order creation & tracking
- Order status workflow (PENDING → SHIPPED → DELIVERED)
- Wishlist (save for later)
- Price visibility rules (some products visible only to specific roles)
- Review & rating system
- Invoice generation

**Key Models:**
- `Product` — Product catalog
- `Category` — Product categories
- `Order` — Customer orders
- `StockMovement` — Inventory tracking
- `StockAlert` — Low-stock notifications
- `Wishlist` — Saved items
- `Review` — Product reviews/ratings
- `Invoice` — Order invoices

**Key Routes:**
- `GET /api/products` — List products (with search/filters)
- `POST /api/products` — Create product (supplier)
- `GET /api/products/[id]` — Get product details
- `PUT /api/products/[id]` — Update product (owner)
- `DELETE /api/products/[id]` — Delete product (owner)
- `POST /api/orders` — Create order
- `GET /api/orders` — List user orders
- `GET /api/orders/[id]` — Get order details
- `PUT /api/orders/[id]` — Update order status (admin)
- `POST /api/wishlist` — Add to wishlist
- `GET /api/wishlist` — Get wishlist
- `POST /api/invoices/[orderId]` — Generate invoice

---

### 4. **Formations & Training Programs**

#### Domain: `formations`, `events`

**Features:**
- Training program creation (training centers)
- Participant registration
- Attendance tracking
- Event scheduling
- Formation categories
- Formation search & discovery
- Participation status (ENROLLED, COMPLETED, CANCELLED)

**Key Models:**
- `Formation` — Training programs
- `FormationParticipation` — Enrollment records
- `Event` — Events (workshops, seminars)
- `EventParticipation` — Event attendance

**Key Routes:**
- `GET /api/formations` — List formations (search/filter)
- `POST /api/formations` — Create formation (training center)
- `GET /api/formations/[id]` — Get formation details
- `POST /api/formations/[id]/enroll` — Enroll in formation
- `GET /api/events` — List events
- `POST /api/events` — Create event
- `POST /api/events/[id]/join` — Join event

---

### 5. **Messaging & Communication**

#### Domain: `messages`, `agri-help-requests`

**Features:**
- User-to-user messaging
- AgriHelp support requests
- Message threading/conversations
- Read receipts
- Support ticket tracking (OPEN, IN_PROGRESS, RESOLVED, CLOSED)

**Key Models:**
- `Message` — Direct messages
- `Notification` — Push/in-app notifications
- `AgriHelpRequest` — Support tickets

**Key Routes:**
- `GET /api/messages` — Get conversations
- `POST /api/messages` — Send message
- `GET /api/agri-help-requests` — List help requests
- `POST /api/agri-help-requests` — Create help request
- `PUT /api/agri-help-requests/[id]` — Update request status

---

### 6. **Promotions & Marketing**

#### Domain: `promotions`, `hero-slides`

**Features:**
- Promotional banners & discounts
- Hero/homepage slideshows
- Promotion scheduling
- Analytics tracking (page views)
- Admin approval for promotion requests

**Key Models:**
- `Promotion` — Discount campaigns
- `PromotionComment` — Promotion feedback
- `HeroSlide` — Homepage carousel
- `HeroPromotionRequest` — Promotion approval requests
- `PageView` — Analytics tracking

**Key Routes:**
- `GET /api/promotions` — List active promotions
- `POST /api/promotions` — Create promotion
- `GET /api/hero-slides` — Get homepage carousel
- `POST /api/hero-slides` — Create slide (admin)
- `GET /api/admin/promotions` — Manage promotions (admin)

---

### 7. **Suppliers & Specialists Directory**

#### Domain: `suppliers`, `specialists`, `training-centers`

**Features:**
- Supplier profiles & catalog links
- Specialist (agricultural engineer) profiles
- Training center profiles & program listings
- Reputation/rating system
- Search & filtering by speciality/location

**Key Models:**
- `Supplier` — Supplier profiles (linked to User FOURNISSEUR)
- `User` (role: SPECIALIST) — Engineers/consultants
- `User` (role: CENTRE_DE_FORMATION) — Training centers

**Key Routes:**
- `GET /api/suppliers` — List suppliers
- `GET /api/suppliers/[id]` — Supplier details
- `GET /api/specialists` — List agricultural engineers
- `GET /api/specialists/[id]` — Specialist details
- `GET /api/training-centers` — List training centers

---

### 8. **Admin Dashboard & Reporting**

#### Domain: `admin`

**Features:**
- Dashboard overview (stats, recent activity)
- User management (view, suspend, roles)
- Content moderation (categories, hero slides, promotions)
- Audit logs (all user actions)
- Reports (sales, traffic, user growth)
- Onboarding approval workflow
- Site settings configuration

**Key Models:**
- `AuditLog` — Action audit trail
- `Report` — Generated reports
- `SiteSetting` — Feature flags & config

**Key Routes:**
- `GET /api/admin/dashboard` — Dashboard stats
- `GET /api/admin/users` — Manage users
- `GET /api/admin/audit-logs` — View audit logs
- `GET /api/admin/reports` — Generate/list reports
- `GET /api/admin/onboarding-requests` — Onboarding approvals
- `PUT /api/admin/site-settings/[key]` — Update settings

---

### 9. **Search & Analytics**

#### Domain: `search`

**Features:**
- Meilisearch integration for product search
- Faceted search (category, price range, supplier)
- Search analytics
- Trending products/searches
- Page view tracking

**Key Models:**
- `PageView` — Visit analytics

**Key Routes:**
- `POST /api/search/products` — Search products (Meilisearch)
- `GET /api/search/trending` — Trending searches
- `POST /api/search/analytics` — Track page views

---

### 10. **Subscriptions & Premium Features**

#### Domain: `dashboard` (account section)

**Features:**
- Premium badge system (FREE, PRIME, PREMIUM)
- Subscription plans
- Feature gating based on subscription level
- Upgrade/downgrade workflows

**Key Models:**
- `SubscriptionPlan` — Plan definitions
- `User.badge` — User's current subscription

---

## Database Models

### Core Models

#### **User**
```typescript
{
  _id: ObjectId
  email: string (unique, lowercase)
  passwordHash: string (bcrypt)
  firstName: string
  lastName: string
  role: 'ADMIN' | 'AGRICULTEUR' | 'FOURNISSEUR' | 'SPECIALIST' | 'CENTRE_DE_FORMATION'
  badge: {
    type: 'FREE' | 'PRIME' | 'PREMIUM'
    isActive: boolean
  }
  profile: {
    phone: string
    companyName?: string
    speciality?: string (for SPECIALIST)
    location?: string
  }
  isEmailVerified: boolean
  isPhoneVerified: boolean
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
  createdAt: Date
  updatedAt: Date
}
```

#### **OnboardingRequest**
```typescript
{
  _id: ObjectId
  firstName: string
  lastName: string
  professional: 'AGRICULTEUR' | 'FOURNISSEUR' | 'SPECIALIST' | 'CENTRE_DE_FORMATION'
  phoneNumber: string
  companyName?: string
  email?: string
  location?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  userId?: ObjectId (populated on approval)
  reviewedBy?: ObjectId (admin who approved)
  reviewedAt?: Date
  adminNote?: string
  createdAt: Date
  updatedAt: Date
}
```

#### **Product**
```typescript
{
  _id: ObjectId
  name: string
  description: string
  category: ObjectId (ref: Category)
  supplierId: ObjectId (ref: User with role FOURNISSEUR)
  price: number
  quantity: number
  unit: string (e.g., "kg", "L", "piece")
  images: string[] (URLs)
  tags: string[]
  visibleTo: string[] (roles that can see this product)
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  averageRating: number (0-5)
  reviewCount: number
  createdAt: Date
  updatedAt: Date
}
```

#### **Order**
```typescript
{
  _id: ObjectId
  buyerId: ObjectId (ref: User)
  items: [
    {
      productId: ObjectId
      quantity: number
      unitPrice: number
      subtotal: number
    }
  ]
  totalAmount: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  shippingAddress: string
  paymentMethod: 'STRIPE' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  stripePaymentIntentId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

#### **Formation**
```typescript
{
  _id: ObjectId
  title: string
  description: string
  centerId: ObjectId (ref: User with role CENTRE_DE_FORMATION)
  category: string
  startDate: Date
  endDate: Date
  maxParticipants: number
  enrolledCount: number
  price: number
  location?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
}
```

#### **Category**
```typescript
{
  _id: ObjectId
  name: string
  slug: string (unique)
  description?: string
  parentId?: ObjectId (for subcategories)
  icon?: string (URL)
  isActive: boolean
  order: number (display order)
  createdAt: Date
  updatedAt: Date
}
```

#### **AuditLog**
```typescript
{
  _id: ObjectId
  userId: ObjectId (ref: User)
  action: string (e.g., "USER_CREATED", "PRODUCT_UPDATED")
  entityType: string (e.g., "Product", "User")
  entityId: ObjectId
  changes: {
    before: any
    after: any
  }
  ipAddress: string
  userAgent: string
  timestamp: Date
}
```

#### **SiteSetting**
```typescript
{
  _id: ObjectId
  key: string (unique, e.g., "onboardingActive")
  value: any
  onboardingActive?: boolean (if key is "onboarding")
  createdAt: Date
  updatedAt: Date
}
```

### Supporting Models

- **Message** — User-to-user messaging
- **Notification** — Push/in-app notifications
- **Promotion** — Discount campaigns
- **PromotionComment** — Feedback on promotions
- **HeroSlide** — Homepage carousel images
- **HeroPromotionRequest** — Promotion approval requests
- **Review** — Product reviews
- **Wishlist** — Saved items
- **StockMovement** — Inventory changes
- **StockAlert** — Low-stock alerts
- **Event** — Event listings
- **EventParticipation** — Event attendance
- **FormationParticipation** — Formation enrollment
- **Invoice** — Order invoices
- **Report** — Generated reports
- **Supplier** — Supplier profiles
- **SubscriptionPlan** — Premium plan definitions
- **PageView** — Analytics tracking
- **AgriHelpRequest** — Support tickets

---

## API Routes & Endpoints

### Authentication APIs

```
POST   /api/auth/register              Register new user
POST   /api/auth/login                 Login (returns JWT in HttpOnly cookie)
POST   /api/auth/refresh               Refresh access token
POST   /api/auth/logout                Logout (clear cookie)
GET    /api/auth/me                    Get current user info
```

### User Account APIs

```
GET    /api/account/profile            Get user profile
PUT    /api/account/profile            Update profile
POST   /api/account/change-password    Change password
GET    /api/account/orders             List user orders
GET    /api/account/wishlist           Get wishlist
GET    /api/account/messages           Get conversations
```

### Product APIs

```
GET    /api/products                   List products (paginated, searchable)
GET    /api/products/[id]              Get product details
POST   /api/products                   Create product (supplier only)
PUT    /api/products/[id]              Update product
DELETE /api/products/[id]              Delete product
GET    /api/products/[id]/reviews      Get product reviews
POST   /api/products/[id]/reviews      Add product review
GET    /api/products/trending          Get trending products
```

### Category APIs

```
GET    /api/categories                 List all categories
GET    /api/categories/[id]            Get category details
POST   /api/categories                 Create category (admin only)
PUT    /api/categories/[id]            Update category (admin only)
```

### Order APIs

```
POST   /api/orders                     Create order (from cart)
GET    /api/orders                     List user orders
GET    /api/orders/[id]                Get order details
PUT    /api/orders/[id]                Update order status (admin)
DELETE /api/orders/[id]                Cancel order
GET    /api/orders/[id]/invoice        Generate/download invoice
```

### Cart APIs

```
GET    /api/cart                       Get cart items (from Zustand)
POST   /api/cart/items                 Add to cart
PUT    /api/cart/items/[productId]     Update cart item quantity
DELETE /api/cart/items/[productId]     Remove from cart
POST   /api/cart/checkout              Create order from cart
```

### Wishlist APIs

```
GET    /api/wishlist                   Get wishlist
POST   /api/wishlist                   Add to wishlist
DELETE /api/wishlist/[productId]       Remove from wishlist
```

### Formation APIs

```
GET    /api/formations                 List formations
GET    /api/formations/[id]            Get formation details
POST   /api/formations                 Create formation (training center)
PUT    /api/formations/[id]            Update formation (owner)
POST   /api/formations/[id]/enroll     Enroll in formation
GET    /api/formations/[id]/participants  List participants (owner/admin)
```

### Event APIs

```
GET    /api/events                     List events
GET    /api/events/[id]                Get event details
POST   /api/events                     Create event
POST   /api/events/[id]/join           Join event
GET    /api/events/[id]/participants   List participants
```

### Message APIs

```
GET    /api/messages                   Get conversations
GET    /api/messages/[userId]          Get conversation with user
POST   /api/messages                   Send message
DELETE /api/messages/[id]              Delete message
```

### Support APIs

```
GET    /api/agri-help-requests         List help requests (user's or admin)
POST   /api/agri-help-requests         Create help request
GET    /api/agri-help-requests/[id]    Get request details
PUT    /api/agri-help-requests/[id]    Update request status
POST   /api/agri-help-requests/[id]/reply  Add reply
```

### Promotion APIs

```
GET    /api/promotions                 List active promotions
POST   /api/promotions                 Create promotion
GET    /api/promotions/[id]            Get promotion details
```

### Hero Slide APIs

```
GET    /api/hero-slides                Get homepage carousel
POST   /api/hero-slides                Create slide (admin only)
DELETE /api/hero-slides/[id]           Delete slide (admin only)
```

### Search APIs

```
POST   /api/search/products            Search products (Meilisearch)
GET    /api/search/trending            Get trending searches
POST   /api/search/analytics           Track page view
```

### Supplier/Specialist APIs

```
GET    /api/suppliers                  List suppliers
GET    /api/suppliers/[id]             Supplier details
GET    /api/specialists                List agricultural engineers
GET    /api/specialists/[id]           Specialist details
GET    /api/training-centers           List training centers
GET    /api/training-centers/[id]      Training center details
```

### Admin APIs

```
GET    /api/admin/dashboard            Dashboard statistics
GET    /api/admin/users                List all users
PUT    /api/admin/users/[id]           Update user (suspend/role)
GET    /api/admin/audit-logs           View audit logs
GET    /api/admin/reports              Generate/list reports

GET    /api/admin/onboarding-requests                    List onboarding requests
POST   /api/admin/onboarding-requests/[id]/approve      Approve request
GET    /api/admin/site-settings/onboarding              Get onboarding setting
PUT    /api/admin/site-settings/onboarding              Toggle onboarding active

GET    /api/admin/categories           Manage categories
POST   /api/admin/categories           Create category
PUT    /api/admin/categories/[id]      Update category

GET    /api/admin/promotions           Manage promotions
POST   /api/admin/promotions           Create promotion
```

### Site Settings APIs

```
GET    /api/site-settings/onboarding   Public: Check if onboarding active
GET    /api/site-settings/[key]        Get setting value
PUT    /api/admin/site-settings/[key]  Update setting (admin only)
```

---

## Authentication & Authorization

### Authentication Flow

1. **Registration** (`POST /api/auth/register`)
   - User submits form with role, email, password, profile info
   - Password hashed with bcryptjs (salt rounds: 12)
   - User record created in MongoDB
   - JWT tokens generated (access + refresh)
   - Tokens stored in HttpOnly cookies (secure, sameSite: strict)

2. **Login** (`POST /api/auth/login`)
   - User submits email + password
   - Password verified against bcrypt hash
   - JWT tokens generated & set in HttpOnly cookies
   - Session established (expires per JWT config)

3. **Token Refresh** (`POST /api/auth/refresh`)
   - Client sends refresh token from cookie
   - New access token issued
   - HttpOnly cookie updated

4. **Protected Routes**
   - All protected endpoints check for valid JWT in HttpOnly cookie
   - Invalid/expired tokens return 401 Unauthorized
   - Middleware: `requireRole('ROLE')` enforces role-based access

### JWT Structure

```typescript
interface JWTPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'AGRICULTEUR' | 'FOURNISSEUR' | 'SPECIALIST' | 'CENTRE_DE_FORMATION'
  badge: 'FREE' | 'PRIME' | 'PREMIUM'
  iat: number (issued at)
  exp: number (expiration)
}
```

### Authorization Model

- **Role-based access control (RBAC)**: Routes check `user.role`
- **Ownership validation**: Users can only modify their own data
- **Admin gates**: Admin-only routes require `role === 'ADMIN'`
- **Middleware guards**: All API routes use `requireRole()` function from `src/lib/auth/session.ts`

### Session Management

- **Duration**: Access token typically 15-60 minutes, refresh token 7-30 days
- **Storage**: HttpOnly cookies (not accessible to JavaScript)
- **Security**: sameSite=strict, secure flag on HTTPS
- **Logout**: Cookie cleared, session invalidated

---

## Setup & Configuration

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (package manager)
- **Docker & Docker Compose** (for infrastructure)

### Installation Steps

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/AgriEcommerce.git
cd AgriEcommerce
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **MongoDB 7** (port 27017) — User: `admin`, Password: `password`
- **Redis 7** (port 6379) — No auth by default
- **Meilisearch 1.6** (port 7700) — Master key: `local-dev-master-key`

Verify:
```bash
docker-compose ps
```

#### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# MongoDB
MONGODB_URI=mongodb://admin:password@localhost:27017/agrimed?authSource=admin

# Auth Secrets (generate random 32+ char strings)
NEXTAUTH_SECRET=your-random-32-char-secret-here
JWT_SECRET=another-random-32-char-secret
JWT_REFRESH_SECRET=yet-another-random-32-char-secret

# App
NEXTAUTH_URL=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=local-dev-master-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_ENABLED=false  # Set to true only with valid Twilio credentials

# Stripe (optional for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

#### 5. Build Packages

```bash
pnpm build
```

#### 6. Seed Database

```bash
pnpm db:seed
```

This populates with sample data:
- Test users (admin, buyers, suppliers)
- Sample products, categories, formations
- Hero slides, promotions

#### 7. Start Development Server

```bash
pnpm dev
```

Server runs at **http://localhost:3000**

### Environment Variables Reference

| Variable | Type | Example | Purpose |
|----------|------|---------|---------|
| `MONGODB_URI` | string | `mongodb://...` | MongoDB connection |
| `NEXTAUTH_SECRET` | string | 32+ random chars | NextAuth encryption |
| `NEXTAUTH_URL` | string | `http://localhost:3000` | App URL |
| `JWT_SECRET` | string | 32+ random chars | JWT signing key |
| `JWT_REFRESH_SECRET` | string | 32+ random chars | Refresh token signing |
| `REDIS_URL` | string | `redis://localhost:6379` | Redis cache |
| `MEILISEARCH_HOST` | string | `http://localhost:7700` | Search engine |
| `MEILISEARCH_KEY` | string | Master key | Search API key |
| `SMTP_HOST` | string | `smtp.gmail.com` | Email server |
| `SMTP_PORT` | number | `587` | Email port |
| `SMTP_USER` | string | Your email | Email sender |
| `SMTP_PASS` | string | App password | Email auth |
| `TWILIO_ACCOUNT_SID` | string | Your SID | SMS provider |
| `TWILIO_AUTH_TOKEN` | string | Your token | SMS auth |
| `TWILIO_PHONE_NUMBER` | string | `+1234567890` | SMS sender |
| `SMS_ENABLED` | boolean | `false` | Enable/disable SMS |
| `STRIPE_SECRET_KEY` | string | `sk_test_...` | Stripe auth |

---

## Development Workflow

### Project Structure Navigation

```
apps/web/src/
├── app/                              # Next.js 14 App Router
│   ├── (auth)/                       # Auth group (login, register)
│   ├── admin/                        # Admin pages
│   ├── account/                      # User account pages
│   ├── cart/                         # Shopping cart page
│   ├── products/                     # Product pages
│   ├── orders/                       # Order pages
│   ├── formations/                   # Formation/training pages
│   ├── api/                          # API routes (backend)
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Homepage
│   └── globals.css                   # Global styles
│
├── components/                       # Reusable React components
│   ├── forms/                        # Form components
│   ├── home/                         # Homepage components
│   ├── layout/                       # Layout components (navbar, footer, sidebar)
│   ├── products/                     # Product-related components
│   ├── ui/                           # Shadcn/UI components
│   └── providers.tsx                 # Context providers
│
├── hooks/                            # Custom React hooks
│   ├── use-toast.ts                  # Toast notifications
│   └── (more hooks)
│
├── lib/                              # Utilities & helpers
│   ├── auth/                         # Auth utilities
│   │   ├── session.ts                # JWT session middleware
│   │   └── tokens.ts                 # Token generation
│   ├── cache/                        # Redis caching
│   ├── middleware/                   # Request middleware
│   ├── search/                       # Meilisearch integration
│   ├── notifications/                # Email/SMS helpers
│   ├── utils.ts                      # Misc utilities
│   └── env.ts                        # Environment validation
│
└── stores/                           # Zustand state stores
    └── cart.ts                       # Shopping cart state
```

### Common Development Tasks

#### Add a New API Route

1. Create file: `apps/web/src/app/api/[domain]/route.ts`
2. Import models from `@agrimed/db`
3. Use `requireRole()` for protected routes
4. Implement route handler (GET, POST, PUT, DELETE)
5. Add error handling & validation

Example:
```typescript
// apps/web/src/app/api/products/new-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Product } from '@agrimed/db';
import { requireRole } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await requireRole('FOURNISSEUR');  // Admin or supplier
    
    const body = await req.json();
    // Validate, process, save
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### Add a New Page

1. Create directory: `apps/web/src/app/[domain]/[page]/`
2. Create `page.tsx` with React component
3. Use existing components/layouts
4. Fetch data via API routes or direct DB (for server components)

#### Update Database Model

1. Edit model in `packages/db/src/models/[Model].ts`
2. Run: `pnpm db:migrate` (or restart Docker if using dev seed)
3. Update related API routes if needed
4. Update type definitions in `packages/types/src/index.ts`

#### Add Form Validation

Use Zod schemas in `packages/types/src/index.ts`:
```typescript
export const productSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  // ...
});
```

Then use in route:
```typescript
const parsed = productSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
```

#### Run Tests

```bash
pnpm test                    # Run all tests
pnpm test --watch          # Watch mode
pnpm test --coverage       # Coverage report
```

---

## Key Features Deep Dive

### 1. Smart Cart Management

- **Client-side state**: Zustand store persists across sessions
- **Real-time updates**: Add/remove/update quantities instantly
- **Price calculation**: Automatic subtotal, tax, total
- **Stock validation**: Can't checkout if out of stock
- **Checkout flow**: Cart → Order creation → Payment processing

### 2. Role-Based Product Visibility

Some products visible only to specific roles:
- Premium products → PRIME/PREMIUM badge holders only
- B2B products → FOURNISSEUR/CENTRE_DE_FORMATION only
- Restricted items → Admin approval required

### 3. Onboarding Workflow (New)

- Admin can **freeze registration** by toggling `onboardingActive` setting
- Users redirected to `/onboarding` to submit requests
- Admin reviews requests and approves (with editable fields)
- On approval: User created, credentials generated, email sent with password
- Fallback login email auto-generated if user email is missing

### 4. Full-Text Search

- Meilisearch indexes all products
- Real-time search with typo tolerance
- Faceted filters (category, price, supplier)
- Trending searches tracked
- Search analytics for admin

### 5. Stock Management

- Track inventory per product
- Automatic stock decrease on order
- Low-stock alerts (`StockAlert` model)
- Stock movement audit trail
- Prevent overselling

### 6. Multi-Channel Notifications

- **Email**: Nodemailer SMTP integration
  - Formatted HTML emails
  - Onboarding approval notifications
  - Order confirmations (future)
- **SMS**: Twilio integration
  - Onboarding approval SMS
  - Order status updates (future)
  - 2FA codes (future)

### 7. Admin Dashboard & Audit

- Real-time stats (active users, orders, revenue)
- Audit logs for every action
- User management (suspend, role changes)
- Content moderation (promotions, hero slides)
- Report generation (sales, traffic, demographics)

### 8. Formation/Training Management

- Training centers create formations
- Users enroll in formations
- Attendance tracking
- Certificate generation (future)
- Analytics on completion rates

---

## Deployment Notes

### Production Checklist

- [ ] Use strong, unique secrets for `JWT_SECRET`, `NEXTAUTH_SECRET`
- [ ] Configure production database (MongoDB Atlas or managed service)
- [ ] Set up Redis (Upstash or managed service)
- [ ] Configure SMTP (Gmail, Mailgun, SendGrid, etc.)
- [ ] Set up Twilio for SMS (optional but recommended)
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Enable Stripe for payments
- [ ] Set up Google Maps API key
- [ ] Configure CDN/S3 for image storage
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (TLS/SSL)
- [ ] Set up monitoring (Sentry, LogRocket, etc.)
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured

### Environment for Production

```env
NEXTAUTH_URL=https://tunagri.dz
NODE_ENV=production

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agrimed
REDIS_URL=redis://...  # Managed service
MEILISEARCH_HOST=https://meilisearch.tunagri.dz
MEILISEARCH_KEY=secure-production-key

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx

TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

JWT_SECRET=long-random-secret-32-chars-min
JWT_REFRESH_SECRET=another-long-random-secret
NEXTAUTH_SECRET=production-secret-32-chars-min
```

### Docker Deployment

Build image:
```bash
docker build -t tunagri:latest .
```

Run container:
```bash
docker run -d \
  --name tunagri \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb://..." \
  -e JWT_SECRET="..." \
  tunagri:latest
```

### Kubernetes (Optional)

See `k8s/` directory for deployment manifests.

---

## Summary for AI Agents

### Key Points to Remember

1. **Multi-tenant B2B marketplace** for agriculture sector in Tunisia
2. **5 user roles**: ADMIN, AGRICULTEUR, FOURNISSEUR, SPECIALIST, CENTRE_DE_FORMATION
3. **Tech**: Next.js 14, MongoDB, Redis, Meilisearch, JWT auth, Zustand, React Query
4. **Architecture**: Monorepo with `apps/web` (frontend + API) + `packages/db` (models) + `packages/types`
5. **API-driven**: All features exposed via REST API routes in `apps/web/src/app/api/`
6. **Database**: 28+ Mongoose models in `packages/db/src/models/`
7. **Authentication**: JWT-based with HttpOnly cookies, role-based access control
8. **New Feature**: Onboarding system with email/SMS notifications and admin approval
9. **Search**: Meilisearch for product discovery
10. **Notifications**: Nodemailer (email) + Twilio (SMS)

### When Implementing Features

- Follow existing patterns (API route → Model → Component)
- Validate inputs with Zod schemas
- Always connect to DB before queries: `await connectDB()`
- Use `requireRole()` for access control
- Add audit logs for user actions
- Cache where appropriate (Redis)
- Test with existing test accounts
- Document changes in comments

---

**Last Updated**: May 10, 2026  
**Maintainers**: Development Team  
**Status**: Active Development
