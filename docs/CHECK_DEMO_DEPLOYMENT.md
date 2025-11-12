# Checking Demo Deployment Status

## Step 1: Verify Workflow Ran

1. Go to: https://github.com/marchalgreen/HerlevHjorten/actions
2. Look for "Deploy Demo to GitHub Pages" workflow
3. Check if it:
   - ✅ Completed successfully
   - ❌ Failed (check error messages)
   - ⏳ Is still running

## Step 2: Common Issues

### Issue: Workflow didn't trigger
**Solution**: The workflow only triggers when files in `packages/webapp/**` or `.github/workflows/deploy-demo.yml` change. Try:
- Making a small change to trigger it, OR
- Go to Actions → "Deploy Demo to GitHub Pages" → "Run workflow" → "Run workflow"

### Issue: "Repository not found" or Permission denied
**Solution**: The `GITHUB_TOKEN` may not have permission to write to external repositories. You need to:

1. Create a Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: "Demo Deploy Token"
   - Select scope: `repo` (full control of private repositories)
   - Generate token and **copy it** (you won't see it again!)

2. Add it as a secret:
   - Go to: https://github.com/marchalgreen/HerlevHjorten/settings/secrets/actions
   - Click "New repository secret"
   - Name: `DEMO_DEPLOY_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

3. Re-run the workflow:
   - Go to Actions → "Deploy Demo to GitHub Pages" → "Run workflow"

### Issue: RundeManagerDemo repository doesn't exist
**Solution**: Create it first:
1. Go to: https://github.com/new
2. Repository name: `RundeManagerDemo`
3. Make it **Public**
4. Don't initialize with any files
5. Create repository
6. Then re-run the workflow

## Step 3: Verify Deployment

After the workflow completes successfully:

1. Check the `RundeManagerDemo` repository:
   - Go to: https://github.com/marchalgreen/RundeManagerDemo
   - You should see files in the `gh-pages` branch (or `main` if configured)

2. Check GitHub Pages:
   - Go to: https://github.com/marchalgreen/RundeManagerDemo/settings/pages
   - Source should be set to `gh-pages` branch
   - Your site should be available at: https://marchalgreen.github.io/RundeManagerDemo/

## Step 4: Test the Demo

Once deployed, test at:
- https://marchalgreen.github.io/RundeManagerDemo/#/rundemanager/coach

