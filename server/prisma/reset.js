const { execSync } = require('child_process');
try {
  console.log('Resetting database...');
  const output = execSync('npx prisma migrate reset --force', {
    cwd: __dirname,
    encoding: 'utf-8',
    timeout: 60000,
  });
  console.log(output);
  console.log('Database reset successfully!');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
