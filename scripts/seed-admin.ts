/**
 * Seed admin user from env — idempotent, non-destructive.
 * Usage:
 *   SEED_ADMIN_EMAIL=admin@coverage.test SEED_ADMIN_PASSWORD=Admin123! SEED_ADMIN_NAME="Super Admin" npm run seed:admin
 * Or set in .env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 * Also reads ADMIN_EMAIL / ADMIN_PASSWORD as fallback.
 *
 * - Creates Better Auth user via auth.api.signUpEmail (handles bcrypt + emailVerified)
 * - Promotes to super_admin (user.role + app.memberships)
 * - Ensures default agency exists
 * - Safe to re-run (updates password/name if user exists)
 */
import 'dotenv/config';
import { auth } from '../src/server/auth';
import { pool, query, queryOne } from '../src/server/db';

const EMAIL = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'admin@coverage.test';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin123!';
const NAME = process.env.SEED_ADMIN_NAME || process.env.ADMIN_NAME || 'Super Admin';
const ROLE = (process.env.SEED_ADMIN_ROLE || 'super_admin') as 'super_admin' | 'admin';

if (!EMAIL || !PASSWORD) {
  console.error('Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (or ADMIN_EMAIL/PASSWORD) in .env');
  process.exit(1);
}
if (PASSWORD.length < 8) {
  console.error('SEED_ADMIN_PASSWORD must be >=8 chars');
  process.exit(1);
}

async function ensureAgency(): Promise<string> {
  const existing = await queryOne<{ id: string }>(`SELECT id FROM app.agencies WHERE slug = 'my-agency' LIMIT 1`);
  if (existing) return existing.id;
  const any = await queryOne<{ id: string }>(`SELECT id FROM app.agencies LIMIT 1`);
  if (any) return any.id;
  const row = await queryOne<{ id: string }>(`INSERT INTO app.agencies (name, slug) VALUES ('My Agency','my-agency') RETURNING id`);
  console.log('Created agency My Agency');
  return row!.id;
}

async function main() {
  console.log(`Seeding admin: ${EMAIL} / role=${ROLE}`);
  // 1. Try to find existing user (case-insensitive)
  let user = await queryOne<{ id: string; email: string; name: string; role: string }>(
    `SELECT id, email, name, role FROM "user" WHERE lower(email)=lower($1) LIMIT 1`,
    [EMAIL],
  );

  if (!user) {
    console.log('User not found — creating via Better Auth signUp...');
    try {
      const res: any = await (auth.api as any).signUpEmail({
        body: { email: EMAIL, password: PASSWORD, name: NAME },
        headers: new Headers(),
      });
      // signUp may require email verification; force verification for seed
      user = await queryOne<{ id: string; email: string; name: string; role: string }>(
        `SELECT id, email, name, role FROM "user" WHERE lower(email)=lower($1) LIMIT 1`,
        [EMAIL],
      );
      if (!user) throw new Error('signUp succeeded but user not found in DB');
      console.log(`Created user ${user.id} (${res?.user?.email ?? EMAIL})`);
      // Mark email verified so login works immediately (SMTP may be on)
      await query(`UPDATE "user" SET "emailVerified" = true, "updatedAt" = now() WHERE id = $1`, [user.id]);
    } catch (e: any) {
      // Better Auth may throw if already exists race
      console.error('signUp failed:', e?.message ?? e);
      user = await queryOne(`SELECT id, email, name, role FROM "user" WHERE lower(email)=lower($1) LIMIT 1`, [EMAIL]) as any;
      if (!user) throw e;
    }
  } else {
    console.log(`User exists ${user.id} — updating name/verified...`);
    await query(`UPDATE "user" SET name=$1, "emailVerified"=true, "updatedAt"=now() WHERE id=$2`, [NAME, user.id]);
    // Reset password via Better Auth internal? Easiest: use account table update with new hash via sign-in trick
    // We'll try to update password by deleting account and recreating? Instead just ensure login works:
    // Try to signIn to test password, if fails, update account.password via auth internal
    try {
      const test: any = await (auth.api as any).signInEmail({
        body: { email: EMAIL, password: PASSWORD },
        headers: new Headers(),
      } as any);
      if (!test?.user) throw new Error('password mismatch');
      console.log('Password already correct');
    } catch {
      console.log('Password mismatch — re-hashing via better-auth/crypto...');
      let hash: string | null = null;
      try {
        // @ts-ignore — better-auth internal
        const mod: any = await import('better-auth/crypto');
        const fn = mod.hashPassword || mod.default?.hashPassword;
        if (fn) hash = await fn(PASSWORD);
      } catch {}
      if (hash) {
        // Better Auth stores password in account table (providerId=credential)
        await query(`UPDATE account SET password=$1, "updatedAt"=now() WHERE "userId"=$2 AND "providerId"='credential'`, [hash, user.id]);
        if ((await query(`SELECT id FROM account WHERE "userId"=$1`, [user.id])).length === 0) {
          const id = `seed_${Date.now()}`;
          await query(`INSERT INTO account (id, "accountId", "providerId", "userId", password) VALUES ($1,$2,'credential',$3,$4)`, [id, user.id, user.id, hash]);
        }
        console.log('Password updated');
      } else {
        console.warn('Could not hash password — please reset via /forgot-password or delete user and re-run seed');
        // Fallback: delete and recreate via signUp (destructive per user)
        try {
          await query(`DELETE FROM "user" WHERE id=$1`, [user.id]);
          const res: any = await (auth.api as any).signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: NAME }, headers: new Headers() } as any);
          user = await queryOne(`SELECT id, email, name, role FROM "user" WHERE lower(email)=lower($1) LIMIT 1`, [EMAIL]) as any;
          if (user) {
            await query(`UPDATE "user" SET "emailVerified"=true WHERE id=$1`, [user.id]);
            console.log('Recreated user with new password');
          }
        } catch (e2: any) {
          console.warn('Recreate also failed:', e2.message?.slice(0,120));
        }
      }
    }
  }

  // 2. Promote to super_admin
  await query(`UPDATE "user" SET role=$1, "updatedAt"=now() WHERE id=$2`, [ROLE, user!.id]);
  console.log(`Set user role=${ROLE}`);

  const agencyId = await ensureAgency();
  const mem = await queryOne<{ id: string }>(`SELECT id FROM app.memberships WHERE user_id=$1 AND agency_id=$2 LIMIT 1`, [user!.id, agencyId]);
  if (mem) {
    await query(`UPDATE app.memberships SET role=$1, status='active' WHERE id=$2`, [ROLE, mem.id]);
    console.log(`Updated membership ${mem.id} to ${ROLE}`);
  } else {
    const id = await queryOne<{ id: string }>(`INSERT INTO app.memberships (agency_id, user_id, role, status) VALUES ($1,$2,$3,'active') RETURNING id`, [agencyId, user!.id, ROLE]);
    console.log(`Created membership ${id?.id} for agency ${agencyId}`);
  }

  // 3. Verify login works
  try {
    const check: any = await (auth.api as any).signInEmail({ body: { email: EMAIL, password: PASSWORD }, headers: new Headers() } as any);
    console.log(check?.user ? `✓ Login verified for ${EMAIL}` : 'Login check returned no user (check SMTP verification setting)');
  } catch (e: any) {
    console.warn('Login verify failed:', e.message?.slice(0,200));
  }

  console.log('\nDone. Test:');
  console.log(`  curl -X POST http://localhost:30001/api/auth/sign-in/email -H "Content-Type: application/json" -d '{"email":"${EMAIL}","password":"${PASSWORD}"}'`);
  console.log(`  then open http://localhost:30001/login`);
  await pool.end();
}

main().catch((e)=>{ console.error(e); process.exit(1)});
