# Deploying Brandon DAM System to Vercel

This guide provides step-by-step instructions for deploying your Digital Asset Management system to Vercel.

## Prerequisites

Before deploying, ensure you have:
- A [Vercel account](https://vercel.com/signup)
- A [Supabase project](https://supabase.com) set up with storage buckets
- API keys for OpenAI, Google Gemini, and Pinecone
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Quick Start

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository
   - Vercel will automatically detect Next.js

2. **Configure Environment Variables**
   
   In the Vercel project settings, add these environment variables:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # AI Services
   OPENAI_API_KEY=sk-your_openai_key_here
   GEMINI_API_KEY=your_gemini_key_here

   # Vector Database
   PINECONE_API_KEY=your_pinecone_key_here
   PINECONE_INDEX_NAME=brandon-assets
   ```

   > **Where to find these values:**
   > - **Supabase**: Project Settings → API
   > - **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   > - **Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   > - **Pinecone**: [app.pinecone.io](https://app.pinecone.io) → API Keys

3. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - First deployment takes 2-5 minutes

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts to link/create project
# Add environment variables when prompted, or add them in the dashboard

# Deploy to production
vercel --prod
```

## Post-Deployment Configuration

### 1. Verify Supabase Storage Setup

Ensure your Supabase project has the correct storage buckets:

```sql
-- Run this in Supabase SQL Editor if not already done
-- (This should already be set up from supabase-schema.sql)

-- Verify bucket exists
SELECT * FROM storage.buckets WHERE name = 'assets';

-- Verify RLS policies
SELECT * FROM storage.policies WHERE bucket_id = 'assets';
```

### 2. Configure CORS for Supabase Storage

In your Supabase project:
1. Go to Storage → Configuration
2. Add your Vercel domain to allowed origins:
   ```
   https://your-project.vercel.app
   ```

### 3. Update Supabase Redirect URLs

In Supabase Dashboard:
1. Go to Authentication → URL Configuration
2. Add your Vercel URL to "Site URL" and "Redirect URLs":
   ```
   https://your-project.vercel.app
   ```

### 4. Verify Pinecone Index

Ensure your Pinecone index is created with the correct dimensions:
- **Index Name**: `brandon-assets` (or match your env var)
- **Dimensions**: 1536 (for OpenAI embeddings)
- **Metric**: cosine

## Testing Your Deployment

After deployment, verify these features work:

### ✅ Basic Functionality
- [ ] Homepage loads correctly
- [ ] Folder navigation works
- [ ] File upload works (try uploading an image)
- [ ] File viewing/playback works
- [ ] Search functionality works

### ✅ AI Features
- [ ] Semantic search returns relevant results
- [ ] AI-generated descriptions appear for new uploads
- [ ] Chat/Q&A features work (if implemented)

### ✅ Performance
- [ ] Images load from Supabase CDN
- [ ] API routes respond quickly
- [ ] File uploads complete successfully

## Troubleshooting

### Build Fails with "Module not found"

**Solution**: Ensure all dependencies are in `package.json`. Run locally:
```bash
npm install
npm run build
```

### Images Not Loading

**Solution**: Check [next.config.js](file:///Users/annaagliardi/Documents/Antigravity/Brandon/brandon/next.config.js) has correct Supabase domain:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
    },
  ],
}
```

### File Upload Fails with "Payload Too Large"

**Solution**: Already configured in [vercel.json](file:///Users/annaagliardi/Documents/Antigravity/Brandon/brandon/vercel.json) with increased memory and timeout.
If issues persist, check Supabase storage quotas in your Supabase project.

### Environment Variables Not Working

**Solution**: 
1. Ensure variables are added in Vercel Dashboard → Project → Settings → Environment Variables
2. Variables starting with `NEXT_PUBLIC_` are exposed to the browser
3. After adding/changing env vars, **redeploy** your project
4. Check the deployment logs for any missing variable warnings

### Supabase Connection Issues

**Solution**:
1. Verify Supabase URL and keys are correct
2. Check Supabase project status (not paused)
3. Verify Supabase RLS policies allow the operations
4. Check browser console for CORS errors

### AI Features Not Working

**Solution**:
- **OpenAI errors**: Verify API key and billing status
- **Gemini errors**: Ensure API key is valid and API is enabled
- **Pinecone errors**: Verify index exists and API key is correct

## Performance Optimization

### Enable Edge Runtime (Optional)

For faster response times, you can enable Edge runtime for certain API routes:

```typescript
// Add to app/api/your-route/route.ts
export const runtime = 'edge'
```

⚠️ Note: Not all features work with Edge runtime (e.g., some AI libraries).

### Configure Caching

Vercel automatically caches static assets. For API routes, configure caching headers:

```typescript
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  })
}
```

## Monitoring

### View Deployment Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on a deployment to view build and runtime logs
3. Check "Functions" tab for serverless function logs

### Set Up Alerts

In Vercel Dashboard → Project → Settings → Notifications:
- Enable deployment notifications
- Set up error alerts
- Configure performance budget alerts

## Updating Your Deployment

Vercel automatically deploys when you push to your connected Git branch:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically builds and deploys
```

### Manual Redeploy

In Vercel Dashboard:
1. Go to Deployments
2. Find the deployment you want to redeploy
3. Click "..." → "Redeploy"

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain
3. Configure DNS records as shown by Vercel
4. Update Supabase redirect URLs to include your custom domain

## Security Best Practices

- ✅ Never commit `.env` files
- ✅ Use environment variables for all secrets
- ✅ Regularly rotate API keys
- ✅ Monitor Vercel logs for suspicious activity
- ✅ Keep dependencies updated (`npm audit`)
- ✅ Review Supabase RLS policies regularly

## Next Steps

After successful deployment:

1. Share your live URL with users
2. Monitor performance and errors
3. Set up analytics (Vercel Analytics, Google Analytics, etc.)
4. Consider setting up a custom domain
5. Configure automated backups for Supabase data

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

---

**Need help?** Check the [README.md](file:///Users/annaagliardi/Documents/Antigravity/Brandon/brandon/README.md) for project-specific information or open an issue in your repository.
