import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// The widget supplies content only. The operator owns the destination.
export async function saveMarkdown(markdown: string) {
  const directory = path.resolve(process.env.INSPIRATION_DRAFTS_DIR ?? "../inspiration-drafts");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const digest = createHash("sha256").update(markdown).digest("hex").slice(0, 20);
  const filename = path.join(directory, `accepted-${digest}.md`);
  const temporary = path.join(directory, `.${randomUUID()}.tmp`);
  await writeFile(temporary, markdown, { flag: "wx", mode: 0o600 });
  try {
    await link(temporary, filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  } finally {
    await unlink(temporary);
  }
  return filename;
}
