# SonarQube GitHub Actions Integration Setup Guide

## 🚀 Quick Start

This workflow integrates SonarQube scanning into your Pull Request process with automatic code quality checks and reporting.

## 📋 Prerequisites

### 1. SonarQube Server Setup

You need either:
- **SonarCloud** (cloud-hosted): https://sonarcloud.io
- **Self-hosted SonarQube**: Your own SonarQube server instance

### 2. Required GitHub Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SONAR_TOKEN` | SonarQube authentication token | `sqp_1234567890abcdef...` |
| `SONAR_HOST_URL` | SonarQube server URL | `https://sonarcloud.io` or `https://sonar.yourcompany.com` |

#### How to get SONAR_TOKEN:

**For SonarCloud:**
1. Go to https://sonarcloud.io
2. Login and go to Account → Security
3. Generate a new token
4. Copy the token

**For Self-hosted SonarQube:**
1. Login to your SonarQube instance
2. Go to My Account → Security → Generate Tokens
3. Create a new token
4. Copy the token

## 🎯 Features

### ✅ What This Workflow Does

1. **Automatic PR Scanning**
   - Triggers on every PR to main/develop/master branches
   - Performs full code quality analysis
   - Runs with zero manual intervention

2. **Quality Gate Enforcement**
   - Blocks PR merging if quality gate fails
   - Configurable quality criteria in SonarQube
   - Real-time feedback on code quality

3. **Comprehensive Reporting**
   - Posts summary comment on PR
   - Creates GitHub Check with status
   - Tracks: bugs, vulnerabilities, code smells, coverage, duplications
   - Provides direct links to detailed SonarQube dashboard

4. **Smart Comment Management**
   - Updates existing comments instead of creating new ones
   - Keeps PR conversation clean
   - Includes collapsible raw data section

5. **Artifact Storage**
   - Stores scan results for 30 days
   - Available for download and historical analysis

## 🔧 Configuration

### Customizing the Workflow

Edit `.github/workflows/sonarqube-pr-scan.yml` to customize:

#### Branches to Scan
```yaml
on:
  pull_request:
    branches:
      - main          # Add or remove branches
      - develop
      - feature/*     # Supports wildcards
```

#### Source Directories
```yaml
-Dsonar.sources=src              # Your source code directory
-Dsonar.tests=src                # Your test directory
```

#### File Exclusions
```yaml
-Dsonar.exclusions=**/*.test.ts,**/*.test.tsx,**/node_modules/**,**/dist/**
```

#### Coverage Reports
```yaml
-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
```

### Project-Specific Settings

Create a `sonar-project.properties` file in your repository root for persistent configuration:

```properties
# Project identification
sonar.projectKey=my-project-key
sonar.projectName=My Project Name
sonar.projectVersion=1.0

# Source code
sonar.sources=src
sonar.tests=src
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**

# Test coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=test-results/sonar-report.xml

# Language settings
sonar.typescript.tsconfigPath=tsconfig.json

# Code duplication
sonar.cpd.exclusions=**/*.test.ts,**/*.test.tsx
```

## 📊 Quality Gate Configuration

### Default Quality Gate Conditions

Configure in SonarQube UI (Quality Gates section):

- **Coverage**: > 80%
- **Duplicated Lines**: < 3%
- **Maintainability Rating**: A
- **Reliability Rating**: A
- **Security Rating**: A
- **Security Hotspots**: All reviewed

### Creating Custom Quality Gates

1. Login to SonarQube
2. Go to Quality Gates
3. Create new gate or copy default
4. Add/modify conditions
5. Assign to your project

## 🧪 Testing the Integration

### First-Time Setup Test

1. Create a test branch:
   ```bash
   git checkout -b test/sonarqube-integration
   ```

2. Make a small change and push:
   ```bash
   git add .
   git commit -m "test: SonarQube integration"
   git push origin test/sonarqube-integration
   ```

3. Create a Pull Request

4. Watch the Actions tab for workflow execution

5. Check the PR for the SonarQube comment

### Expected Output

On successful setup, you should see:
- ✅ GitHub Action runs successfully
- 💬 Comment posted on PR with metrics
- ✅ Check created with Quality Gate status
- 📊 Metrics visible in SonarQube dashboard

## 🐛 Troubleshooting

### Common Issues

#### 1. "Shallow clone detected"
**Solution**: The workflow already uses `fetch-depth: 0`. If error persists, check your Git configuration.

#### 2. "Could not find a quality gate status"
**Solution**: 
- Ensure Quality Gate is configured in SonarQube
- Check if project exists in SonarQube
- Verify SONAR_TOKEN has correct permissions

#### 3. "Coverage report not found"
**Solution**: 
- Ensure tests generate coverage: `npm run test -- --coverage`
- Verify `lcov.info` path matches workflow configuration
- Check test script in `package.json`

#### 4. Authentication Errors
**Solution**:
- Verify SONAR_TOKEN is correctly set in GitHub Secrets
- Regenerate token if expired
- Check token permissions in SonarQube

#### 5. Quality Gate Always Fails
**Solution**:
- Review Quality Gate conditions in SonarQube
- Check if conditions are too strict for initial setup
- Gradually increase thresholds

## 🔒 Security Best Practices

1. **Never commit tokens**: Always use GitHub Secrets
2. **Rotate tokens regularly**: Update SONAR_TOKEN every 90 days
3. **Limit token scope**: Use project-specific tokens when possible
4. **Review permissions**: Ensure tokens have minimum required permissions
5. **Audit access**: Regularly review who has access to secrets

## 📚 Advanced Features

### Multi-Language Support

Add language-specific properties:

```yaml
-Dsonar.java.binaries=target/classes
-Dsonar.python.coverage.reportPaths=coverage.xml
```

### Branch Analysis

For long-lived branches:

```yaml
on:
  push:
    branches:
      - main
      - develop
```

### Custom Metrics

Add custom metrics in sonar-project.properties:

```properties
sonar.issue.ignore.multicriteria=e1,e2
sonar.issue.ignore.multicriteria.e1.ruleKey=typescript:S1135
sonar.issue.ignore.multicriteria.e1.resourceKey=**/*.test.ts
```

## 🔗 Useful Links

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [SonarQube GitHub Action](https://github.com/SonarSource/sonarqube-scan-action)

## 🆘 Support

If you encounter issues:

1. Check workflow logs in GitHub Actions tab
2. Review SonarQube project dashboard for errors
3. Verify all secrets are correctly configured
4. Consult SonarQube documentation
5. Check GitHub Action marketplace for updates

## 📝 Workflow Summary

```
PR Created/Updated
    ↓
Checkout Code + Setup Environment
    ↓
Install Dependencies
    ↓
Run Tests with Coverage
    ↓
SonarQube Scan (with PR decoration)
    ↓
Wait for Quality Gate Result
    ↓
Fetch Detailed Metrics from SonarQube API
    ↓
Generate Summary Report
    ↓
Post/Update PR Comment
    ↓
Create GitHub Check
    ↓
Pass/Fail based on Quality Gate
```

---

**Ready to use!** Just configure the secrets and create a PR to see it in action. 🚀
