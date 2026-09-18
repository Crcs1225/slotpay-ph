import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? markdownFiles(path) : path.endsWith(".md") ? [path] : [];
  });
}

const files = ["README.md", "AGENTS.md", "CONTEXT.md", ...markdownFiles("docs")];
const failures = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const mermaidFences = text.match(/```mermaid/g)?.length ?? 0;
  const allFences = text.match(/```/g)?.length ?? 0;
  if (mermaidFences > 0 && allFences % 2 !== 0) failures.push(`${file}: unclosed code fence`);
  for (const match of text.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g)) {
    const target = decodeURIComponent(match[1].split("#")[0]);
    if (target && !existsSync(resolve(dirname(file), target))) failures.push(`${file}: missing link target ${target}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Checked ${files.length} Markdown files.`);
