const { execSync } = require('child_process');
execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
