# Breaking Changes in v2.0.0

This major version introduces several breaking changes:

## Template Synchronization System
- Added automated CI-driven template synchronization
- Repositories created from this template will now receive automatic updates
- New required files: `.template-marker` and `.template-version`

## Shared Utilities Architecture
- Introduced shared utilities in `shared/` directory
- Changed fetch utility API and configuration
- New dependency management system

## Configuration Changes
- New template sync configuration in `.github/template-sync-config.yml`
- Updated GitHub Actions workflows for template synchronization
- Changed package structure to support shared components

## Migration Guide

To migrate from v1.x to v2.0:

1. Add `.template-marker` file to your repository
2. Update your fetch utilities to use the new configurable fetch API
3. Review and update any custom GitHub Actions workflows
4. Ensure your repository is configured to receive template updates

For more details, see the documentation in the README.