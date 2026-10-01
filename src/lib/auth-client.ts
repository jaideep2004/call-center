import { createAuthClient } from "better-auth/react";

// Never bake a localhost origin into the client bundle: a build made on dev
// would point production browsers at their own machine (same class of bug as
// the softphone NEXT_PUBLIC_REALTIME_URL incident). When the public URL is
// unset the SDK falls back to the runtime origin, which is always correct.
export const authClient = createAuthClient({
  ...(process.env.NEXT_PUBLIC_APP_URL ? { baseURL: process.env.NEXT_PUBLIC_APP_URL } : {}),
});
