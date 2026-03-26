# Local_Service

## Brevo Setup For Password Reset Email

Use Brevo SMTP for reliable reset-password email delivery.

### 1. Create Brevo SMTP credentials

1. Create/login to Brevo.
2. Go to SMTP and API.
3. Generate an SMTP key.
4. Verify a sender email/domain in Brevo.

### 2. Update root .env

Add these values in .env:

```env
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
FRONTEND_URL=http://localhost:5173
```

### 3. Run services

Backend:

```powershell
cd backend
python manage.py runserver
```

Frontend:

```powershell
cd frontend
npm run dev
```

### 4. Expected behavior

1. User enters registered email and clicks send link.
2. Backend verifies email exists and is active.
3. Reset link is emailed to that registered email.

