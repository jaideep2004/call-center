import 'dotenv/config';
import { auth } from '../src/server/auth.ts';
async function main(){
  const res = await auth.api.signInEmail({
    body: { email: 'jaisidhu2004@gmail.com', password: 'Test1234!' },
    // better-auth expects headers? pass empty
    headers: new Headers(),
  } as any);
  console.log('signIn result', JSON.stringify(res, null, 2).slice(0,3000));
  // try getSession via token
  if((res as any)?.token){
    const tok = (res as any).token;
    console.log('token', tok.slice(0,40));
    const sess = await auth.api.getSession({ headers: new Headers({ cookie: `better-auth.session_token=${tok}` }) } as any);
    console.log('session check', sess ? `OK ${sess.user.email}` : 'null');
  }
}
main().catch(e=>{console.error('err',e); console.error(e.stack)});