const fs = require("fs");
const path = require("path");

// Modular imports
const { loadCache, saveCache, isFileChanged, updateCache } = require("./lib/cache");
const { getFileStructure } = require("./lib/fileStructure");
const { checkPdfSupport, checkMarpSupport, checkNpmDependencies } = require("./lib/dependency");
const { processRegularFile } = require("./lib/processRegular");
const { processMarpFile } = require("./lib/processMarp");
const { ensureOutputDirs } = require("./lib/output");
const { generateIndexHtml } = require("./lib/indexGenerator");
const { HierarchicalIndexGenerator } = require("./lib/hierarchicalIndexGenerator");
const { processFilesRecursive } = require("./lib/fileProcessor");

// キャッシュファイルのパス
const CACHE_FILE = "output/.cache.json";

// メイン実行関数
async function main() {
  console.log("=== Starting Markdown Conversion ===");
  ensureOutputDirs();

  // 依存関係チェック
  const npmDepsAvailable = await checkNpmDependencies();
  if (!npmDepsAvailable) {
    console.error("❌ Failed to install required NPM packages");
    process.exit(1);
  }
  // 依存関係チェック
  console.log("🔍 Checking system dependencies...");
  const pdfSupport = true; // PDF変換を常に有効にする
  const marpSupport = await checkMarpSupport();
  const npmDependencies = await checkNpmDependencies();
  try {
    console.log("📁 Scanning file structure...");
    const fileStructure = await getFileStructure("."); // カレントディレクトリから開始
    console.log("✓ File structure scan completed");

    // キャッシュを読み込み
    console.log("⚡ Loading cache...");
    const cache = loadCache();
    const stats = { skipped: 0 };
    console.log("✓ Cache loaded");

    console.log("🔄 Starting file processing...");
    const allProcessedFiles = await processFilesRecursive(fileStructure, "", pdfSupport, marpSupport, cache, stats);
    console.log("✓ File processing completed");

    // キャッシュを保存
    console.log("💾 Saving cache...");
    saveCache(cache);
    console.log("✓ Cache saved");
    console.log("📄 Generating hierarchical directory indexes...");
    const hierarchicalGenerator = new HierarchicalIndexGenerator();
    hierarchicalGenerator.generateAllIndexes(allProcessedFiles);
    console.log("✓ Hierarchical directory indexes generated"); // 処理結果のサマリーを表示
    const { htmlFiles, pdfFiles, marpHtmlFiles, marpPdfFiles } = allProcessedFiles;

    console.log("\n=== Conversion Summary ===");
    console.log(`Regular HTML files: ${htmlFiles.length}`);
    console.log(`Regular PDF files: ${pdfFiles.length}`);
    console.log(`Marp HTML files: ${marpHtmlFiles.length}`);
    console.log(`Marp PDF files: ${marpPdfFiles.length}`);
    console.log(`Total files processed: ${htmlFiles.length + marpHtmlFiles.length}`);
    console.log(`Files skipped (no changes): ${stats.skipped}`);
    console.log(`Cache efficiency: ${htmlFiles.length + marpHtmlFiles.length + stats.skipped > 0 ? Math.round((stats.skipped / (htmlFiles.length + marpHtmlFiles.length)) * 100) : 0}% files skipped`);

    console.log("\n=== All Processes Completed Successfully ===");
  } catch (error) {
    console.error("❌ Error during conversion process:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// markedの動的インポートとメイン関数の実行
(async () => {
  try {
    // marked と marp-cli をインストール (package.json にあれば不要だが念のため)
    // await exec('npm install marked @marp-team/marp-cli');
    // console.log('Installed marked and @marp-team/marp-cli');
    await main();
  } catch (err) {
    console.error("Failed to install dependencies or run main function:", err);
    process.exit(1);
  }
})();
