# GitHub Pages Deployment Guide

## Prerequisites

1. ✅ GitHub account
2. ✅ Supabase project with credentials
3. ✅ Code ready to deploy

## Step-by-Step Deployment

### 1. Create GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Assessment & Marking System with role-based auth"

# Create repository on GitHub.com
# Then connect it:
git remote add origin https://github.com/Jackw9829/Assessment-Marking-System-A3.git
git branch -M main
git push -u origin main
```

### 2. Configure GitHub Repository Settings

**Enable GitHub Pages:**
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**

### 3. Add Supabase Secrets

**Add environment variables as secrets:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

   **Secret 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://your-project-id.supabase.co`

   **Secret 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `your-anon-key-here`

### 4. Update Supabase Configuration

**Add your GitHub Pages URL to Supabase:**
1. Go to Supabase Dashboard
2. **Authentication** → **URL Configuration**
3. Add to **Site URL**:
   ```
   https://Jackw9829.github.io/Assessment-Marking-System-A3
   ```
4. Add to **Redirect URLs**:
   ```
   https://Jackw9829.github.io/Assessment-Marking-System-A3/**
   http://localhost:5173/**
   ```

### 5. Deploy

**Push to main branch to trigger deployment:**
```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

**Check deployment progress:**
1. Go to **Actions** tab in your repository
2. Watch the "Deploy to GitHub Pages" workflow
3. Wait for green checkmark ✅

**Access your site:**
```
https://Jackw9829.github.io/Assessment-Marking-System-A3/
```

## Testing After Deployment

### 1. Create Test Accounts

**Admin Account:**
```
1. Sign up at your GitHub Pages URL
2. Go to Supabase Dashboard → Table Editor → profiles
3. Find your user and change role to 'admin'
```

**Instructor Account:**
```
1. Sign up with role: instructor
```

**Student Account:**
```
1. Sign up with role: student (default)
```

### 2. Test Role-Based Features

**As Admin:**
- ✅ Create courses
- ✅ Assign instructors to courses
- ✅ Enroll students
- ✅ View all data

**As Instructor:**
- ✅ View assigned courses
- ✅ Upload materials
- ✅ See enrolled students

**As Student:**
- ✅ View enrolled courses
- ✅ Download materials
- ❌ Cannot see admin/instructor features

## Local Development

**Run locally:**
```bash
npm run dev
```

**Build locally:**
```bash
npm run build
npm run preview
```

## Troubleshooting

### Issue: Blank page after deployment
**Solution:** Check browser console for errors. Verify:
- Supabase secrets are set correctly
- Base URL in vite.config.ts matches your repo name

### Issue: Auth not working
**Solution:** Verify in Supabase:
- Site URL is correct
- Redirect URLs include your GitHub Pages domain
- Email confirmation is disabled (or configured)

### Issue: 404 on refresh
**Solution:** This is expected with client-side routing on GitHub Pages. Users should:
- Use in-app navigation
- Or bookmark the main URL

### Issue: Environment variables not working
**Solution:**
- Ensure secrets are named exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Re-run the GitHub Action after adding secrets

## Update Deployment

**To deploy changes:**
```bash
git add .
git commit -m "Your changes description"
git push origin main
```

The site will automatically rebuild and redeploy (takes ~2-3 minutes).

## Custom Domain (Optional)

1. Go to **Settings** → **Pages**
2. Add custom domain
3. Update Supabase URL configuration
4. Update DNS records

## Security Notes

🔒 **Never commit `.env` file** - It's in `.gitignore`
🔒 **Use GitHub Secrets** for sensitive data
🔒 **Supabase RLS** protects your database
🔒 **Storage policies** protect file access

## Useful Commands

```bash
# Check git status
git status

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Force push (use carefully)
git push origin main --force
```

## Links

- **Live Site:** `https://Jackw9829.github.io/Assessment-Marking-System-A3/`
- **Repository:** `https://github.com/Jackw9829/Assessment-Marking-System-A3`
- **Actions:** `https://github.com/Jackw9829/Assessment-Marking-System-A3/actions`
- **Supabase:** `https://app.supabase.com/project/YOUR_PROJECT_ID`

---

Your app is now live and ready to test! 🚀
