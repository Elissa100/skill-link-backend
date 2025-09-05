# SkillLink Backend - Freelancing Platform API

🚀 Backend API for **SkillLink**, a freelancing marketplace that connects clients and freelancers.  
Built with **Node.js, Express, PostgreSQL, Prisma, JWT, Redis, and Stripe**.

---

## ✨ Features

### Core Functionality
- 🔐 **Authentication** – JWT-based auth with refresh tokens
- 👥 **Role-based Access** – Client, Freelancer, Admin roles
- 📋 **Task Management** – Post, browse, and manage projects
- 💰 **Bidding System** – Freelancers submit proposals
- 💬 **Real-time Messaging** – Socket.io powered chat
- 💳 **Payment Processing** – Stripe integration with escrow simulation
- 📂 **File Uploads** – Project attachments
- 🔔 **Notifications** – In-app and email notifications

### Technical Features
- 📖 **API Documentation** – Swagger/OpenAPI
- 🗃 **Database** – Prisma ORM with PostgreSQL
- ⚡ **Caching** – Redis for sessions and performance
- 🛡 **Security** – Rate limiting, CORS, input validation
- ✅ **Testing** – Jest + Supertest

---

## 🛠 Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + Refresh Tokens, bcrypt
- **Real-time**: Socket.io
- **Cache**: Redis
- **Payments**: Stripe
- **Email**: Nodemailer
- **Validation**: Zod
- **Docs**: Swagger / OpenAPI

---

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Docker & Docker Compose (recommended for dev)

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/Elissa100/skilllink-backend.git
cd skilllink-backend
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` → `.env` and update values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/skilllink"
JWT_SECRET="your_jwt_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
REDIS_URL="redis://localhost:6379"
STRIPE_SECRET_KEY="your_stripe_secret"
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
PORT=3001
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

---

## 📚 API Documentation

* Swagger UI: [http://localhost:3001/docs](http://localhost:3001/docs)
* JSON Schema: [http://localhost:3001/docs.json](http://localhost:3001/docs.json)

---

## 🔑 Demo Accounts (Seeded)

| Role       | Email                                                       | Password       |
| ---------- | ----------------------------------------------------------- | -------------- |
| Admin      | [admin@skilllink.dev](mailto:admin@skilllink.dev)           | Admin123!      |
| Client     | [client@skilllink.dev](mailto:client@skilllink.dev)         | Client123!     |
| Freelancer | [freelancer@skilllink.dev](mailto:freelancer@skilllink.dev) | Freelancer123! |

---

## 🏗 Project Structure

```
backend/
├── src/
│   ├── config/        # Database, Redis, email configs
│   ├── middleware/    # Auth, validation, uploads
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── controllers/   # Route handlers
│   └── server.js      # Express app entry
├── prisma/
│   └── schema.prisma
├── tests/             # Jest + Supertest
├── .env.example
└── package.json
```

---

## 🧪 Testing

Run backend tests:

```bash
npm test
```

* Unit tests (services)
* Integration tests (API endpoints)
* Auth & DB flow tests

---

## 🔒 Security

* Password hashing (bcrypt)
* JWT with refresh token rotation
* Rate limiting & CORS config
* Zod schema validation
* File type/size restrictions

---

## 🚀 Deployment

### Docker (Development)

```bash
docker-compose up --build
```

### Production (example: Render/Heroku)

1. Set env variables
2. Provision PostgreSQL + Redis
3. Run migrations: `npx prisma migrate deploy`
4. Start server: `npm start`

---

## 📄 License

MIT License

---

```

---

👉 Do you want me to also clean up and make a **frontend-only README** (so both repos look consistent and professional), or just backend for now?
```
