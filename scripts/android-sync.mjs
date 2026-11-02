import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const npx = isWindows ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: isWindows,
  });
  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return result.status ?? 1;
}

process.env.CAPACITOR_BUILD = 'true';

if (run(npm, ['run', 'build']) !== 0) {
  process.exitCode = 1;
} else {
  if (!existsSync('android') && run(npx, ['cap', 'add', 'android']) !== 0) {
    process.exitCode = 1;
  } else if (run(npx, ['cap', 'sync', 'android']) !== 0) {
    process.exitCode = 1;
  }
}
