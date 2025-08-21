# GitLab CI Integration for Claude Code

This directory contains GitLab CI adaptations of the Claude Code GitHub Action, allowing you to run Claude Code in GitLab CI/CD pipelines.

## Quick Start

1. **Add the template to your project**: Copy `.gitlab-ci.yml` to your repository root or include it in your existing GitLab CI configuration.

2. **Set up authentication**: Configure one of the supported authentication methods:
   - **Anthropic API**: Set `ANTHROPIC_API_KEY` in GitLab CI/CD variables
   - **AWS Bedrock**: Configure AWS credentials or OIDC authentication
   - **Google Vertex AI**: Configure GCP service account or OIDC authentication

3. **Use the template**: Extend the `.claude_code_template` in your jobs:

```yaml
my_claude_job:
  extends: .claude_code_template
  variables:
    CLAUDE_PROMPT: "Review this code and suggest improvements"
    CLAUDE_ALLOWED_TOOLS: "Read,Grep,Bash"
```

## Architecture

### Files

- **`cli.ts`**: Main CLI entry point that replaces `@actions/core` functionality
- **`run-claude-gitlab.ts`**: GitLab CI adapter for Claude execution (replaces GitHub Actions paths)
- **`validate-env-gitlab.ts`**: GitLab CI environment variable validation
- **`.gitlab-ci.yml`**: Template configuration for GitLab CI

### Key Differences from GitHub Actions

| Aspect | GitHub Actions | GitLab CI |
|--------|----------------|-----------|
| **Environment Variables** | `INPUT_*` prefix | `CLAUDE_*` prefix |
| **Temp Directory** | `$RUNNER_TEMP` | `$CI_PROJECT_DIR/.tmp` |
| **Output Mechanism** | `@actions/core.setOutput()` | Console output + artifacts |
| **Authentication** | Built-in OIDC | GitLab OIDC via `CI_JOB_JWT_V2` |

## Configuration

### Environment Variables

All configuration is done through GitLab CI/CD variables:

#### Core Settings
- `CLAUDE_PROMPT`: The prompt to send to Claude
- `CLAUDE_PROMPT_FILE`: Path to file containing the prompt
- `CLAUDE_ALLOWED_TOOLS`: Comma-separated list of allowed tools
- `CLAUDE_DISALLOWED_TOOLS`: Comma-separated list of disallowed tools
- `CLAUDE_MAX_TURNS`: Maximum conversation turns
- `CLAUDE_TIMEOUT_MINUTES`: Execution timeout (default: 10)

#### Authentication
- `ANTHROPIC_API_KEY`: Direct Anthropic API access
- `CLAUDE_CODE_OAUTH_TOKEN`: Alternative to API key
- `CLAUDE_USE_BEDROCK`: Set to "true" for AWS Bedrock
- `CLAUDE_USE_VERTEX`: Set to "true" for Google Vertex AI

#### Advanced Settings
- `CLAUDE_MODEL`: Model to use
- `CLAUDE_FALLBACK_MODEL`: Fallback model if primary unavailable
- `CLAUDE_MCP_CONFIG`: MCP configuration JSON
- `CLAUDE_SETTINGS`: Claude Code settings JSON
- `CLAUDE_SYSTEM_PROMPT`: Override system prompt
- `CLAUDE_APPEND_SYSTEM_PROMPT`: Append to system prompt
- `CLAUDE_ENV`: Custom environment variables (YAML format)

### Provider-Specific Configuration

#### AWS Bedrock
```yaml
variables:
  CLAUDE_USE_BEDROCK: "true"
  AWS_REGION: us-west-2
  # Either use static credentials:
  AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY
  # Or configure OIDC authentication (recommended)
```

#### Google Vertex AI  
```yaml
variables:
  CLAUDE_USE_VERTEX: "true"
  ANTHROPIC_VERTEX_PROJECT_ID: your-gcp-project
  CLOUD_ML_REGION: us-central1
  # Either use service account key:
  GOOGLE_APPLICATION_CREDENTIALS: /path/to/service-account.json
  # Or configure OIDC authentication (recommended)
```

## Examples

### Basic Code Review
```yaml
code_review:
  extends: .claude_code_template
  variables:
    CLAUDE_PROMPT: "Please review the recent changes and provide feedback"
    CLAUDE_ALLOWED_TOOLS: "Read,Grep"
  only:
    - merge_requests
```

### Documentation Generation
```yaml
generate_docs:
  extends: .claude_code_template
  variables:
    CLAUDE_PROMPT_FILE: ".claude/generate-docs-prompt.md"
    CLAUDE_ALLOWED_TOOLS: "Read,Write,Edit"
  only:
    - main
  artifacts:
    paths:
      - docs/
```

### Custom Environment Variables
```yaml
custom_analysis:
  extends: .claude_code_template
  variables:
    CLAUDE_PROMPT: "Analyze the codebase using the provided configuration"
    CLAUDE_ENV: |
      DEBUG: true
      ANALYSIS_DEPTH: detailed
      OUTPUT_FORMAT: json
```

## Outputs

The GitLab CI integration produces:

1. **Console Output**: Real-time execution logs
2. **Artifacts**: 
   - `claude-execution-output.json`: Detailed execution log
3. **Job Variables**: 
   - `conclusion`: "success" or "failure"
   - `execution_file`: Path to execution log

## Migration from GitHub Actions

To migrate from the GitHub Actions version:

1. **Variables**: Replace `INPUT_*` environment variables with `CLAUDE_*` equivalents
2. **Workflow**: Convert GitHub Actions `uses:` statements to GitLab `extends:` 
3. **Authentication**: Adapt OIDC configuration for GitLab's JWT format
4. **Outputs**: Replace `steps.*.outputs.*` with artifact access

Example migration:

**GitHub Actions:**
```yaml
- uses: anthropics/claude-code-action@v1
  with:
    prompt: "Review this code"
    allowed_tools: "Read,Grep"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**GitLab CI:**
```yaml
extends: .claude_code_template
variables:
  CLAUDE_PROMPT: "Review this code"  
  CLAUDE_ALLOWED_TOOLS: "Read,Grep"
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the GitLab runner has access to required tools (`jq`, `mkfifo`)
2. **Timeout**: Increase `CLAUDE_TIMEOUT_MINUTES` for complex tasks
3. **Authentication**: Verify API keys or OIDC configuration in GitLab CI/CD variables
4. **Artifacts**: Check that `claude-execution-output.json` is properly generated and accessible

### Debug Mode

Enable debug logging by setting:
```yaml
variables:
  CLAUDE_ENV: |
    DEBUG: true
```