# Railway Deployment Guide for Django Backend

## Prerequisites

- GitHub account
- Railway account (sign up at railway.app)
- Your Django project pushed to GitHub

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure all the necessary files are committed:

- `Procfile`
- `runtime.txt`
- `railway.json`
- `requirements.txt` (updated with production dependencies)
- Updated `settings.py`

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and login
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect it as a Python project

### 3. Add PostgreSQL Database

1. In your Railway project dashboard, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically:
   - Create a PostgreSQL database
   - Set the `DATABASE_URL` environment variable
   - Link it to your Django service

### 4. Configure Environment Variables

Go to your Django service → "Variables" tab and add:

```
SECRET_KEY=your-new-secret-key-here
DEBUG=False
FRONTEND_DOMAIN=your-frontend-domain.vercel.app
```

To generate a secure SECRET_KEY, run in terminal:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Deploy

Railway will automatically:

- Install dependencies from `requirements.txt`
- Run `collectstatic` to gather static files
- Run migrations to set up the database
- Start your application with Gunicorn

### 6. Get Your Backend URL

After deployment:

1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy your Railway domain (e.g., `your-app.up.railway.app`)
4. Update your frontend to use this URL

### 7. Create Superuser (Optional)

To create an admin user:

1. Go to your service in Railway
2. Click on "Settings" → "Deploy Logs"
3. Use the Railway CLI or run commands via the dashboard

Using Railway CLI:

```bash
railway login
railway link
railway run python manage.py createsuperuser
```

## Environment Variables Reference

### Required:

- `SECRET_KEY` - Django secret key (generate a new one!)
- `DEBUG` - Set to `False` for production
- `DATABASE_URL` - Automatically set by Railway PostgreSQL

### Optional:

- `FRONTEND_DOMAIN` - Your frontend domain for CORS
- `CUSTOM_DOMAIN` - Custom domain if you have one
- Email settings (if using email functionality)

## Post-Deployment Checklist

- [ ] PostgreSQL database is connected
- [ ] Environment variables are set
- [ ] Migrations ran successfully
- [ ] Static files collected
- [ ] Application is running (check deploy logs)
- [ ] Generate and test Railway domain
- [ ] Update frontend API URL
- [ ] Test API endpoints
- [ ] Create superuser account
- [ ] Test admin panel access

## Troubleshooting

### Build Fails

- Check Railway logs for error messages
- Ensure all dependencies are in `requirements.txt`
- Verify Python version in `runtime.txt` is supported

### Database Connection Issues

- Verify PostgreSQL service is running
- Check `DATABASE_URL` is set automatically
- Review connection settings in logs

### Static Files Not Loading

- Ensure `collectstatic` ran during build
- Check WhiteNoise is in MIDDLEWARE
- Verify STATIC_ROOT is set correctly

### CORS Errors

- Add frontend domain to `FRONTEND_DOMAIN` env variable
- Check CORS settings in settings.py
- Ensure frontend is using correct backend URL

## Useful Railway CLI Commands

```bash
# Login to Railway
railway login

# Link to your project
railway link

# View logs
railway logs

# Run Django commands
railway run python manage.py migrate
railway run python manage.py createsuperuser
railway run python manage.py shell

# Open in browser
railway open
```

## Custom Domain Setup (Optional)

1. Go to "Settings" → "Networking"
2. Click "Custom Domain"
3. Add your domain
4. Update DNS records as instructed
5. Add domain to `CUSTOM_DOMAIN` environment variable

## Monitoring

- Check "Observability" tab for metrics
- View "Deploy Logs" for application logs
- Set up alerts in Railway dashboard

## Important Notes

- **Media Files**: Current setup stores media locally (not persistent on Railway). For production, use:
  - Railway Volumes
  - AWS S3
  - Cloudinary
  - Other cloud storage

- **Database Backups**: Railway provides automatic backups for PostgreSQL

- **Environment**: Never commit `.env` files with real credentials

- **Scaling**: Railway can auto-scale based on your plan

## Need Help?

- Railway Docs: https://docs.railway.app
- Django Deployment Docs: https://docs.djangoproject.com/en/stable/howto/deployment/
- Railway Discord: https://discord.gg/railway
