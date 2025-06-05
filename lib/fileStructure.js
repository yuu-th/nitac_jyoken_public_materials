const fs = require("fs");
const path = require("path");

async function getFileStructure(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (["output", ".git", ".github", "node_modules", ".history"].includes(dirent.name)) continue;
      files.push({
        name: dirent.name,
        type: "directory",
        children: await getFileStructure(res),
      });
    } else if (dirent.name.endsWith(".md")) {
      const content = await fs.promises.readFile(res, "utf-8");
      const isMarp = content.includes("marp: true") || content.includes("marp: 'true'");
      files.push({ name: dirent.name, path: res, type: isMarp ? "marp" : "regular" });
    }
  }

  return files.sort((a, b) => {
    if (a.type === "directory" && b.type !== "directory") return -1;
    if (a.type !== "directory" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });
}

module.exports = { getFileStructure };
