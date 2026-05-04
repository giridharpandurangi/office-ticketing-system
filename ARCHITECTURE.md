# Architecture & Technical Details

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│            Users' Browsers                          │
│     (http://192.168.x.x:3000)                       │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/HTTPS
                     │ JSON
┌────────────────────▼────────────────────────────────┐
│         React Frontend (Port 3000)                  │
│  • User Dashboard                                   │
│  • Ticket Creation                                  │
│  • Admin Panel                                      │
└────────────────────┬────────────────────────────────┘
                     │ REST API
                     │ JWT Auth
┌────────────────────▼────────────────────────────────┐
│    Node.js/Express Backend (Port 5000)              │
│  • Authentication (JWT)                             │
│  • Ticket Management                                │
│  • User Management                                  │
│  • Comment System                                   │
└────────────────────┬────────────────────────────────┘
                     │ SQL
┌────────────────────▼────────────────────────────────┐
│        PostgreSQL Database (Port 5432)              │
│  • Users Table                                      │
│  • Tickets Table                                    │
│  • Comments Table                                   │
│  • Categories Table                                 │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js v14+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS (included in App.css)
- **Build Tool**: Create React App

## Database Schema

### Users Table
```sql
users (
  id: SERIAL PRIMARY KEY,
  email: VARCHAR UNIQUE NOT NULL,
  password: VARCHAR NOT NULL,
  name: VARCHAR NOT NULL,
  role: VARCHAR DEFAULT 'user',
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

### Tickets Table
```sql
tickets (
  id: SERIAL PRIMARY KEY,
  title: VARCHAR NOT NULL,
  description: TEXT,
  category_id: INTEGER FK,
  priority: VARCHAR (low|medium|high),
  status: VARCHAR (open|in_progress|resolved),
  created_by: INTEGER FK users.id,
  assigned_to: INTEGER FK users.id,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  resolved_at: TIMESTAMP
)
```

### Comments Table
```sql
comments (
  id: SERIAL PRIMARY KEY,
  ticket_id: INTEGER FK tickets.id,
  user_id: INTEGER FK users.id,
  content: TEXT NOT NULL,
  created_at: TIMESTAMP
)
```

### Categories Table
```sql
categories (
  id: SERIAL PRIMARY KEY,
  name: VARCHAR UNIQUE NOT NULL,
  description: TEXT,
  created_at: TIMESTAMP
)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Tickets
- `GET /api/tickets` - Get tickets (filtered by role)
- `GET /api/tickets/:id` - Get ticket detail with comments
- `POST /api/tickets` - Create new ticket
- `PATCH /api/tickets/:id` - Update ticket (engineer only)
- `POST /api/tickets/:id/comments` - Add comment

### Users (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/engineers/list` - Get engineers
- `POST /api/users` - Create user
- `PATCH /api/users/:id/role` - Update user role

## Security Features

✅ **Password Security**
- Hashed with bcryptjs (salt rounds: 10)
- Never stored as plaintext

✅ **Authentication**
- JWT tokens with 7-day expiration
- Token stored in localStorage
- Sent in Authorization header

✅ **Authorization**
- Role-based access control (RBAC)
- Users see only their tickets
- Engineers can access all tickets
- Admins manage users

✅ **Data Validation**
- Input validation on all endpoints
- Email format validation
- Password strength requirements

## Performance Considerations

- Database queries optimized with proper indexes
- Pagination-ready (can be added to GET endpoints)
- Lightweight REST API
- Efficient JWT validation

## Scalability

Current setup handles:
- ✅ ~100 users
- ✅ ~1000+ tickets
- ✅ Small office environment

### To Scale Further:
- Add database indexing on foreign keys
- Implement ticket pagination
- Add caching (Redis)
- Load balancing for multiple backend instances
- Database replication

## Development Notes

### Adding New Features
1. Create new route in `/routes`
2. Add controller logic
3. Update frontend components
4. Test with Postman or similar

### Database Migrations
For future schema changes:
```sql
ALTER TABLE tickets ADD COLUMN new_field VARCHAR;
```

### Environment Variables
Copy `.env.example` to `.env` and update:
- `DATABASE_URL`: PostgreSQL connection
- `JWT_SECRET`: Use random string (openssl rand -hex 32)
- `PORT`: Backend port (default 5000)
- `EMAIL_*`: For future email notifications

## Deployment

For production deployment:
1. Use HTTPS (SSL certificate)
2. Set `NODE_ENV=production`
3. Use strong JWT_SECRET
4. Enable CORS only for trusted domains
5. Set database backups
6. Monitor logs and uptime

---

For more info, see [README.md](README.md)
