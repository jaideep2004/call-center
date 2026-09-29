export const callStates = [
  "received", "validating", "routing", "ringing", "accepted", "connecting", "connected",
  "ended", "failed", "missed", "cancelled", "disputed",
] as const;

export type CallState = (typeof callStates)[number];
export type TerminalCallState = "ended" | "failed" | "missed" | "cancelled" | "disputed";

const transitions: Record<CallState, readonly CallState[]> = {
  received: ["validating", "failed", "cancelled"],
  validating: ["routing", "failed", "cancelled"],
  routing: ["ringing", "missed", "failed", "cancelled"],
  ringing: ["accepted", "routing", "missed", "failed", "cancelled"],
  // Customer (or agent) can hang up mid-bridge: accepted/connecting must
  // reach ended or the webhook 400s and the call wedges forever.
  accepted: ["connecting", "routing", "ended", "failed", "cancelled"],
  connecting: ["connected", "routing", "ended", "failed", "cancelled"],
  connected: ["ended", "failed", "disputed"],
  ended: [], failed: [], missed: [], cancelled: [], disputed: [],
};

export function canTransition(from: CallState, to: CallState) {
  return transitions[from].includes(to);
}

export function assertTransition(from: CallState, to: CallState) {
  if (!canTransition(from, to)) throw new Error(`Illegal call transition: ${from} -> ${to}`);
}

export function isTerminal(state: CallState): state is TerminalCallState {
  return transitions[state].length === 0;
}

export function isQualifiedCall(input: {
  state: CallState;
  connectedSeconds: number;
  minConnectedSeconds: number;
  outcomeAccepted?: boolean;
}) {
  return input.state === "ended"
    && input.connectedSeconds >= input.minConnectedSeconds
    && input.outcomeAccepted !== false;
}
