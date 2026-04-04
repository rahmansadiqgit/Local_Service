# Localix - Local Services Marketplace

Localix is a full-stack local services marketplace where users can publish supply or demand posts, connect with role-based members, manage ERP task cards, exchange messages, and track work completion with ratings.

## Project Overview

Localix connects nearby people and businesses through:

- Supply and Demand posts
- Skills, Expertise, and Products under each post
- Role-based connection requests (Expertise, Skill Provider, Delivery Man)
- ERP cards to manage execution flow
- In-ERP messaging threads
- Notification system with actor/context details
- Ratings and reviews

## Tech Stack

### Backend

- Python 3.11
- Django 5.2
- Django REST Framework
- JWT auth via djangorestframework-simplejwt
- django-filter for query filtering
- Pillow for media/image handling
- ReportLab for ERP PDF generation
- WhiteNoise for static files
- SQLite (local fallback) / PostgreSQL (production)

### Frontend

- React 19 + Vite 7
- React Router
- Axios
- Tailwind CSS
- Chart.js and react-chartjs-2
- Leaflet and react-leaflet
- jsPDF

### Deployment

- Backend: Railway + Gunicorn
- Frontend: Vercel (SPA rewrite enabled)

## Repository Structure

```text
Local_Service/
	backend/
		core/
			models.py
			serializers.py
			urls.py
			views.py
			migrations/
		localix/
			settings.py
			urls.py
			wsgi.py
		manage.py
		requirements.txt
		Procfile
		railway.json
		runtime.txt
	frontend/
		src/
			api/client.js
			components/
			context/
			pages/
			App.jsx
			main.jsx
		package.json
		vite.config.js
		vercel.json
	README_NOTIFICATIONS.md
	COMPLETION_SUMMARY.md
	FINAL_SUMMARY.txt
```

## Core Domain Models

- User: profile fields, role, contact, location
- Post: supply or demand entry created by owner
- Skill, Expertise, Product: attach service/product lines to a post
- ERP: lifecycle card (Pending -> On Process -> Completed)
- ERPMessage: thread and replies under an ERP
- Connection: requester/addressee relationship and role
- Notification: actor + related user + typed event
- Rating: customer feedback on providers/posts
- ProblemReport: authenticated issue reporting

## Main Features

### Authentication and Account

- Register, login, refresh token, logout
- Profile read/update
- Change password
- Password reset request and confirm via email token link

### Marketplace and Content

- Create/edit/delete posts
- Attach skills, expertise, products
- Search/filter/order post lists

### ERP Workflow

- Build work cards from posts
- Track stage transitions
- Generate PDF slips
- Chat inside ERP cards with message/reply support
- Completion and rating workflows

### Connection and Notification Flow

- Send connection request with role
- Accept/reject/remove connection
- Connection overview buckets (incoming/outgoing/live/recent/hired/members)
- Notification feed with typed connection events

## API Overview

Base URL prefix: /api/

### Auth and User Endpoints

- POST /auth/register/
- POST /auth/login/
- POST /auth/refresh/
- POST /auth/logout/
- GET /auth/me/
- PATCH /users/profile/
- POST /users/change-password/
- POST /auth/password-reset/
- POST /auth/password-reset/confirm/
- POST /report-problem/

### Router Resources

- /posts/
- /skills/
- /expertises/
- /products/
- /erp/
- /ratings/
- /notifications/
- /users/
- /connections/

### Important Custom Actions

- Connections:
  - GET /connections/overview/
  - POST /connections/request/
  - POST /connections/{id}/respond/
  - POST /connections/remove/
- ERP:
  - GET or POST /erp/{id}/messages/
  - Additional ERP actions for booking/application approval, completion, and participant rating are provided in the ERP viewset.

## Frontend Routes

### Public

- /
- /feed
- /services
- /about
- /help-centre
- /report
- /login
- /register
- /reset-password
- /reset-password/confirm

### Protected

- /dashboard and /dashboard/:id
- /profile, /profile/edit, /profile/change-password, /profile/:id
- /create-post
- /edit-post/:id
- /manage-post and /manage-post/:id
- /connections
- /erp
- /cart

## Local Development Setup

### 1) Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### 2) Clone repository

```bash
git clone <your-repository-url>
cd Local_Service
```

### 3) Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend default URL:

- http://127.0.0.1:8000

### 4) Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL:

- http://localhost:5173

## Environment Variables

Create a root .env file at the workspace root.

### Recommended Local .env

```env
SECRET_KEY=replace-with-strong-secret
DEBUG=True
SERVE_MEDIA=True

# Optional database URL. If empty, SQLite is used.
DATABASE_URL=

# Frontend/CORS
FRONTEND_URL=http://localhost:5173
FRONTEND_DOMAIN=
CUSTOM_DOMAIN=
RAILWAY_PUBLIC_DOMAIN=

# Email (Brevo recommended)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_brevo_smtp_login
EMAIL_HOST_PASSWORD=your_brevo_smtp_key
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_TIMEOUT=20
DEFAULT_FROM_EMAIL=your_verified_sender@yourdomain.com
SERVER_EMAIL=your_verified_sender@yourdomain.com
```

### Frontend Environment

Create frontend/.env and set:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

If not set, frontend API client defaults to http://localhost:8000/api.

## Authentication Handling in Frontend

- Access token is attached via Axios request interceptor.
- On 401, frontend attempts token refresh using refresh token.
- If refresh fails, local tokens are cleared and user is redirected to login.

## Database and Migrations

- Local default database: backend/db.sqlite3
- Production database: PostgreSQL through DATABASE_URL

Run migrations after pulling changes:

```bash
cd backend
python manage.py migrate
```

## Deployment

### Backend on Railway

Backend deployment files are already configured:

- Procfile
- runtime.txt (Python 3.11.0)
- railway.json with build/start commands

High-level flow:

1. Connect repository to Railway
2. Add PostgreSQL service
3. Set variables: SECRET_KEY, DEBUG=False, FRONTEND_DOMAIN
4. Deploy and test API

Detailed guide:

- backend/RAILWAY_DEPLOYMENT.md

### Frontend on Vercel

Vercel is configured as Vite SPA:

- Build command: npm run build
- Output directory: dist
- Rewrite all routes to index.html

Set production API URL in frontend environment:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

## Existing Project Documentation

- README_NOTIFICATIONS.md
- COMPLETION_SUMMARY.md
- FINAL_SUMMARY.txt

Use these for notification architecture details and implementation history.

## Useful Commands

```bash
# Backend
cd backend
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Frontend
cd frontend
npm run dev
npm run build
npm run preview
```

## Troubleshooting

### 1) Password reset email not sent

- Verify Brevo SMTP credentials
- Ensure sender email/domain is verified
- Confirm FRONTEND_URL is correct

### 2) CORS issues

- Check frontend origin in CORS_ALLOWED_ORIGINS
- Set FRONTEND_DOMAIN in production

### 3) 401 refresh loop

- Ensure refresh token exists
- Confirm /auth/refresh/ endpoint works
- Clear localStorage and login again

### 4) Media persistence in production

Local media storage may not persist on some platforms.
Use persistent volume or external object storage for production-grade media handling.

## License

No explicit license file exists yet.
Add a LICENSE file to define usage and distribution terms.
