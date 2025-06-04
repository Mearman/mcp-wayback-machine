# Release Process

This project uses automated releases via GitHub Actions with build attestation and SBOM generation.

## Prerequisites

1. **NPM Account**: You need to have publishing rights to the NPM package
2. **GitHub Secrets**: Configure the following secrets in your repository:
   - `NPM_TOKEN`: Your NPM automation token (create at npmjs.com → Access Tokens)

## Release Workflow

### 1. Prepare Release

```bash
# Make sure you're on main branch with latest changes
git checkout main
git pull origin main

# Run tests to ensure everything works
yarn test
yarn build

# Create a release using standard-version
yarn release       # Auto-detect version bump from commits
# OR
yarn release:patch # Force patch release (0.0.x)
yarn release:minor # Force minor release (0.x.0)  
yarn release:major # Force major release (x.0.0)
```

This will:
- Bump version in package.json
- Update CHANGELOG.md
- Create a git commit
- Create a git tag

### 2. Push Release

```bash
# Push the commit and tag
git push origin main
git push origin --tags
```

### 3. Automated Publishing

Once you push the tag, GitHub Actions will automatically:

1. **Build** the project
2. **Run** all tests across Node.js versions 18, 20, and 22
3. **Generate SBOM** (Software Bill of Materials) using SPDX format
4. **Attest** the build provenance and SBOM
5. **Create** a GitHub Release with:
   - Auto-generated release notes
   - Changelog excerpt for this version
   - SBOM file attachment
   - Build attestation metadata
6. **Publish** to:
   - NPM registry (as `mcp-wayback-machine`)
   - GitHub Package Registry (as `@yourusername/mcp-wayback-machine`)

### 4. Verify Release

After the workflow completes:

1. Check the [GitHub Releases](https://github.com/yourusername/mcp-wayback-machine/releases) page
2. Verify the package on [NPM](https://www.npmjs.com/package/mcp-wayback-machine)
3. Verify the package on GitHub Packages

## Attestation Verification

Users can verify the build attestation:

```bash
# Download the package
npm pack mcp-wayback-machine

# Verify attestation
gh attestation verify mcp-wayback-machine-*.tgz --owner yourusername
```

## Manual Release (Emergency)

If automated release fails, you can publish manually:

```bash
# Build the project
yarn build

# Publish to NPM
npm publish --access public

# Create GitHub release manually through the UI
```

## Troubleshooting

### NPM Token Issues
- Ensure your NPM token has publish permissions
- Token should be an automation token, not a publish token
- Check token hasn't expired

### GitHub Actions Failures
- Check the [Actions tab](https://github.com/yourusername/mcp-wayback-machine/actions) for logs
- Ensure all secrets are properly configured
- Verify Node.js version compatibility

### Version Conflicts
- If version already exists on NPM, bump version again
- Use `npm view mcp-wayback-machine versions` to check existing versions