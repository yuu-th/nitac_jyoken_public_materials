const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { JSDOM } = require("jsdom"); // JSDOM追加

// GitHub Actions環境かどうかを判定
function isGitHubActions() {
  return process.env.GITHUB_ACTIONS === "true";
}

// 環境に応じたブラウザオプションを取得
function getBrowserOptions() {
  if (isGitHubActions()) {
    // GitHub Actions環境用の設定
    return "--browser chromium --blink-settings=imagesEnabled=false";
  }
  return "--browser chrome";
}

// 環境に応じたタイムアウト時間を取得
function getTimeout() {
  if (isGitHubActions()) {
    return 180000; // 3分（GitHub Actionsは起動が遅い）
  }
  return 90000; // 1.5分（ローカル環境）
}

// 環境に応じた環境変数を取得
function getEnvVars() {
  const baseEnv = { ...process.env };

  if (isGitHubActions()) {
    // GitHub Actions環境用
    return {
      ...baseEnv,
      DISPLAY: ":99",
      CHROME_PATH: "/usr/bin/chromium-browser",
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true",
    };
  }

  // ローカル環境用
  return {
    ...baseEnv,
    DISPLAY: ":99",
  };
}

// HTML用の画像パスをBASE_PATH対応のroot-relativeパスに変換
function processImagePathForHtml(href, originalFileDir, workspaceRoot) {
  if (!href || href.startsWith("http") || href.startsWith("data:") || href.startsWith("/") || path.isAbsolute(href)) {
    return href;
  }

  try {
    const absoluteImagePath = path.resolve(originalFileDir, href);
    if (!fs.existsSync(absoluteImagePath)) {
      console.warn(`  ⚠️ 画像ファイルが見つかりません: ${href}`);
      return href; // プレースホルダーではなく元のパスを返す
    }

    let rel = path.relative(workspaceRoot, absoluteImagePath).replace(/\\/g, "/");
    rel = rel
      .split("/")
      .map((p) => (/[^\x00-\x7F]/.test(p) ? encodeURIComponent(p) : p))
      .join("/");

    const basePath = getBasePath();
    return basePath + "/" + rel;
  } catch (err) {
    console.warn(`  ⚠️ 画像パス処理エラー: ${err.message}`);
    return href; // エラー時は元のパスを返す
  }
}

// HTML用のMarkdownコンテンツを準備（root-relativeパス使用）
function prepareHtmlMarkdown(content, originalFileDir, workspaceRoot) {
  // Markdown画像をroot-relativeパスに変換
  content = content.replace(/!\[([^\]]*)\]\(([^)"']*)(?: "([^"]*)")?\)/g, (match, alt, href, title) => {
    if (!href) return match;
    const htmlPath = processImagePathForHtml(href, originalFileDir, workspaceRoot);
    return `![${alt}](${htmlPath}${title ? ` "${title}"` : ""})`;
  });
  // HTML imgタグのsrcをroot-relativeパスに変換
  content = content.replace(/<(img|image)\s+([^>]*)src=["']([^"']*)["']([^>]*)>/gi, (match, tagName, beforeSrc, src, afterSrc) => {
    if (!src) return match;
    const htmlPath = processImagePathForHtml(src, originalFileDir, workspaceRoot);
    return `<img ${beforeSrc}src="${htmlPath}"${afterSrc}>`;
  });
  return content;
}

// PDF用のMarkdownコンテンツを準備（file://絶対パス使用）
function preparePdfMarkdown(content, originalFileDir, workspaceRoot) {
  // Markdown画像をfile://絶対パスに変換
  content = content.replace(/!\[([^\]]*)\]\(([^)"']*)(?: "([^"]*)")?\)/g, (match, alt, href, title) => {
    if (!href || href.startsWith("http") || href.startsWith("data:") || href.startsWith("")) return match;
    const absoluteImagePath = path.resolve(originalFileDir, href).replace(/\\/g, "/");
    return `![${alt}](${absoluteImagePath}${title ? ` "${title}"` : ""})`;
  });
  // HTML imgタグのsrcをfile://絶対パスに変換
  content = content.replace(/<(img|image)\s+([^>]*)src=["']([^"']*)["']([^>]*)>/gi, (match, tagName, beforeSrc, src, afterSrc) => {
    if (!src || src.startsWith("http") || src.startsWith("data:") || src.startsWith("")) return match;
    const absoluteImagePath = path.resolve(originalFileDir, src).replace(/\\/g, "/");
    return `<img ${beforeSrc}src="${absoluteImagePath}" ${afterSrc}>`;
  });
  return content;
}

// HTMLの<image>タグを<img>タグに置換する関数
function replaceImageTags(content) {
  return content.replace(/<image\s+/gi, "<img ");
}

// GitHub Pages対応：ベースパスを取得
function getBasePath() {
  return process.env.BASE_PATH || "";
}

// HTML後処理：CSSリンクを追加
async function postProcessMarpHtml(htmlFilePath) {
  try {
    const htmlContent = await fs.promises.readFile(htmlFilePath, "utf-8");
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // ルート相対CSSを<head>にリンク（BASE_PATH対応）
    const basePath = getBasePath();
    const cssHref = basePath + "/style.css";
    const head = document.querySelector("head") || document.createElement("head");
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const linkEl = document.createElement("link");
      linkEl.setAttribute("rel", "stylesheet");
      linkEl.setAttribute("href", cssHref);
      head.appendChild(linkEl);
    }

    // 修正されたHTMLを書き戻し
    const fixedHtmlContent = dom.serialize();
    await fs.promises.writeFile(htmlFilePath, fixedHtmlContent);
  } catch (err) {
    console.warn(`  ⚠️ HTML後処理エラー: ${err.message}`);
  }
}
async function processMarpFile(filePath, relativePath, marpSupport = true, cache = {}, stats = {}, isFileChanged, updateCache) {
  const fileName = path.basename(filePath, ".md");
  const outputHtmlPath = path.join("output/marp/html", relativePath, `${fileName}.html`);
  const outputPdfPath = path.join("output/marp/pdf", relativePath, `${fileName}.pdf`);

  if (!isFileChanged(filePath, cache)) {
    stats.skipped = (stats.skipped || 0) + 1;
    return { html: fs.existsSync(outputHtmlPath) ? outputHtmlPath : null, pdf: fs.existsSync(outputPdfPath) ? outputPdfPath : null };
  }

  fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputPdfPath), { recursive: true });
  try {
    let content = await fs.promises.readFile(filePath, "utf-8");
    if (!content.trim()) return { html: null, pdf: null };

    const originalFileDir = path.dirname(filePath);
    const workspaceRoot = process.cwd();

    // <image>タグを<img>タグに置換
    content = replaceImageTags(content);

    const marpStylePath = path.resolve("marp_style.css");
    const styleOption = fs.existsSync(marpStylePath) ? `--theme-set "${marpStylePath}"` : "";

    try {
      // HTML生成用のMarkdownコンテンツを準備
      const htmlContent = prepareHtmlMarkdown(content, originalFileDir, workspaceRoot);

      // HTML生成用の一時ファイルを作成
      const tempHtmlFilePath = `${filePath}.html.temp.md`;
      await fs.promises.writeFile(tempHtmlFilePath, htmlContent);

      const absoluteTempHtmlFilePath = path.resolve(tempHtmlFilePath);
      const absoluteHtmlOutput = path.resolve(outputHtmlPath);

      console.log(`  🔄 HTML変換中: ${path.basename(filePath)}`);
      const htmlCmd = `npx @marp-team/marp-cli@latest "${absoluteTempHtmlFilePath}" -o "${absoluteHtmlOutput}" --html --allow-local-files --browser chrome --no-stdin ${styleOption}`;
      await Promise.race([exec(htmlCmd, { timeout: 60000, maxBuffer: 1024 * 1024, env: { ...process.env, DISPLAY: ":99" } }), new Promise((_, reject) => setTimeout(() => reject(new Error("Marp HTML conversion timeout")), 60000))]); // HTML生成後にCSSリンクを追加
      await postProcessMarpHtml(absoluteHtmlOutput);

      console.log(`  ✅ HTML完了: ${path.basename(outputHtmlPath)}`);

      // 一時ファイルを削除
      try {
        fs.unlinkSync(tempHtmlFilePath);
      } catch (e) {
        // 無視
      }

      // PDF生成用のMarkdownコンテンツを準備
      const pdfContent = preparePdfMarkdown(content, originalFileDir, workspaceRoot);

      // PDF生成用の一時ファイルを作成
      const tempPdfFilePath = `${filePath}.pdf.temp.md`;
      await fs.promises.writeFile(tempPdfFilePath, pdfContent);

      const absoluteTempPdfFilePath = path.resolve(tempPdfFilePath);
      const absolutePdfOutput = path.resolve(outputPdfPath);

      console.log(`  🔄 PDF変換中: ${path.basename(filePath)}`);
      const pdfCmd = `npx @marp-team/marp-cli@latest "${absoluteTempPdfFilePath}" -o "${absolutePdfOutput}" --allow-local-files --browser chrome --no-stdin ${styleOption}`;
      try {
        await Promise.race([exec(pdfCmd, { timeout: 60000, maxBuffer: 1024 * 1024, env: { ...process.env, DISPLAY: ":99" } }), new Promise((_, reject) => setTimeout(() => reject(new Error("Marp PDF conversion timeout")), 60000))]);
        console.log(`  ✅ PDF完了: ${path.basename(outputPdfPath)}`);
      } catch (pdfError) {
        console.error(`  ❌ PDF生成エラー: ${pdfError.message}`);
      }

      // PDF用一時ファイルを削除
      try {
        fs.unlinkSync(tempPdfFilePath);
      } catch (e) {
        // 無視
      }
    } finally {
      // 特にクリーンアップ処理なし
    }

    updateCache(filePath, cache);
    return { html: outputHtmlPath, pdf: fs.existsSync(outputPdfPath) ? outputPdfPath : null };
  } catch (error) {
    console.error(`Error processing Marp file ${filePath}:`, error.message);
    return { html: null, pdf: null };
  }
}

module.exports = { processMarpFile };
