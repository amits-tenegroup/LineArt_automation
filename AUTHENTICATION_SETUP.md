# Authentication Setup

## 🎉 Authentication has been added to your LineArt Automation app!

### What's New:
- ✅ Login page with username/password authentication
- ✅ Protected routes (all pages require login)
- ✅ Logout button in the header
- ✅ Secure middleware protection

### Default Credentials:
- **Username:** `admin`
- **Password:** `password123`

## 🔧 Setup Instructions

### 1. Update Environment Variables in Vercel

You need to add the authentication credentials to your Vercel project:

1. Go to your Vercel dashboard: https://vercel.com/amit-schwachters-projects/lineart-automation/settings/environment-variables

2. Add these two environment variables:
   - **Name:** `AUTH_USERNAME`
     - **Value:** Your desired username (default: `admin`)
     - **Environments:** Production, Preview, Development
   
   - **Name:** `AUTH_PASSWORD`
     - **Value:** Your desired password (default: `password123`)
     - **Environments:** Production, Preview, Development

3. After adding the variables, **redeploy your application**:
   - Go to: https://vercel.com/amit-schwachters-projects/lineart-automation/deployments
   - Click the three dots (...) on the latest deployment
   - Click "Redeploy"

### 2. Change Default Credentials (IMPORTANT!)

**⚠️ Security Warning:** The default credentials are `admin` / `password123`. 
You should change these to something secure!

To change:
1. Update the `AUTH_USERNAME` and `AUTH_PASSWORD` variables in Vercel (as described above)
2. Redeploy the application

### 3. Local Development

For local development, your `.env` file already has the credentials set:

```env
AUTH_USERNAME=admin
AUTH_PASSWORD=password123
```

Change these values to match what you set in Vercel.

## 📝 How It Works

- When users visit your app, they're redirected to `/login`
- After successful login, they can access all features
- Click "Logout" in the header to sign out
- The authentication token is stored locally and validated on each request

## 🚀 Testing

1. Visit: https://lineart-automation.vercel.app
2. You should be redirected to the login page
3. Enter your credentials
4. Start using the app!

---

**Note:** This is a simple authentication system suitable for basic access control. For production apps with multiple users, consider implementing a more robust authentication system (like NextAuth.js, Auth0, or similar).
