const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { JSDOM } = require("jsdom"); // JSDOM追加

// GitHub Pages対応：ベースパスを取得
function getBasePath() {
  return process.env.BASE_PATH || "";
}

// 画像リンクを処理して無効なhrefを修正する関数
function processImageLinks(content, filePath) {
  const fileDir = path.dirname(filePath);
  let processedContent = content;
  let imageCount = 0;
  let fixedCount = 0;

  // マークダウンの画像記法 ![alt](href "title") を検出して処理
  processedContent = content.replace(/!\[([^\]]*)\]\(([^)"]*)(?: "([^"]*)")?\)/g, (match, alt, href, title) => {
    imageCount++; // hrefがnullやundefinedの場合のチェック
    if (!href) {
      fixedCount++;
      return `![${alt}](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII= "画像パスが無効")`;
    }

    try {
      // 画像ファイルの存在確認
      if (typeof href === "string" && !href.startsWith("http") && !href.startsWith("/") && !href.startsWith("data:")) {
        // パスの正規化
        const absoluteImagePath = path.resolve(fileDir, href);

        if (!fs.existsSync(absoluteImagePath)) {
          console.log(`  ⚠️ 画像未発見: ${href}`);
          fixedCount++;
          return `![${alt}](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII= "画像ファイルが見つかりません")`;
        }
      }
      return match;
    } catch (err) {
      fixedCount++;
      return `![${alt}](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII= "画像パス処理エラー")`;
    }
  });

  // <img> タグと <image> タグも処理
  const imgTagRegex = /<(img|image)\s+([^>]*)src=["']([^"']*)["']([^>]*)>/gi;
  processedContent = processedContent.replace(imgTagRegex, (match, tagName, beforeSrc, src, afterSrc) => {
    imageCount++; // srcがnullやundefinedの場合のチェック
    if (!src) {
      fixedCount++;
      return `<img ${beforeSrc}src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" title="画像パスが無効" ${afterSrc}>`;
    }

    try {
      // 相対パスの場合、ファイルの存在確認
      if (typeof src === "string" && !src.startsWith("http") && !src.startsWith("/") && !src.startsWith("data:")) {
        // パスの正規化
        const absoluteImagePath = path.resolve(fileDir, src);

        if (!fs.existsSync(absoluteImagePath)) {
          console.log(`  ⚠️ 画像未発見: ${src}`);
          fixedCount++;
          return `<img ${beforeSrc}src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" title="画像ファイルが見つかりません" ${afterSrc}>`;
        } else {
          // image タグを img タグに変換
          if (tagName.toLowerCase() === "image") {
            fixedCount++;
            return `<img ${beforeSrc}src="${src}" ${afterSrc}>`;
          }
        }
      }

      // image タグを img タグに変換
      if (tagName.toLowerCase() === "image") {
        fixedCount++;
        return `<img ${beforeSrc}src="${src}" ${afterSrc}>`;
      }
      return match;
    } catch (err) {
      fixedCount++;
      return `<img ${beforeSrc}src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" title="画像パス処理エラー" ${afterSrc}>`;
    }
  });
  if (imageCount > 0 && fixedCount > 0) {
    console.log(`  🖼 画像処理: ${imageCount}個中${fixedCount}個修正`);
  }

  return processedContent;
}

// HTMLの<image>タグを<img>タグに置換する関数
function replaceImageTags(content) {
  return content.replace(/<image\s+/gi, "<img ");
}

// Marp生成後のHTMLファイル内の画像パスを修正する関数
async function fixMarpHtmlImagePaths(htmlFilePath, originalFilePath) {
  try {
    const htmlContent = await fs.promises.readFile(htmlFilePath, "utf-8");
    const originalFileDir = path.dirname(originalFilePath);
    const workspaceRoot = process.cwd();

    // JSDOMを使用してより確実に画像パスを処理
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document; // ルート相対CSSを<head>にリンク（BASE_PATH対応）
    const basePath = getBasePath();
    const cssHref = basePath + "/style.css";
    const head = document.querySelector("head") || document.createElement("head");
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const linkEl = document.createElement("link");
      linkEl.setAttribute("rel", "stylesheet");
      linkEl.setAttribute("href", cssHref);
      head.appendChild(linkEl);
    }

    // すべての画像要素を処理
    const imgElements = document.querySelectorAll("img");
    let processedImages = 0;

    imgElements.forEach((img) => {
      const originalSrc = img.getAttribute("src");
      // skip absolute URLs, data URIs, HTTP URLs, or already root-relative
      if (!originalSrc || originalSrc.startsWith("http") || originalSrc.startsWith("data:") || originalSrc.startsWith("/") || path.isAbsolute(originalSrc)) {
        return;
      }

      try {
        // 元のマークダウンファイルからの相対パスとして解釈
        const absoluteImagePath = path.resolve(originalFileDir, originalSrc);
        if (fs.existsSync(absoluteImagePath)) {
          // プロジェクトルートからの相対パスを生成
          let rel = path.relative(workspaceRoot, absoluteImagePath).replace(/\\/g, "/");
          // 非ASCII文字をエンコード
          rel = rel
            .split("/")
            .map((p) => (/[^\x00-\x7F]/.test(p) ? encodeURIComponent(p) : p))
            .join("/");
          // BASE_PATH対応
          const basePath = getBasePath();
          img.setAttribute("src", basePath + "/" + rel);
          processedImages++;
        } else {
          console.log(`  ⚠️ Marp画像が見つかりません: ${originalSrc}`);
          // プレースホルダー画像を使用
          img.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
          img.setAttribute("alt", `画像が見つかりません: ${originalSrc}`);
        }
      } catch (err) {
        console.log(`  ⚠️ Marp画像パス処理エラー: ${originalSrc} - ${err.message}`);
      }
    });

    if (imgElements.length > 0) {
      console.log(`  🖼 Marp画像処理: ${processedImages}/${imgElements.length}個`);
    }

    // 修正されたHTMLを書き戻し
    const fixedHtmlContent = dom.serialize();
    await fs.promises.writeFile(htmlFilePath, fixedHtmlContent);
  } catch (err) {
    console.log(`  ⚠️ HTML画像パス修正エラー: ${err.message}`);
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

    // 画像リンクを処理
    content = processImageLinks(content, filePath);

    // <image>タグを<img>タグに置換
    content = replaceImageTags(content); // バックアップを作成（デバッグ目的）
    const backupFilePath = `${filePath}.backup`;
    try {
      await fs.promises.writeFile(backupFilePath, await fs.promises.readFile(filePath, "utf-8"));
    } catch (backupErr) {
      // 無視
    }

    // 処理済みの内容を一時ファイルに書き込み
    const tempFilePath = `${filePath}.temp.md`;
    await fs.promises.writeFile(tempFilePath, content);

    const marpStylePath = path.resolve("marp_style.css");
    const styleOption = fs.existsSync(marpStylePath) ? `--theme-set "${marpStylePath}"` : "";

    const absoluteTempFilePath = path.resolve(tempFilePath);
    const absoluteHtmlOutput = path.resolve(outputHtmlPath);

    try {
      console.log(`  🔄 HTML変換中: ${path.basename(filePath)}`);
      const htmlCmd = `npx @marp-team/marp-cli@latest "${absoluteTempFilePath}" -o "${absoluteHtmlOutput}" --html --allow-local-files --browser chrome --no-stdin ${styleOption}`;
      await Promise.race([exec(htmlCmd, { timeout: 60000, maxBuffer: 1024 * 1024, env: { ...process.env, DISPLAY: ":99" } }), new Promise((_, reject) => setTimeout(() => reject(new Error("Marp HTML conversion timeout")), 60000))]);

      // HTML生成後に画像パスを修正
      await fixMarpHtmlImagePaths(absoluteHtmlOutput, filePath);

      console.log(`  ✅ HTML完了: ${path.basename(outputHtmlPath)}`);

      const absolutePdfOutput = path.resolve(outputPdfPath);
      console.log(`  🔄 PDF変換中: ${path.basename(filePath)}`);
      const pdfCmd = `npx @marp-team/marp-cli@latest "${absoluteTempFilePath}" -o "${absolutePdfOutput}" --allow-local-files --browser chrome --no-stdin ${styleOption}`;
      try {
        await Promise.race([exec(pdfCmd, { timeout: 60000, maxBuffer: 1024 * 1024, env: { ...process.env, DISPLAY: ":99" } }), new Promise((_, reject) => setTimeout(() => reject(new Error("Marp PDF conversion timeout")), 60000))]);
        console.log(`  ✅ PDF完了: ${path.basename(outputPdfPath)}`);
      } catch (pdfError) {
        console.error(`  ❌ PDF生成エラー: ${pdfError.message}`);
      }
    } finally {
      // 一時ファイルを削除
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // 無視
      }

      // 10分以上経過したバックアップファイルは削除
      try {
        const stats = fs.statSync(backupFilePath);
        const now = new Date();
        const fileTime = new Date(stats.mtime);
        if (now - fileTime > 10 * 60 * 1000) {
          // 10分以上経過
          fs.unlinkSync(backupFilePath);
        }
      } catch (e) {
        // バックアップファイルがなければ無視
      }
    }

    updateCache(filePath, cache);
    return { html: outputHtmlPath, pdf: fs.existsSync(outputPdfPath) ? outputPdfPath : null };
  } catch (error) {
    console.error(`Error processing Marp file ${filePath}:`, error.message);
    return { html: null, pdf: null };
  }
}

module.exports = { processMarpFile };
