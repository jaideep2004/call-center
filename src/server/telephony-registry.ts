import { mockProvider, type TelephonyProvider } from "@/domain/telephony";
import { telnyxProvider } from "@/domain/providers/telnyx";

const providers: Record<string, TelephonyProvider> = { mock: mockProvider };

if (process.env.TELNYX_API_KEY) {
  providers.telnyx = telnyxProvider;
}

export function getTelephonyProvider(name: string) {
  const provider = providers[name];
  if (!provider) throw new Error(`Unsupported telephony provider: ${name}`);
  return provider;
}

export function registerProvider(name: string, provider: TelephonyProvider) {
  providers[name] = provider;
}
