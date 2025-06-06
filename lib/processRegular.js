const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const puppeteer = require("puppeteer");
const { JSDOM } = require("jsdom");

// GitHub Pages対応：ベースパスを取得
function getBasePath() {
  return process.env.BASE_PATH || "";
}

// 日付を日本語形式（YYYY/MM/DD）にフォーマット
function formatJapaneseDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

// HTMLファイル内の<img>srcを絶対file://パスに置き換えるユーティリティ
async function fixRegularHtmlImagePaths(htmlFilePath, originalMdPath) {
  try {
    const html = await fs.promises.readFile(htmlFilePath, "utf-8");
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const imgs = doc.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("http") || src.startsWith("data:") || src.startsWith("file:")) return;
      const absImg = path.resolve(path.dirname(originalMdPath), src);
      const fileUrl = "file://" + absImg.replace(/\\/g, "/");
      img.setAttribute("src", fileUrl);
    });
    await fs.promises.writeFile(htmlFilePath, dom.serialize());
  } catch (e) {
    console.error(`  ⚠️ HTML画像パス修正失敗: ${e.message}`);
  }
}

async function processRegularFile(filePath, relativePath, pdfSupport = false, cache = {}, stats = {}, isFileChanged, updateCache) {
  const workspaceRoot = process.cwd();
  const fileName = path.basename(filePath, ".md");
  const outputHtmlPath = path.join("output/html", relativePath, `${fileName}.html`);
  const outputPdfPath = path.join("output/pdf", relativePath, `${fileName}.pdf`);

  // キャッシュチェック
  if (!isFileChanged(filePath, cache)) {
    stats.skipped = (stats.skipped || 0) + 1;
    return { html: fs.existsSync(outputHtmlPath) ? outputHtmlPath : null, pdf: fs.existsSync(outputPdfPath) ? outputPdfPath : null };
  }

  fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputPdfPath), { recursive: true });
  // style.cssをoutput/htmlにコピー（存在しない場合）
  const outputStylePath = path.join("output/html", "style.css");
  const rootStylePath = "style.css";
  if (fs.existsSync(rootStylePath)) {
    try {
      // 常にコピーして最新版を使用
      fs.copyFileSync(rootStylePath, outputStylePath);
    } catch (styleError) {
      console.log(`  ⚠️ スタイルファイルのコピーに失敗: ${styleError.message}`);
    }
  }
  try {
    const markdownContent = await fs.promises.readFile(filePath, "utf-8");
    const { marked } = await import("marked"); // 画像パスを相対パスから正しいパスに変換するためのカスタムレンダラー
    // Markdownディレクトリからの出力HTML相対パス (posix形式)
    const urlPrefix = "/" + relativePath.replace(/\\/g, "/");
    // ファイルディレクトリを取得（PDF処理でも使用）
    const fileDir = path.dirname(filePath); // HTMLとPDFで異なる画像パス処理を実装するため、現在の出力形式を追跡
    let currentOutputMode = "html"; // 'html' or 'pdf'    // HTML用の画像パスを root-relative URL に変換する関数
    function processImagePathForHtml(href) {
      if (!href || typeof href !== "string") return "";
      // 外部URL/dataスキームはそのまま
      if (/^(?:https?:)?\/\//.test(href) || href.startsWith("data:") || href.startsWith("/")) {
        return href;
      }
      const absolutePath = path.resolve(fileDir, href);
      if (!fs.existsSync(absolutePath)) {
        console.warn(`  ⚠️ 画像が見つかりません: ${absolutePath}`);
        return href;
      } // プロジェクトルートからのパス
      let rel = path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
      rel = rel
        .split("/")
        .map((p) => (/[^\x00-\x7F]/.test(p) ? encodeURIComponent(p) : p))
        .join("/");
      const basePath = getBasePath();
      const result = basePath + "/" + rel;
      return result;
    } // PDF用の画像パスを絶対file://パスに変換する関数
    function processImagePathForPdf(href) {
      if (!href || typeof href !== "string") return "";
      // 外部URL/dataスキームはそのまま
      if (/^(?:https?:)?\/\//.test(href) || href.startsWith("data:") || href.startsWith("file:")) {
        return href;
      }

      let absolutePath;
      if (href.startsWith("/")) {
        // Root-relative パス: プロジェクトルートからの絶対パスに変換
        const relativePath = href.substring(1); // 先頭の"/"を除去
        const decodedPath = decodeURIComponent(relativePath); // URLデコード
        absolutePath = path.resolve(workspaceRoot, decodedPath);
      } else {
        // 相対パス: マークダウンファイルからの相対パスとして解釈
        absolutePath = path.resolve(fileDir, href);
      }

      if (!fs.existsSync(absolutePath)) {
        console.warn(`  ⚠️ PDF用画像が見つかりません: ${absolutePath}`);
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      }

      const fileUrl = `file://${absolutePath.replace(/\\/g, "/")}`;
      return fileUrl;
    } // HTML用のmarkedレンダラー設定
    const htmlRenderer = {
      renderer: {
        image(hrefToken, title, textToken) {
          // marked.js v15では、hrefとtextがオブジェクト形式で渡される
          const href = typeof hrefToken === "string" ? hrefToken : hrefToken.href;
          const text = typeof textToken === "string" ? textToken : textToken ? textToken.text : "";

          const src = processImagePathForHtml(href);
          return `<img src="${src}" alt="${text || ""}"${title ? ` title="${title}"` : ""}>`;
        },
      },
    };

    // PDF用のmarkedレンダラー設定
    const pdfRenderer = {
      renderer: {
        image(hrefToken, title, textToken) {
          // marked.js v15では、hrefとtextがオブジェクト形式で渡される
          const href = typeof hrefToken === "string" ? hrefToken : hrefToken.href;
          const text = typeof textToken === "string" ? textToken : textToken ? textToken.text : "";

          const src = processImagePathForPdf(href);
          return `<img src="${src}" alt="${text || ""}"${title ? ` title="${title}"` : ""}>`;
        },
      },
    };

    // HTML生成
    currentOutputMode = "html";
    marked.use(htmlRenderer);
    const htmlContent = marked(markdownContent);

    // GitHub Pages対応：ベースパス付きのCSS参照
    const basePath = getBasePath();
    const cssHref = basePath + "/style.css";

    const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${fileName}</title>
<link rel="stylesheet" href="${cssHref}">
</head>
<body class="markdown-body">
${htmlContent}
</body>
</html>`;
    await fs.promises.writeFile(outputHtmlPath, fullHtml);
    if (pdfSupport) {
      try {
        if (pdfSupport) {
          console.log(`  📄 PDF生成中: ${path.basename(filePath)}`);
        }

        // PDF生成用のHTMLコンテンツを生成（PDF用レンダラーを使用）
        currentOutputMode = "pdf";
        marked.use(pdfRenderer);
        const pdfHtmlContent = marked(markdownContent);

        const title = fileName;

        // ルートのstyle.cssの内容を取得（存在する場合）
        let rootStyleContent = "";
        const rootStylePath = path.join("output/html", "style.css");
        if (fs.existsSync(rootStylePath)) {
          rootStyleContent = fs.readFileSync(rootStylePath, "utf-8");
        }

        // ブラウザを起動
        const browser = await puppeteer.launch({
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"],
        });
        const page = await browser.newPage(); // 重要なエラーのみログ出力（画像読み込みエラーは無視）
        page.on("console", (msg) => {
          if (msg.type() === "error" && !msg.text().includes("Failed to load resource") && !msg.text().includes("net::ERR_FILE_NOT_FOUND") && !msg.text().includes("image")) {
            console.log(`  ⚠️ ブラウザエラー: ${msg.text()}`);
          }
        }); // PDF向けの強化されたHTMLを作成（ヘッダー/フッターなし）
        const contentHtml = `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
              @font-face {
                font-family: 'IPAGothic';
                src: local('IPAGothic');
              }
              @font-face {
                font-family: 'IPAMincho';
                src: local('IPAMincho');
              }
              @font-face {
                font-family: 'Noto Sans CJK JP';
                src: local('Noto Sans CJK JP');
              }

              /* ルートのスタイルを埋め込み */
              ${rootStyleContent}
              /* デフォルトスタイル */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: "IPAGothic", "Noto Sans CJK JP", sans-serif !important;
                line-height: 1.8;
                /*padding: 0 26px;
                margin: 0;
                width: 100%; */
              }
              
              img {
                max-width: 100%;
                height: auto;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              /* HTMLから抽出したスタイル */
              ${pdfHtmlContent.match(/<style>([\s\S]*?)<\/style>/)?.[1] || ""}
            </style>
          </head>
          <body>
            ${pdfHtmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] || pdfHtmlContent}
          </body>
          </html>
        `;

        // HTML内の<image>タグを<img>タグに置換
        const fixedContentHtml = contentHtml.replace(/<image\s+/g, "<img "); // 一時ファイルに書き込み（DOM操作による画像パス変更は不要）
        const tempHtmlPath = `${outputHtmlPath}.temp.html`;
        fs.writeFileSync(tempHtmlPath, fixedContentHtml);

        try {
          // ファイルをロード
          await page.goto(`file://${path.resolve(tempHtmlPath)}`, {
            waitUntil: "networkidle0",
            timeout: 60000,
          });
        } catch (navError) {
          console.error(`  ⚠️ ページロードエラー: ${navError.message}`);
          throw navError;
        }

        // 画像エラーハンドリング（ログ出力なし）
        await page.evaluate(() => {
          document.querySelectorAll("img").forEach((img) => {
            img.onerror = function () {
              this.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
              this.style.border = "1px dashed red";
              this.style.padding = "10px";
              this.title = "画像読み込みエラー";
              return true;
            };
          });
        });

        // 追加の日本語フォント設定
        await page.evaluateHandle(() => {
          document.querySelectorAll("*").forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.fontFamily) {
              el.style.fontFamily = '"IPAGothic", "Noto Sans CJK JP", ' + style.fontFamily;
            }
          });
        });

        // 現在の日付を日本語形式で取得
        const currentDate = formatJapaneseDate(new Date());

        // PDF生成 - ヘッダーとフッターを設定、左右のマージンを0に
        try {
          await page.pdf({
            path: outputPdfPath,
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            scale: 0.8,

            // ヘッダーテンプレート - タイトルと日付を表示
            headerTemplate: `
              <div style="font-size: 9px; margin-left: 1cm;"> <span class='title'></span></div> <div style="font-size: 9px; margin-left: auto; margin-right: 1cm; ">${currentDate}</div>
            `,
            // フッターテンプレート - ページ番号/総ページ数を表示
            footerTemplate: `
              <div style="font-size: 9px; margin: 0 auto;"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>
            `,

            margin: {
              top: "1cm", // ヘッダー用の余白
              bottom: "1cm", // フッター用の余白
              left: "0", // 左マージンを0に設定
              right: "0", // 右マージンを0に設定
            },
          });
        } catch (pdfError) {
          console.error(`  ❌ PDF generation error: ${pdfError.message}`);
          throw pdfError;
        }

        // 一時ファイル削除
        try {
          fs.unlinkSync(`${outputHtmlPath}.temp.html`);
        } catch (unlinkError) {
          console.log(`  ⚠️ 一時ファイル削除エラー: ${unlinkError.message}`);
        }

        await browser.close(); // PDFが生成されたか確認
        if (fs.existsSync(outputPdfPath) && fs.statSync(outputPdfPath).size > 0) {
          console.log(`  ✅ PDF完了: ${path.basename(outputPdfPath)}`);
        } else {
          throw new Error("PDFファイルが正しく生成されませんでした");
        }
      } catch (error) {
        console.error(`  ❌ Error generating PDF for ${path.relative(".", filePath)}:`, error.message);
      }
    }

    updateCache(filePath, cache);
    return { html: outputHtmlPath, pdf: fs.existsSync(outputPdfPath) ? outputPdfPath : null };
  } catch (error) {
    console.error(`Error processing regular file ${filePath}:`, error.message);
    return { html: null, pdf: null };
  }
}

module.exports = { processRegularFile };
