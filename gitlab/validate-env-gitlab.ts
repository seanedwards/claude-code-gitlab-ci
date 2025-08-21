/**
 * GitLab CI Adapter for Environment Variable Validation
 * 
 * This file adapts the GitHub Actions validate-env.ts for GitLab CI environments.
 * Uses GitLab CI environment variables instead of GitHub Actions INPUT_ variables.
 */

/**
 * Validates the environment variables required for running Claude Code in GitLab CI
 * based on the selected provider (Anthropic API, AWS Bedrock, or Google Vertex AI)
 */
export function validateEnvironmentVariablesGitLab() {
  // Read from GitLab CI variables (mapped in cli.ts)
  const useBedrock = process.env.CLAUDE_CODE_USE_BEDROCK === "1" || process.env.CLAUDE_USE_BEDROCK === "true";
  const useVertex = process.env.CLAUDE_CODE_USE_VERTEX === "1" || process.env.CLAUDE_USE_VERTEX === "true";
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const claudeCodeOAuthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;

  const errors: string[] = [];

  if (useBedrock && useVertex) {
    errors.push(
      "Cannot use both Bedrock and Vertex AI simultaneously. Please set only one provider (CLAUDE_USE_BEDROCK or CLAUDE_USE_VERTEX).",
    );
  }

  if (!useBedrock && !useVertex) {
    if (!anthropicApiKey && !claudeCodeOAuthToken) {
      errors.push(
        "Either ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN is required when using direct Anthropic API.",
      );
    }
  } else if (useBedrock) {
    const requiredBedrockVars = {
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };

    Object.entries(requiredBedrockVars).forEach(([key, value]) => {
      if (!value) {
        errors.push(`${key} is required when using AWS Bedrock (CLAUDE_USE_BEDROCK=true).`);
      }
    });

    // Check for OIDC token in GitLab CI (alternative to static credentials)
    const oidcToken = process.env.CI_JOB_JWT_V2 || process.env.CI_JOB_JWT;
    if (!process.env.AWS_ACCESS_KEY_ID && oidcToken) {
      console.log("Using GitLab OIDC token for AWS authentication");
      // In a real implementation, you would configure AWS STS assume role with OIDC
      // For now, just log that OIDC is available
    }
  } else if (useVertex) {
    const requiredVertexVars = {
      ANTHROPIC_VERTEX_PROJECT_ID: process.env.ANTHROPIC_VERTEX_PROJECT_ID,
      CLOUD_ML_REGION: process.env.CLOUD_ML_REGION,
    };

    Object.entries(requiredVertexVars).forEach(([key, value]) => {
      if (!value) {
        errors.push(`${key} is required when using Google Vertex AI (CLAUDE_USE_VERTEX=true).`);
      }
    });

    // Check for OIDC token in GitLab CI (alternative to service account key)
    const oidcToken = process.env.CI_JOB_JWT_V2 || process.env.CI_JOB_JWT;
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && oidcToken) {
      console.log("Using GitLab OIDC token for GCP authentication");
      // In a real implementation, you would configure GCP Workload Identity with OIDC
      // For now, just log that OIDC is available
    }
  }

  // GitLab CI specific validation
  if (process.env.GITLAB_CI_MODE) {
    // Validate that we're running in a proper GitLab CI environment
    if (!process.env.CI_PROJECT_DIR) {
      errors.push("CI_PROJECT_DIR is required in GitLab CI environment.");
    }
    
    console.log("Running in GitLab CI mode");
    console.log(`Project: ${process.env.CI_PROJECT_PATH}`);
    console.log(`Pipeline: ${process.env.CI_PIPELINE_ID}`);
    console.log(`Job: ${process.env.CI_JOB_NAME}`);
  }

  if (errors.length > 0) {
    const errorMessage = `GitLab CI environment variable validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`;
    throw new Error(errorMessage);
  }
}