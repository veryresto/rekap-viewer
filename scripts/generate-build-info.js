const { execSync } = require('child_process');
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join, dirname } = require('path');

const projectRoot = join(__dirname, '..');

function generate(specifiedMode) {
  // Auto-detect environment: argument override -> NODE_ENV -> npm lifecycle event -> production
  const mode = specifiedMode || 
                process.env.NODE_ENV || 
                ((process.env.npm_lifecycle_event === 'dev' || process.env.npm_lifecycle_event === 'predev') ? 'development' : 'production');

  const pkgPath = join(projectRoot, 'package.json');
  let version = '0.0.0';
  let appName = 'Unknown App';

  // 1. Try to read version from environment variable (useful in Docker/CI context) or Git tags
  if (process.env.VITE_APP_VERSION) {
    version = process.env.VITE_APP_VERSION;
    if (version.startsWith('v')) {
      version = version.slice(1);
    }
  } else {
    try {
      const gitTag = execSync('git describe --tags --abbrev=0').toString().trim();
      version = gitTag.startsWith('v') ? gitTag.slice(1) : gitTag;
    } catch (err) {
      // Fallback to package.json version if git describe fails (e.g. no tags or no git)
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        version = pkg.version || '0.0.0';
      } catch (e) {
        // Ignored
      }
    }
  }

  // 2. Resolve appName from package.json or env override
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (process.env.VITE_APP_NAME) {
      appName = process.env.VITE_APP_NAME;
    } else if (pkg.name) {
      appName = pkg.name.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  } catch (err) {
    console.warn('[build-metadata] Could not read package.json info:', err.message);
  }

  let gitCommitSha = 'unknown';
  let gitBranch = 'unknown';

  // 3. Read Git credentials from environment
  if (process.env.VITE_GIT_SHA) {
    gitCommitSha = process.env.VITE_GIT_SHA;
  }
  if (process.env.GIT_BRANCH || process.env.VITE_GIT_BRANCH) {
    gitBranch = process.env.GIT_BRANCH || process.env.VITE_GIT_BRANCH;
  }

  // 4. Fallback to local git CLI execution if still unknown
  if (gitCommitSha === 'unknown' || gitBranch === 'unknown') {
    try {
      if (gitCommitSha === 'unknown') {
        gitCommitSha = execSync('git rev-parse HEAD').toString().trim();
      }
      if (gitBranch === 'unknown') {
        gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
      }
    } catch (err) {
      // Git metadata not available
    }
  }

  // Truncate to short commit SHA
  if (gitCommitSha && gitCommitSha !== 'unknown') {
    gitCommitSha = gitCommitSha.slice(0, 7);
  }

  const buildTimestamp = new Date().toISOString();

  const buildInfo = {
    appName,
    version,
    gitCommitSha,
    gitBranch,
    buildTimestamp,
    environment: mode
  };

  const outputPath = join(projectRoot, 'public', 'generated', 'build-info.json');
  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), 'utf-8');
    console.log(`[build-metadata] Generated build info at public/generated/build-info.json (Env: ${mode}, Version: ${version})`);
  } catch (err) {
    console.error('[build-metadata] Failed to write build-info.json:', err);
  }
}

// Run if called directly
if (require.main === module) {
  const mode = process.argv[2];
  generate(mode);
}

module.exports = { generate };
