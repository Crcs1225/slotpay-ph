import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const siteUrl = process.argv[2] ?? "http://localhost:3000";
const tempFile = join(tmpdir(), `slotpay-auth-${process.pid}.env`);
const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

try {
  writeFileSync(
    tempFile,
    `JWT_PRIVATE_KEY=${privateKey}\nJWKS=${jwks}\nSITE_URL=${siteUrl}\n`,
    { mode: 0o600 },
  );
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npx convex env set --from-file "${tempFile}"`], { stdio: "inherit" })
    : spawnSync("npx", ["convex", "env", "set", "--from-file", tempFile], { stdio: "inherit" });
  if (result.error) console.error(`Unable to start Convex CLI: ${result.error.message}`);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempFile, { force: true });
}
