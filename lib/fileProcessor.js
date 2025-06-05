const fs = require("fs");
const path = require("path");
const { processRegularFile } = require("./processRegular");
const { processMarpFile } = require("./processMarp");
const { isFileChanged, updateCache } = require("./cache");

async function processFilesRecursive(structure, currentPath = "", pdfSupport = false, marpSupport = false, cache = {}, stats = {}) {
  stats.skipped = stats.skipped || 0;
  let htmlFiles = [];
  let pdfFiles = [];
  let marpHtmlFiles = [];
  let marpPdfFiles = [];

  for (const item of structure) {
    if (item.type === "directory") {
      const subDir = path.join("output", currentPath, item.name);
      if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
      const subFiles = await processFilesRecursive(item.children, path.join(currentPath, item.name), pdfSupport, marpSupport, cache, stats);
      htmlFiles = htmlFiles.concat(subFiles.htmlFiles);
      pdfFiles = pdfFiles.concat(subFiles.pdfFiles);
      marpHtmlFiles = marpHtmlFiles.concat(subFiles.marpHtmlFiles);
      marpPdfFiles = marpPdfFiles.concat(subFiles.marpPdfFiles);
    } else if (item.type === "regular") {
      console.log(`Processing: ${path.relative(".", item.path)}`);
      const relativeFilePath = path.relative(".", path.dirname(item.path));
      const result = await processRegularFile(item.path, relativeFilePath, pdfSupport, cache, stats, isFileChanged, updateCache);
      if (result.html) htmlFiles.push({ name: path.basename(result.html, ".html"), path: result.html, originalPath: item.path });
      if (result.pdf) pdfFiles.push({ name: path.basename(result.pdf, ".pdf"), path: result.pdf, originalPath: item.path });
    } else if (item.type === "marp") {
      console.log(`Processing Marp: ${path.relative(".", item.path)}`);
      const relativeFilePath = path.relative(".", path.dirname(item.path));
      let result;
      if (marpSupport) {
        result = await processMarpFile(item.path, relativeFilePath, marpSupport, cache, stats, isFileChanged, updateCache);
        if (result.html) marpHtmlFiles.push({ name: path.basename(result.html, ".html"), path: result.html, originalPath: item.path });
        if (result.pdf) marpPdfFiles.push({ name: path.basename(result.pdf, ".pdf"), path: result.pdf, originalPath: item.path });
      } else {
        result = await processRegularFile(item.path, relativeFilePath, pdfSupport, cache, stats, isFileChanged, updateCache);
        if (result.html) htmlFiles.push({ name: path.basename(result.html, ".html"), path: result.html, originalPath: item.path });
        if (result.pdf) pdfFiles.push({ name: path.basename(result.pdf, ".pdf"), path: result.pdf, originalPath: item.path });
      }
      console.log(`Completed file: ${item.name}`);
    }
  }

  return { htmlFiles, pdfFiles, marpHtmlFiles, marpPdfFiles };
}

module.exports = { processFilesRecursive };
