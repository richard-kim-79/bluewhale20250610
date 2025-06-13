# GitHub Setup Instructions for BlueWhale CI/CD

This document provides instructions for completing the CI/CD setup for the BlueWhale project on GitHub.

## Current Status

The project has been pushed to GitHub on the `temp-no-workflows` branch without the GitHub Actions workflow files due to permission limitations. The main branch contains all files including the workflow configurations but couldn't be pushed due to token permission restrictions.

## Steps to Complete CI/CD Setup

### 1. Create a Personal Access Token (PAT) with Workflow Permissions

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set an appropriate name like "BlueWhale CI/CD Setup"
4. Set the expiration as needed
5. Select your repository
6. Under "Repository permissions", find "Actions" or "Workflows" and set it to "Read and write"
7. Generate the token and copy it

### 2. Push the Main Branch with Workflow Files

Once you have a token with the proper permissions, you can push the main branch:

```bash
# Switch back to the main branch
git checkout main

# Push to GitHub using your new token
# You'll be prompted for your username and password (use the new PAT as the password)
git push -u origin main
```

### 3. Set Up GitHub Repository Settings

1. Go to your repository on GitHub
2. Navigate to Settings → Actions → General
3. Ensure "Allow all actions and reusable workflows" is selected
4. Under "Workflow permissions", select "Read and write permissions"
5. Save changes

### 4. Set Up Required Secrets

For the CI/CD workflows to function properly, add these secrets in GitHub → Settings → Secrets and variables → Actions:

- `MONGODB_URL`: Your MongoDB connection string for testing
- `CSRF_SECRET_KEY`: Secret key for CSRF protection
- `JWT_SECRET_KEY`: Secret key for JWT token generation

### 5. Verify Workflow Execution

After pushing the main branch and setting up the secrets:

1. Go to the "Actions" tab in your GitHub repository
2. You should see the workflows listed (backend-tests, frontend-tests, full-stack-tests)
3. The workflows will run automatically on the next push to the main branch

## Troubleshooting

If you encounter issues with the workflows:

1. Check the workflow logs in the GitHub Actions tab
2. Verify that all required secrets are properly set up
3. Ensure the workflow files match the expected structure in your local repository
4. Refer to the CI_CD_README.md file for additional troubleshooting steps

## Note About Large Files

GitHub has flagged some large files in your repository:

```
File frontend/node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node is 90.85 MB
```

Consider adding these files to `.gitignore` or using Git LFS for better repository management.
