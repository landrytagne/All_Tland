# GitHub Actions Secrets Setup

Go to **Settings → Secrets and variables → Actions** in your GitHub repo.

## Frontend Deployment (Vercel)

### Get Vercel tokens
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Get your tokens
vercel link  # Link to your project, then check .vercel/project.json
cat .vercel/project.json  # Copy orgId and projectId
```

### Required secrets

| Secret | How to get it |
|--------|---------------|
| `VERCEL_ORG_ID` | From `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` → `projectId` |
| `VERCEL_TOKEN` | Run `vercel tokens create` → copy the token |
| `NEXT_PUBLIC_API_URL` | Your backend URL (e.g. `https://api.retrouvit.com`) |

## Backend Deployment

### Option A: SSH (VPS/Dedicated server)

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Server IP or hostname (e.g. `192.168.1.100`) |
| `DEPLOY_USER` | SSH username (e.g. `deploy`) |
| `DEPLOY_SSH_KEY` | Private SSH key (paste entire key including BEGIN/END) |
| `DEPLOY_PATH` | Path to project on server (e.g. `/opt/retrouvit`) |

### Option B: Docker Hub

| Secret | How to get it |
|--------|---------------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_TOKEN` | Docker Hub → Account Settings → Security → Access Tokens → Create |

## Quick Setup

```bash
# In your repo root
gh secret set VERCEL_ORG_ID --body "your-org-id"
gh secret set VERCEL_PROJECT_ID --body "your-project-id"
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set NEXT_PUBLIC_API_URL --body "https://api.retrouvit.com"

# For backend (choose one):
gh secret set DEPLOY_HOST --body "192.168.1.100"
gh secret set DEPLOY_USER --body "deploy"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_ed25519
```
