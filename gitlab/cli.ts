#!/usr/bin/env bun

/**
 * GitLab CI CLI Adapter for Claude Code
 * 
 * This CLI tool adapts the GitHub Actions TypeScript code for use in GitLab CI.
 * It replaces @actions/core functionality with GitLab CI environment variables
 * and output mechanisms.
 */

import { preparePrompt } from "../src/prepare-prompt";
import { runClaudeGitLab } from "./run-claude-gitlab";
import { setupClaudeCodeSettings } from "../src/setup-claude-code-settings";
import { validateEnvironmentVariablesGitLab } from "./validate-env-gitlab";

// CLI argument parsing
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  
  // Parse command line arguments in --key=value or --key value format
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      
      if (valueParts.length > 0) {
        // --key=value format
        args[key] = valueParts.join('=');
      } else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
        // --key value format
        args[key] = process.argv[i + 1];
        i++; // Skip the next argument as it's the value
      } else {
        // Boolean flag
        args[key] = 'true';
      }
    }
  }
  
  return args;
}

// Map GitLab CI environment variables to our expected format
function mapGitLabEnvironment(): Record<string, string> {
  const env: Record<string, string> = {};
  
  // Map GitLab CI variables to expected format
  env.CLAUDE_PROMPT = process.env.CLAUDE_PROMPT || "";
  env.CLAUDE_PROMPT_FILE = process.env.CLAUDE_PROMPT_FILE || "";
  env.CLAUDE_ALLOWED_TOOLS = process.env.CLAUDE_ALLOWED_TOOLS || "";
  env.CLAUDE_DISALLOWED_TOOLS = process.env.CLAUDE_DISALLOWED_TOOLS || "";
  env.CLAUDE_MAX_TURNS = process.env.CLAUDE_MAX_TURNS || "";
  env.CLAUDE_MCP_CONFIG = process.env.CLAUDE_MCP_CONFIG || "";
  env.CLAUDE_SETTINGS = process.env.CLAUDE_SETTINGS || "";
  env.CLAUDE_SYSTEM_PROMPT = process.env.CLAUDE_SYSTEM_PROMPT || "";
  env.CLAUDE_APPEND_SYSTEM_PROMPT = process.env.CLAUDE_APPEND_SYSTEM_PROMPT || "";
  env.CLAUDE_TIMEOUT_MINUTES = process.env.CLAUDE_TIMEOUT_MINUTES || "10";
  env.CLAUDE_ENV = process.env.CLAUDE_ENV || "";
  env.CLAUDE_FALLBACK_MODEL = process.env.CLAUDE_FALLBACK_MODEL || "";
  env.CLAUDE_EXPERIMENTAL_SLASH_COMMANDS_DIR = process.env.CLAUDE_EXPERIMENTAL_SLASH_COMMANDS_DIR || "";
  
  // Model configuration
  env.ANTHROPIC_MODEL = process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || "";
  
  // Authentication
  env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
  env.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN || "";
  env.ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "";
  
  // Provider flags
  if (process.env.CLAUDE_USE_BEDROCK === 'true') {
    env.CLAUDE_CODE_USE_BEDROCK = '1';
  }
  if (process.env.CLAUDE_USE_VERTEX === 'true') {
    env.CLAUDE_CODE_USE_VERTEX = '1';
  }
  
  // AWS configuration
  env.AWS_REGION = process.env.AWS_REGION || "";
  env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
  env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
  env.AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || "";
  env.ANTHROPIC_BEDROCK_BASE_URL = process.env.ANTHROPIC_BEDROCK_BASE_URL || 
    (process.env.AWS_REGION ? `https://bedrock-runtime.${process.env.AWS_REGION}.amazonaws.com` : "");
  
  // GCP configuration
  env.ANTHROPIC_VERTEX_PROJECT_ID = process.env.ANTHROPIC_VERTEX_PROJECT_ID || "";
  env.CLOUD_ML_REGION = process.env.CLOUD_ML_REGION || "";
  env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  env.ANTHROPIC_VERTEX_BASE_URL = process.env.ANTHROPIC_VERTEX_BASE_URL || "";
  
  // Set GitLab CI temp directory (equivalent to RUNNER_TEMP)
  env.RUNNER_TEMP = process.env.RUNNER_TEMP || `${process.env.CI_PROJECT_DIR}/.tmp`;
  
  return env;
}

// GitLab CI output functions (replace @actions/core functionality)
class GitLabOutput {
  static setOutput(name: string, value: string) {
    // In GitLab CI, we can write to job artifacts or use echo for logging
    console.log(`::set-output name=${name}::${value}`);
    
    // Also write to environment file for potential use by subsequent jobs
    const envFile = process.env.GITLAB_ENV || '/dev/null';
    try {
      require('fs').appendFileSync(envFile, `${name}=${value}\n`);
    } catch (e) {
      // Ignore if we can't write to env file
    }
  }
  
  static setFailed(message: string) {
    console.error(`Error: ${message}`);
    process.exit(1);
  }
  
  static warning(message: string) {
    console.warn(`Warning: ${message}`);
  }
  
  static info(message: string) {
    console.log(message);
  }
}

async function main() {
  try {
    console.log("Starting Claude Code GitLab CI execution...");
    
    // Parse CLI arguments (for future extensibility)
    const cliArgs = parseArgs();
    
    // Map GitLab environment variables
    const gitlabEnv = mapGitLabEnvironment();
    
    // Set environment variables for compatibility with existing code
    Object.entries(gitlabEnv).forEach(([key, value]) => {
      if (value) {
        process.env[`INPUT_${key.replace('CLAUDE_', '')}`] = value;
      }
    });
    
    // Ensure temp directory exists
    const tempDir = process.env.RUNNER_TEMP;
    if (tempDir) {
      require('fs').mkdirSync(tempDir, { recursive: true });
    }
    
    // Validate environment variables
    validateEnvironmentVariablesGitLab();
    
    // Setup Claude Code settings
    await setupClaudeCodeSettings(
      process.env.INPUT_SETTINGS,
      undefined, // homeDir
      process.env.INPUT_EXPERIMENTAL_SLASH_COMMANDS_DIR,
    );
    
    // Prepare prompt
    const promptConfig = await preparePrompt({
      prompt: process.env.INPUT_PROMPT || "",
      promptFile: process.env.INPUT_PROMPT_FILE || "",
    });
    
    // Run Claude with GitLab CI adaptations
    await runClaudeGitLab(promptConfig.path, {
      allowedTools: process.env.INPUT_ALLOWED_TOOLS,
      disallowedTools: process.env.INPUT_DISALLOWED_TOOLS,
      maxTurns: process.env.INPUT_MAX_TURNS,
      mcpConfig: process.env.INPUT_MCP_CONFIG,
      systemPrompt: process.env.INPUT_SYSTEM_PROMPT,
      appendSystemPrompt: process.env.INPUT_APPEND_SYSTEM_PROMPT,
      claudeEnv: process.env.INPUT_CLAUDE_ENV,
      fallbackModel: process.env.INPUT_FALLBACK_MODEL,
      model: process.env.ANTHROPIC_MODEL,
      timeoutMinutes: process.env.INPUT_TIMEOUT_MINUTES,
    });
    
    console.log("Claude Code execution completed successfully");
    
  } catch (error) {
    GitLabOutput.setFailed(`Claude Code execution failed: ${error}`);
    GitLabOutput.setOutput("conclusion", "failure");
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { GitLabOutput };