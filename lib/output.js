const fs = require("fs");

function ensureOutputDirs() {
  const dirs = ["output", "output/html", "output/pdf", "output/marp", "output/marp/html", "output/marp/pdf"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

module.exports = { ensureOutputDirs };
