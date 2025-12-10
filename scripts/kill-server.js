#!/usr/bin/env node

/**
 * Kill any processes using port 3456
 * Run this if the server fails to start due to port conflicts
 */

const { execSync } = require('child_process');

const PORT = 3456;

try {
  console.log(`Looking for processes using port ${PORT}...`);

  // Find the PID using the port
  let output;
  try {
    output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf-8' });
  } catch (error) {
    // findstr returns non-zero exit code when no matches found
    console.log(`✓ No processes found using port ${PORT}`);
    process.exit(0);
  }

  if (!output || !output.trim()) {
    console.log(`✓ No processes found using port ${PORT}`);
    process.exit(0);
  }

  // Extract PIDs from netstat output
  const lines = output.trim().split('\n');
  const pids = new Set();

  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && !isNaN(pid)) {
      pids.add(pid);
    }
  });

  if (pids.size === 0) {
    console.log(`✓ No processes found using port ${PORT}`);
    process.exit(0);
  }

  console.log(`Found ${pids.size} process(es) to kill: ${Array.from(pids).join(', ')}`);

  // Kill each process
  pids.forEach(pid => {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      console.log(`✓ Killed process ${pid}`);
    } catch (error) {
      console.error(`✗ Failed to kill process ${pid}`);
    }
  });

  console.log(`\n✓ Port ${PORT} is now available`);
} catch (error) {
  if (error.message.includes('File Not Found')) {
    console.log(`✓ No processes found using port ${PORT}`);
  } else {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
