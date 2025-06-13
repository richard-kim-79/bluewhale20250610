# BlueWhale CI/CD Pipeline

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the BlueWhale project.

## Overview

The BlueWhale project uses GitHub Actions for CI/CD. Three workflows have been configured:

1. **Backend Tests** - Runs tests for the backend Python code
2. **Frontend Tests** - Runs tests for the frontend React/TypeScript code
3. **Full Stack Tests** - Runs both backend and frontend tests together

## Workflow Details

### Backend Tests (`backend-tests.yml`)

This workflow is triggered when:
- Code is pushed to the `main` or `master` branch that affects files in the `backend/` directory
- A pull request is opened against `main` or `master` that affects files in the `backend/` directory
- The workflow is manually triggered

The workflow:
- Sets up a MongoDB service container for testing
- Installs Python and required dependencies
- Sets up environment variables for testing
- Runs all backend tests
- Specifically runs the MFA tests to ensure they pass
- Generates and uploads a code coverage report to Codecov

### Frontend Tests (`frontend-tests.yml`)

This workflow is triggered when:
- Code is pushed to the `main` or `master` branch that affects files in the `frontend/` directory
- A pull request is opened against `main` or `master` that affects files in the `frontend/` directory
- The workflow is manually triggered

The workflow:
- Sets up Node.js
- Installs frontend dependencies
- Runs linting checks
- Runs frontend tests with coverage
- Uploads the coverage report

### Full Stack Tests (`full-stack-tests.yml`)

This workflow is triggered when:
- Code is pushed to the `main` or `master` branch
- A pull request is opened against `main` or `master`
- Weekly on Sundays at midnight
- The workflow is manually triggered

The workflow runs both backend and frontend tests in parallel jobs.

## How to Use

### Viewing Test Results

1. Go to the "Actions" tab in your GitHub repository
2. Select the workflow you want to view
3. Click on a specific workflow run to see details
4. View the logs for each step to see test results

### Manually Triggering Workflows

1. Go to the "Actions" tab in your GitHub repository
2. Select the workflow you want to run
3. Click the "Run workflow" button
4. Select the branch to run the workflow on
5. Click "Run workflow"

### Adding New Tests

When adding new tests:
- Backend tests should be added to the appropriate test files in the `backend/tests/` directory
- Frontend tests should be added to the appropriate test files in the `frontend/tests/` directory
- The CI/CD pipeline will automatically run new tests when they are pushed to the repository

## Code Coverage

Code coverage reports are uploaded to Codecov. To view the reports:
1. Go to [Codecov](https://codecov.io)
2. Find your repository
3. View the coverage reports for each component

## Troubleshooting

### Test Failures

If tests fail in CI but pass locally:
1. Check environment variables - ensure all required environment variables are set in the workflow file
2. Check dependencies - ensure all dependencies are correctly specified
3. Check for platform-specific code - ensure code works on both your local machine and the CI environment (Ubuntu)

### GitHub Actions Workflow Issues

If you encounter issues with GitHub Actions workflows:

1. **Action Version Compatibility**: Ensure the GitHub Actions versions specified in workflow files are compatible with GitHub's current environment. If you see errors about actions not being found, update the action versions.

   > **Note**: You may see IDE warnings about GitHub Actions versions like "Unable to resolve action `actions/checkout@v4`". These warnings are specific to the IDE's validation and do not affect the actual GitHub Actions execution. The versions used in our workflows (v4 for checkout, setup-python, setup-node, and codecov-action) are the latest stable versions as of June 2025 and should work correctly in the GitHub environment.

2. **Workflow Syntax**: Validate your workflow YAML syntax using the GitHub Actions workflow validator.

3. **Service Container Issues**: If MongoDB or other service containers fail to start, check their configuration and health check settings.

4. **Permissions**: Ensure the GitHub Actions workflows have appropriate permissions to access your repository and upload coverage reports.

5. **Timeouts**: Long-running tests might exceed GitHub Actions' default timeout limits. Consider splitting tests or adjusting timeout settings.

6. **Caching**: Use GitHub Actions' caching features to speed up dependency installation and build processes.

## MFA Tests

The MFA tests have been specifically configured to run reliably in the CI environment. These tests are a critical part of our security testing strategy.

### Backend MFA Tests

The backend MFA tests (`test_mfa.py`) are designed to be stable and reliable in CI environments:

- **Mock Client Approach**: Tests use a `MockClient` instead of real backend modules
- **Mocked Responses**: All API responses are mocked to simulate various MFA scenarios
- **No External Dependencies**: Tests are isolated from external services and databases
- **Comprehensive Coverage**: Tests cover MFA setup, verification, backup codes, enabling/disabling MFA, and login flows
- **Consistent Results**: Tests should pass consistently in any environment

### Frontend MFA Tests

Frontend MFA tests verify the user interface components related to MFA:

- **Component Tests**: Test MFA setup, verification, and backup code components
- **Page Tests**: Test MFA integration in login and settings pages
- **Mock API Calls**: All API calls are mocked to simulate backend responses

### Running MFA Tests Locally

To run the backend MFA tests locally:

```bash
cd backend
python -m pytest tests/test_mfa.py -v
```

To run the frontend MFA tests locally:

```bash
cd frontend
npm test -- -t "MFA"
```
