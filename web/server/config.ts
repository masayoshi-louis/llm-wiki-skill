import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export interface ServerConfig {
  wikiRoot: string;
  port: number;
  host: string;
  author: string;
  auth?: { user: string; pass: string };
}

export function parseArgs(argv: string[]): ServerConfig {
  const args = argv.slice(2);
  let wikiRoot: string | null = null;
  let port = 4175;
  let host = "127.0.0.1";
  let author = os.userInfo().username || "me";
  let authUser: string | null = null;
  let authPass: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    switch (a) {
      case "--wiki":
      case "-w":
        wikiRoot = args[++i] ?? null;
        break;
      case "--port":
      case "-p":
        port = parseInt(args[++i] ?? "4175", 10);
        break;
      case "--host":
        host = args[++i] ?? host;
        break;
      case "--author":
        author = args[++i] ?? author;
        break;
      case "--auth": {
        const val = args[++i] ?? "";
        const sep = val.indexOf(":");
        if (sep < 1) {
          console.error("error: --auth requires user:password format");
          process.exit(1);
        }
        authUser = val.slice(0, sep);
        authPass = val.slice(sep + 1);
        break;
      }
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (a.startsWith("--")) {
          console.error(`unknown flag: ${a}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  if (!wikiRoot) {
    console.error("error: --wiki <root> is required");
    printHelp();
    process.exit(1);
  }

  const resolved = path.resolve(wikiRoot);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    console.error(`error: wiki root does not exist or is not a directory: ${resolved}`);
    process.exit(1);
  }

  // auth from --auth flag or WIKI_AUTH env (user:pass)
  if (!authUser) {
    const envAuth = process.env.WIKI_AUTH;
    if (envAuth) {
      const sep = envAuth.indexOf(":");
      if (sep >= 1) {
        authUser = envAuth.slice(0, sep);
        authPass = envAuth.slice(sep + 1);
      }
    }
  }

  const auth = authUser && authPass ? { user: authUser, pass: authPass } : undefined;

  return { wikiRoot: resolved, port, host, author, auth };
}

function printHelp(): void {
  console.log(`
Usage:
  npm start -- --wiki <wiki-root> [--port 4175] [--host 127.0.0.1] [--author lewis] [--auth user:pass]

Options:
  -w, --wiki     Path to the wiki root (required). The directory should
                 contain a 'wiki/', 'audit/', and ideally 'log/' folder
                 created by scripts/scaffold.py.
  -p, --port     Port to listen on (default: 4175).
      --host     Host to bind to (default: 127.0.0.1 — local only).
      --author   Author name written into feedback files (default: $USER).
      --auth     Enable HTTP Basic Auth (format: user:password).
                 Can also be set via WIKI_AUTH env var.
  -h, --help     Show this help.
`);
}
