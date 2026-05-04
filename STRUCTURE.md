# Project Structure

```
ticketing-system/
├── backend/                          # Node.js/Express server
│   ├── db/
│   │   ├── pool.js                   # Database connection pool
│   │   └── init.js                   # Database schema initialization
│   ├── middleware/
│   │   └── auth.js                   # JWT authentication & role checks
│   ├── routes/
│   │   ├── auth.js                   # Login/Register endpoints
│   │   ├── tickets.js                # Ticket CRUD & comments
│   │   └── users.js                  # User management (admin)
│   ├── .env.example                  # Environment variables template
│   ├── .gitignore                    # Git ignore rules
│   ├── package.json                  # Backend dependencies
│   └── server.js                     # Main server file
│
├── frontend/                         # React application
│   ├── public/
│   │   └── index.html                # HTML entry point
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js              # Login page
│   │   │   ├── Register.js           # Registration page
│   │   │   ├── Dashboard.js          # Main ticket list & creation
│   │   │   ├── TicketDetail.js       # Ticket details & comments
│   │   │   └── AdminPanel.js         # User management
│   │   ├── components/               # Reusable components (future)
│   │   ├── App.js                    # Main app component & routing
│   │   ├── App.css                   # Styling
│   │   ├── index.js                  # React DOM render
│   │   └── package.json              # Frontend dependencies
│   ├── .gitignore                    # Git ignore rules
│   └── package.json                  # React dependencies
│
├── README.md                         # Full documentation
├── QUICKSTART.md                     # 5-minute setup guide
├── ARCHITECTURE.md                   # Technical architecture details
├── NETWORK.md                        # Network & access setup
├── STRUCTURE.md                      # This file
├── setup.bat                         # Windows setup script
├── setup.sh                          # macOS/Linux setup script
└── package.json                      # Root package (optional)
```

## File Descriptions

### Backend Files

| File | Purpose |
|------|---------|
| `server.js` | Entry point - starts Express server, initializes DB |
| `db/pool.js` | PostgreSQL connection pool configuration |
| `db/init.js` | Creates database tables on first run |
| `middleware/auth.js` | JWT verification and role checks |
| `routes/auth.js` | User registration and login endpoints |
| `routes/tickets.js` | Ticket CRUD, comments, status updates |
| `routes/users.js` | User creation and management (admin only) |
| `.env.example` | Template for `.env` configuration |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/index.js` | React entry point |
| `src/App.js` | Main component with routing and navbar |
| `src/App.css` | All styling (no CSS framework) |
| `pages/Login.js` | User login form |
| `pages/Register.js` | New user registration |
| `pages/Dashboard.js` | Main page - ticket list & creation |
| `pages/TicketDetail.js` | Ticket view with comments |
| `pages/AdminPanel.js` | User management interface |
| `public/index.html` | HTML template |

## Data Flow

### Creating a Ticket (User)
```
User Interface → Dashboard.js
    ↓
Clicks "Create New Ticket"
    ↓
Form → POST /api/tickets
    ↓
Backend validates → tickets.js route
    ↓
Insert to DB → Ticket created
    ↓
Frontend updates list
```

### Assigning a Ticket (Engineer)
```
Engineer opens ticket detail
    ↓
TicketDetail.js
    ↓
Selects engineer from dropdown
    ↓
PATCH /api/tickets/:id
    ↓
Backend validates (engineer only) → auth middleware
    ↓
Update DB → Ticket assigned
    ↓
Ticket updated in UI
```

## Database Tables Relationships

```
users
  ├── has created → tickets (created_by)
  ├── assigned to → tickets (assigned_to)
  └── authored → comments (user_id)

tickets
  ├── created by → users (created_by)
  ├── assigned to → users (assigned_to)
  ├── in → categories (category_id)
  └── has many → comments

comments
  ├── on → tickets (ticket_id)
  └── by → users (user_id)

categories
  └── used by → tickets (category_id)
```

## Authentication Flow

```
1. User enters email/password
        ↓
2. POST /api/auth/login
        ↓
3. Backend hashes password, compares with DB
        ↓
4. If match → Generate JWT token
        ↓
5. Return token to frontend
        ↓
6. Frontend stores in localStorage
        ↓
7. All future requests include: Authorization: Bearer {token}
        ↓
8. Backend validates token with authMiddleware
        ↓
9. If valid → req.user populated with user data
        ↓
10. Allow/deny based on role
```

## Role Permissions Matrix

| Feature | User | Engineer | Admin |
|---------|------|----------|-------|
| Create Ticket | ✅ | ✅ | ✅ |
| View Own Tickets | ✅ | - | - |
| View All Tickets | - | ✅ | ✅ |
| Add Comments | ✅ | ✅ | ✅ |
| Assign Tickets | - | ✅ | ✅ |
| Update Status | - | ✅ | ✅ |
| Create Users | - | - | ✅ |
| Manage Roles | - | - | ✅ |

## API Response Examples

### Login Success
```json
{
  "user": {
    "id": 1,
    "email": "admin@ticketing.local",
    "name": "Admin User",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Tickets (Engineer view - all tickets)
```json
[
  {
    "id": 1,
    "title": "Login not working",
    "description": "Cannot login to system",
    "priority": "high",
    "status": "in_progress",
    "created_by": 5,
    "created_by_name": "John Doe",
    "assigned_to": 2,
    "assigned_to_name": "Engineer One",
    "category_name": "Bug",
    "created_at": "2026-05-04T10:30:00Z"
  },
  ...
]
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ticketing_db

# JWT
JWT_SECRET=random-secret-key-here

# Server
PORT=5000
NODE_ENV=development

# Email (future feature)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Running Both Servers

### Terminal 1 - Backend
```bash
cd backend
npm install  # First time only
npm start
```

Output:
```
Server running on port 5000
Access the application at http://localhost:3000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install  # First time only
npm start
```

Output:
```
Compiled successfully!
You can now view ticketing-system-frontend in the browser.
  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

## Key Technologies Used

- **Express.js**: Web framework
- **PostgreSQL**: Database
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **React**: UI framework
- **Axios**: HTTP client
- **React Router**: Navigation

---

See [README.md](README.md) for full setup instructions
