# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it
responsibly:

1. **Do NOT open a public issue** for security vulnerabilities
2. Email the maintainer directly at <juandiegosierrafernandez@gmail.com>
3. Include a description of the vulnerability and steps to reproduce
4. Allow reasonable time for a fix before public disclosure

## Security Considerations

This action:

- Uses the GitHub token provided by the workflow (with limited permissions)
- Only reads public data from the GitHub API
- Does not store or transmit any user data externally
- Does not execute any code from the analyzed user

### Required Permissions

The action requires these permissions:

```yaml
permissions:
  contents: read
  pull-requests: write # Only if using comment/label actions
```

### Token Security

- Always use `${{ secrets.GITHUB_TOKEN }}` or `${{ github.token }}`
- Never use Personal Access Tokens with excessive permissions
- The default `GITHUB_TOKEN` is sufficient for all functionality

## Security Updates

Security updates will be released as patch versions and announced in the
releases section.
