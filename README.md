# Dashboard Platform — Backend API Documentation

## Stack
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (Access + Refresh tokens) + Google Authenticator 2FA (speakeasy)
- **Email**: Resend
- **File Upload**: Multer + Cloudinary
- **Security**: Helmet, CORS, Rate Limiting, bcryptjs

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in all values in .env

# 3. Start dev server
npm run dev

# 4. Start production
npm start
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `RESEND_API_KEY` | From resend.com dashboard |
| `FROM_EMAIL` | Sender email (verified in Resend) |
| `CLOUDINARY_*` | Cloudinary credentials |
| `ADMIN_EMAIL` | `chibuksai@gmail.com` |
| `ADMIN_PASSWORD` | `Password123` |
| `FRONTEND_URL` | e.g. `http://localhost:3000` |

---

## Authentication Flow

### Admin Login (No 2FA)
```
POST /api/auth/login
Body: { email: "chibuksai@gmail.com", password: "Password123" }
Response: { accessToken, refreshToken, dashboardRole: "admin" }
```

### Client/Team Registration → 2FA Setup
```
1. POST /api/auth/register
   Body: { firstName, lastName, email, password, role: "client"|"team", ...extras }
   Response: { setupToken, nextStep: "setup_2fa" }

2. POST /api/auth/2fa/setup
   Body: { setupToken }
   Response: { qrCode (base64 PNG), manualKey, otpauthUrl }
   → User scans QR code in Google Authenticator

3. POST /api/auth/2fa/enable
   Body: { setupToken, otp: "123456" }
   Response: { accessToken, refreshToken, dashboardRole }
```

### Client/Team Login (with existing 2FA)
```
1. POST /api/auth/login
   Body: { email, password }
   Response: { requires2FA: true, partialToken }

2. POST /api/auth/2fa/verify
   Body: { partialToken, otp: "123456" }
   Response: { accessToken, refreshToken, dashboardRole }
```

---

## Role System

| Role | Access Level |
|---|---|
| `admin` | Full access. Hardcoded credentials only. No 2FA. |
| `client` | Own projects, milestones, reviews. Requires 2FA. |
| `team` | Assigned tasks, earnings. Requires 2FA. |
| `team` (with admin grant) | Dashboard switches to admin view. |

### Admin Access Grant
```
POST /api/admin/grant-admin
Headers: Authorization: Bearer <adminToken>
Body: { userId, isPermanent: false, expiryDate: "2025-03-01" }
```
- Cron job runs hourly to auto-revoke expired temporary admin access
- Team member receives email + notification when access changes

---

## API Endpoints

### Auth `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register client or team member |
| POST | `/login` | ❌ | Login step 1 (credentials) |
| POST | `/2fa/setup` | setupToken | Generate QR code |
| POST | `/2fa/enable` | setupToken | Verify OTP + enable 2FA |
| POST | `/2fa/verify` | partialToken | Verify OTP at login |
| POST | `/refresh` | ❌ | Refresh access token |
| POST | `/forgot-password` | ❌ | Send reset email |
| POST | `/reset-password` | ❌ | Reset with token |
| GET | `/me` | ✅ | Get current user |
| PUT | `/profile` | ✅ | Update profile + avatar |
| POST | `/change-password` | ✅ | Change password |

### Projects `/api/projects`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Admin | Create project with tasks |
| GET | `/` | Any | Role-filtered project list |
| GET | `/:id` | Any | Get single project |
| PATCH | `/:id` | Admin | Update project |
| DELETE | `/:id` | Admin | Archive project |
| POST | `/:id/upload` | Admin | Upload project file |

### Milestones `/api/milestones`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Admin | Create + email client |
| GET | `/?projectId=...` | Any | Get project milestones |
| PATCH | `/:id/status` | Admin | Update milestone status |
| DELETE | `/:id` | Admin | Delete milestone |

### Tasks `/api/tasks`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Admin | Create + assign task |
| GET | `/` | Admin/Team | Get tasks (role-filtered) |
| GET | `/:id` | Admin/Team | Get task detail |
| PATCH | `/:id` | Admin | Update task details |
| PATCH | `/:id/status` | Any | Update task status |
| POST | `/:id/submit` | Team | Submit completed task |
| DELETE | `/:id` | Admin | Delete task |

### Reviews `/api/reviews`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public` | ❌ | Approved reviews (homepage) |
| POST | `/` | Client | Submit review |
| GET | `/` | Any | Get reviews (role-filtered) |
| PATCH | `/:id/approve` | Admin | Approve + publish review |
| PATCH | `/:id/reject` | Admin | Reject review |

### Admin `/api/admin`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | List all users |
| GET | `/users/:id` | Admin | Get user detail |
| PATCH | `/users/:id/toggle-active` | Admin | Activate/deactivate user |
| POST | `/grant-admin` | Admin | Grant team member admin access |
| POST | `/revoke-admin` | Admin | Revoke admin access |
| GET | `/stats` | Admin | Platform overview stats |
| GET | `/notifications` | Admin | Admin notifications |
| PATCH | `/notifications/:id/read` | Admin | Mark notification read |
| PATCH | `/notifications/read-all` | Admin | Mark all read |

### Dashboard `/api/dashboard`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | Role-customized dashboard data |
| GET | `/notifications` | Any | User notifications |
| PATCH | `/notifications/:id/read` | Any | Mark read |
| PATCH | `/notifications/read-all` | Any | Mark all read |

---

## Dashboard Response Structure

### Admin `GET /api/dashboard`
```json
{
  "role": "admin",
  "admin": {
    "stats": { "totalClients", "totalTeam", "totalProjects", "pendingReviews", "revenue" },
    "recentProjects": [...],
    "pendingTaskReviews": [...],
    "teamWithElevatedAccess": [...],
    "quickActions": [...]
  }
}
```

### Client `GET /api/dashboard`
```json
{
  "role": "client",
  "client": {
    "stats": { "totalProjects", "activeProjects", "completedProjects" },
    "projects": [...],
    "activeProject": { "milestones": [...] },
    "upcomingMilestones": [...],
    "notifications": [...]
  }
}
```

### Team `GET /api/dashboard`
```json
{
  "role": "team",
  "team": {
    "stats": { "totalAssignedTasks", "earnings": { "totalEarnings", "earnedSoFar" } },
    "activeTasks": [...],
    "reviewTasks": [...],
    "overdueTasks": [...],
    "notifications": [...]
  }
}
```

---

## Email Notifications (via Resend)

| Trigger | Recipients |
|---|---|
| User registration | New user (welcome) |
| Project created | Client |
| Milestone created | Client (with details) |
| Milestone completed | Client |
| Task assigned | Team member |
| Task submitted | Admin (chibuksai@gmail.com) |
| Review approved | Client |
| Admin access granted | Team member |
| Password reset | User |

---

## Security Features
- Passwords hashed with bcrypt (12 rounds)
- JWT with short expiry (7d) + refresh tokens (30d)
- 2FA with TOTP (Google Authenticator) for all non-admin users
- Rate limiting on auth routes (20 req / 15 min)
- Helmet security headers
- CORS configured for frontend URL only
- Role-based access control on every route
- Admin hardcoded credentials — cannot be changed via API
