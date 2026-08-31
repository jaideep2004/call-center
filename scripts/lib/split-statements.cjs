// Shared SQL statement splitter for migration scripts.
// Splits on top-level semicolons, respecting `--` line comments, single/double
// quoted strings, and $tag$ dollar-quoted bodies (DO blocks).

function splitStatements(input) {
  const statements = [];
  let current = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === "-" && next === "-") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }
    if (ch === "'") {
      current += ch;
      i++;
      while (i < input.length) {
        if (input[i] === "'") {
          if (input[i + 1] === "'") { current += "''"; i += 2; continue; }
          current += "'";
          i++;
          break;
        }
        current += input[i];
        i++;
      }
      continue;
    }
    if (ch === '"') {
      current += ch;
      i++;
      while (i < input.length) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') { current += '""'; i += 2; continue; }
          current += '"';
          i++;
          break;
        }
        current += input[i];
        i++;
      }
      continue;
    }
    if (ch === "$") {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(input.slice(i));
      if (m) {
        current += m[0];
        i += m[0].length;
        const endIdx = input.indexOf(m[0], i);
        if (endIdx === -1) {
          current += input.slice(i);
          i = input.length;
        } else {
          current += input.slice(i, endIdx) + m[0];
          i = endIdx + m[0].length;
        }
        continue;
      }
    }
    if (ch === ";") {
      const t = current.trim();
      if (t) statements.push(t);
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  const t = current.trim();
  if (t) statements.push(t);
  return statements;
}

module.exports = { splitStatements };
