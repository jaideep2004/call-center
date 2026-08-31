import 'dotenv/config';
const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:30001';

async function signIn(email, password){
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Origin': BASE },
    body: JSON.stringify({email, password})
  });
  const body = await res.text();
  const setCookie = res.headers.get('set-cookie') || '';
  // extract better-auth.session_token cookie
  const m = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if(!m) throw new Error(`no cookie for ${email}: ${body.slice(0,500)}`);
  const cookie = `better-auth.session_token=${m[1]}`;
  const json = JSON.parse(body);
  return {cookie, user: json.user, token: json.token};
}

async function apiGet(path, cookie){
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
  const text = await res.text();
  let json = null;
  try{ json = JSON.parse(text); }catch{}
  return {status: res.status, json, text: text.slice(0,600)};
}

const cases = [
  {email:'jaisidhu2004@gmail.com', role:'super_admin', expect:{'/api/v1/calls?limit=1':200, '/api/v1/reports/summary':200, '/api/v1/campaigns?limit=1':200, '/api/v1/agents?limit=1':200, '/api/v1/publishers':200}},
  {email:'gdshosting@gmail.com', role:'agent', expect:{'/api/v1/calls?limit=1':200, '/api/v1/reports/summary':200, '/api/v1/campaigns?limit=1':200, '/api/v1/publishers':403}},
  {email:'manager.test@relayline.test', role:'manager', expect:{'/api/v1/calls?limit=1':200, '/api/v1/agents?limit=1':200, '/api/v1/publishers':200, '/api/v1/campaigns?limit=1':403}},
  {email:'finance.test@relayline.test', role:'finance', expect:{'/api/v1/calls?limit=1':200, '/api/v1/reports/summary':200, '/api/v1/agents?limit=1':403}},
  {email:'publisher.test@relayline.test', role:'publisher', expect:{'/api/v1/calls?limit=1':403, '/api/v1/publishers':200}},
];

let total=0, pass=0, fail=0;
async function main(){
for(const c of cases){
  console.log(`\n== ${c.role} (${c.email}) ==`);
  const {cookie, user} = await signIn(c.email, 'Test1234!');
  console.log(` signed in as ${user.role} id=${user.id.slice(0,8)} cookie=${cookie.slice(0,40)}...`);
  for(const [path, expected] of Object.entries(c.expect)){
    const r = await apiGet(path, cookie);
    const ok = r.status===expected;
    const symbol = ok ? '✓' : '✗';
    if(ok) pass++; else fail++;
    total++;
    console.log(` ${symbol} GET ${path} -> ${r.status} expected ${expected} ${!ok ? '| '+ (r.json?.message||r.text.slice(0,100)) : ''}`);
  }
  // extra: unauth check for this path should be 401
}
console.log(`\nSummary: ${pass}/${total} passed, ${fail} failed`);

// unauth checks
console.log(`\n== Unauth (no cookie) ==`);
for(const p of ['/api/v1/calls?limit=1','/api/v1/reports/summary','/api/v1/campaigns?limit=1']){
  const r = await apiGet(p, '');
  const ok = r.status===401;
  console.log(` ${ok?'✓':'✗'} GET ${p} unauth -> ${r.status} expected 401`);
}
}
main().catch(e=>{console.error(e); process.exit(1)});
