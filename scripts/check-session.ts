import { auth } from '../src/server/auth.ts';
async function main(){
const token = 'lHkZD156cMqZIBJKAVyyDw6pBBRmmqed';
for (const cookie of [
  `better-auth.session_token=${token}`,
  `better_auth.session_token=${token}`,
  `__Secure-better-auth.session_token=${token}`,
]) {
  const res = await auth.api.getSession({ headers: new Headers({ cookie }) } as any);
  console.log('cookie:', cookie.slice(0,30), '->', res ? `OK user ${res.user?.email} ses ${res.session?.id}` : 'null');
}
}
main().catch(e=>console.error(e));
