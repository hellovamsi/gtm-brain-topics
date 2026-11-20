import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

export async function runAuthorizedCollection(profile: string, focus: string, requestApproval = false, maxCredits = 10) {
  const args = [path.resolve("scripts/collect_focus.py"), profile, focus, "--max-credits", String(maxCredits)];
  if (requestApproval) args.push("--ask");
  return runCollector(args);
}

export async function runAuthorizedAudienceCollection(audience: string, profiles: string[], maxCredits = 10) {
  return runCollector([path.resolve("scripts/collect_audience.py"), "--", audience, JSON.stringify(profiles), String(maxCredits)]);
}

async function runCollector(args: string[]) {
  const { stdout } = await run("python3", args, { maxBuffer: 64 * 1024 }).catch(() => {
    throw new Error("Up2Data collection stopped. Check the provider connection, remaining allowance and request ledger before retrying.");
  });
  const status = stdout.trim();
  if (status !== "approval_required" && status !== "completed" && status !== "budget_reached" && status !== "approval_unavailable") throw new Error("Unknown Up2Data collection status.");
  return status;
}
