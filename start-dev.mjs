const { spawn } = require('child_process');
const p = spawn('npx', ['next', 'dev', '--turbopack'], {
  cwd: 'C:/Users/jaisi/Documents/GDS Creatives/call-center',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '3001' }
});
p.stdout.on('data', (d) => { process.stdout.write(d); });
p.stderr.on('data', (d) => { process.stderr.write(d); });
p.on('error', (e) => { console.error('spawn error:', e); });
console.log('Dev server PID:', p.pid);