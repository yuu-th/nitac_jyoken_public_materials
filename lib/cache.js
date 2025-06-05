const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// キャッシュファイルのパス
const CACHE_FILE = "output/.cache.json";

// ファイルのハッシュを計算する関数
function calculateFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("md5").update(content).digest("hex");
  } catch (error) {
    return null;
  }
}

// キャッシュを読み込む関数
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.log("⚠ Cache file corrupted, recreating cache");
  }
  return {};
}

// キャッシュを保存する関数
function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error("❌ Failed to save cache:", error.message);
  }
}

// ファイルが変更されているかチェックする関数
function isFileChanged(filePath, cache) {
  const relativePath = path.relative(".", filePath);
  const currentHash = calculateFileHash(filePath);

  if (!currentHash) return true;

  const cached = cache[relativePath];
  if (!cached || cached.hash !== currentHash) {
    console.log(`  📝 File changed or not cached: ${relativePath}`);
    return true;
  }

  // ハッシュが同じなら変更なしとみなす（出力ファイルの存在チェックをスキップ）
  console.log(`  ⚡ Using cache for: ${relativePath}`);
  return false;
}

// キャッシュを更新する関数
function updateCache(filePath, cache) {
  const relativePath = path.relative(".", filePath);
  const currentHash = calculateFileHash(filePath);

  if (currentHash) {
    cache[relativePath] = {
      hash: currentHash,
      lastProcessed: new Date().toISOString(),
    };
  }
}

module.exports = {
  calculateFileHash,
  loadCache,
  saveCache,
  isFileChanged,
  updateCache,
};
