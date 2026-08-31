export interface ScriptTemplateVars {
  agent_name?: string;
  phone?: string;
  npn?: string;
  state?: string;
  beneficiary?: string;
}

const PLACEHOLDER_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;
// Client template uses square brackets like [Your Name], [State], [Phone]
// Map those to the same vars. Case-insensitive, spaces/underscores normalized.
const BRACKET_RE = /\[\s*([^\]]+?)\s*\]/g;
const ALIAS_MAP: Record<string, keyof ScriptTemplateVars> = {
  "your name": "agent_name",
  "your_name": "agent_name",
  "agent_name": "agent_name",
  "agent name": "agent_name",
  "name": "agent_name",
  "phone": "phone",
  "phone number": "phone",
  "npn": "npn",
  "state": "state",
  "your state": "state",
  "caller state": "state",
  "beneficiary": "beneficiary",
};

function resolveBracketKey(raw: string): keyof ScriptTemplateVars | null {
  const norm = raw.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
  return ALIAS_MAP[norm] ?? null;
}

export function renderScriptTemplate(content: string, vars: ScriptTemplateVars = {}): string {
  if (!content) return "";
  // First pass: {{var}} style
  let out = content.replace(PLACEHOLDER_RE, (match, key: string) => {
    const value = vars[key.toLowerCase() as keyof ScriptTemplateVars];
    return typeof value === "string" && value.length > 0 ? value : match;
  });
  // Second pass: [Your Name] style (client doc)
  out = out.replace(BRACKET_RE, (match, key: string) => {
    const mapped = resolveBracketKey(key);
    if (!mapped) return match;
    const value = vars[mapped];
    return typeof value === "string" && value.length > 0 ? value : match;
  });
  return out;
}

export function scriptPlaceholders(): string[] {
  return ["agent_name", "phone", "npn", "state", "beneficiary"];
}
