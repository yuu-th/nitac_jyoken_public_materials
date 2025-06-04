const fs = require("fs");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

// ディレクトリ構造を再帰的に読み取る関数
async function getFileStructure(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (dirent.name === "output" || dirent.name === ".git" || dirent.name === ".github" || dirent.name === "node_modules") {
          return null; // 除外するディレクトリ
        }
        return { name: dirent.name, type: "directory", children: await getFileStructure(res) };
      } else {
        if (dirent.name.endsWith(".md")) {
          // Marpスライドかどうかを判定（簡易的な判定）
          const content = await fs.promises.readFile(res, "utf-8");
          const isMarp = content.includes("marp: true") || content.includes("marp: 'true'");
          return { name: dirent.name, path: res, type: isMarp ? "marp" : "regular" };
        }
        return null; // Markdownファイル以外は無視
      }
    })
  );
  return files
    .filter((file) => file !== null)
    .sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });
}

// HTMLおよびPDF出力ディレクトリを作成する関数
function ensureOutputDirs() {
  const dirs = ["output", "output/html", "output/pdf", "output/marp", "output/marp/html", "output/marp/pdf"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 通常のMarkdownファイルをHTMLとPDFに変換する関数
async function processRegularFile(filePath, relativePath) {
  const fileName = path.basename(filePath, ".md");
  const outputHtmlPath = path.join("output/html", relativePath, `${fileName}.html`);
  const outputPdfPath = path.join("output/pdf", relativePath, `${fileName}.pdf`);

  fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputPdfPath), { recursive: true });

  try {
    // HTML変換 (markedを使用)
    const markdownContent = await fs.promises.readFile(filePath, "utf-8");
    const { marked } = await import("marked"); // markedを動的にインポート
    const htmlContent = marked(markdownContent);
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileName}</title>
        <link rel="stylesheet" href="${path.relative(path.dirname(outputHtmlPath), "output/html/style.css")}">
      </head>
      <body>
        <div class="markdown-body">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;
    await fs.promises.writeFile(outputHtmlPath, fullHtml);
    console.log(`Generated HTML: ${outputHtmlPath}`);

    // PDF変換 (wkhtmltopdfを使用)
    await exec(`wkhtmltopdf "${outputHtmlPath}" "${outputPdfPath}"`);
    console.log(`Generated PDF: ${outputPdfPath}`);

    return { html: outputHtmlPath, pdf: outputPdfPath };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { html: null, pdf: null };
  }
}

// MarpスライドをHTMLとPDFに変換する関数
async function processMarpFile(filePath, relativePath) {
  const fileName = path.basename(filePath, ".md");
  const outputHtmlPath = path.join("output/marp/html", relativePath, `${fileName}.html`);
  const outputPdfPath = path.join("output/marp/pdf", relativePath, `${fileName}.pdf`);

  fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputPdfPath), { recursive: true });

  try {
    // Marp CLIを使用してHTMLとPDFに変換
    await exec(`npx @marp-team/marp-cli@latest "${filePath}" -o "${outputHtmlPath}" --html --allow-local-files --theme-set marp_style.css`);
    console.log(`Generated Marp HTML: ${outputHtmlPath}`);
    await exec(`npx @marp-team/marp-cli@latest "${filePath}" -o "${outputPdfPath}" --allow-local-files --theme-set marp_style.css`);
    console.log(`Generated Marp PDF: ${outputPdfPath}`);
    return { html: outputHtmlPath, pdf: outputPdfPath };
  } catch (error) {
    console.error(`Error processing Marp file ${filePath}:`, error);
    return { html: null, pdf: null };
  }
}

// ファイルを再帰的に処理する関数
async function processFilesRecursive(structure, currentPath = "") {
  let htmlFiles = [];
  let pdfFiles = [];
  let marpHtmlFiles = [];
  let marpPdfFiles = [];

  for (const item of structure) {
    const itemRelativePath = path.join(currentPath, item.name);
    if (item.type === "directory") {
      const subDir = path.join("output", currentPath, item.name);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      const subFiles = await processFilesRecursive(item.children, path.join(currentPath, item.name));
      htmlFiles = htmlFiles.concat(subFiles.htmlFiles);
      pdfFiles = pdfFiles.concat(subFiles.pdfFiles);
      marpHtmlFiles = marpHtmlFiles.concat(subFiles.marpHtmlFiles);
      marpPdfFiles = marpPdfFiles.concat(subFiles.marpPdfFiles);
    } else if (item.type === "regular") {
      const relativeFilePath = path.relative(".", path.dirname(item.path));
      const result = await processRegularFile(item.path, relativeFilePath);
      if (result.html) htmlFiles.push({ name: path.basename(result.html, ".html"), path: result.html, originalPath: item.path });
      if (result.pdf) pdfFiles.push({ name: path.basename(result.pdf, ".pdf"), path: result.pdf, originalPath: item.path });
    } else if (item.type === "marp") {
      const relativeFilePath = path.relative(".", path.dirname(item.path));
      const result = await processMarpFile(item.path, relativeFilePath);
      if (result.html) marpHtmlFiles.push({ name: path.basename(result.html, ".html"), path: result.html, originalPath: item.path });
      if (result.pdf) marpPdfFiles.push({ name: path.basename(result.pdf, ".pdf"), path: result.pdf, originalPath: item.path });
    }
  }
  return { htmlFiles, pdfFiles, marpHtmlFiles, marpPdfFiles };
}

// index.htmlを生成する関数
function generateIndexHtml(allFiles) {
  const { htmlFiles, pdfFiles, marpHtmlFiles, marpPdfFiles } = allFiles;

  const createLink = (file, type, isMarp = false) => {
    const basePath = isMarp ? "marp/" : "";
    const relativePath = path.relative("output", file.path).replace(/\\\\/g, "/");
    return `<a href="${relativePath}" class="action-btn btn-${type}" target="_blank"><i class="fas fa-file-${type === "html" ? "code" : "pdf"}"></i> ${type.toUpperCase()}</a>`;
  };

  const createFileCard = (file, isMarp = false) => {
    const fileName = file.name;
    const originalFilePath = path.relative(".", file.originalPath).replace(/\\\\/g, "/");
    const htmlLink = createLink(file, "html", isMarp);
    const pdfFile = (isMarp ? marpPdfFiles : pdfFiles).find((p) => p.name === fileName);
    const pdfLink = pdfFile ? createLink(pdfFile, "pdf", isMarp) : "";
    const marpTag = isMarp ? '<span class="tag"><i class="fas fa-star"></i> Marp</span>' : "";

    return `
      <div class="file-card fade-in" data-name="${fileName.toLowerCase()}" data-category="${isMarp ? "marp" : "regular"}">
        <div class="file-info">
          <h3 class="file-name">
            <i class="fas ${isMarp ? "fa-chalkboard-teacher" : "fa-file-alt"} file-icon"></i>
            ${marpTag}${fileName}
          </h3>
          <p class="file-path">${originalFilePath}</p>
        </div>
        <div class="file-actions">
          ${htmlLink}
          ${pdfLink}
        </div>
      </div>
    `;
  };

  const indexHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ドキュメント一覧 - NITAC情報研究部</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    :root {
      --primary-color: #667eea;
      --secondary-color: #764ba2;
      --accent-color: #6a11cb;
      --bg-light: #f8f9fa;
      --bg-dark: #1a202c;
      --card-light: #ffffff;
      --card-dark: #2d3748;
      --text-light: #2d3748;
      --text-dark: #e2e8f0;
      --text-muted-light: #6c757d;
      --text-muted-dark: #a0aec0;
      --border-light: #dee2e6;
      --border-dark: #4a5568;
      --shadow-light: 0 5px 15px rgba(0, 0, 0, 0.08);
      --shadow-dark: 0 5px 15px rgba(0, 0, 0, 0.3);
      --success-color: #38a169;
      --info-color: #3182ce;
      --warning-color: #dd6b20;
      --error-color: #e53e3e;
      --gradient-primary: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      --gradient-accent: linear-gradient(135deg, var(--accent-color), var(--primary-color));
    }

    [data-theme="dark"] {
      --bg-color: var(--bg-dark);
      --card-color: var(--card-dark);
      --text-color: var(--text-dark);
      --text-muted: var(--text-muted-dark);
      --border-color: var(--border-dark);
      --shadow: var(--shadow-dark);
    }

    [data-theme="light"] {
      --bg-color: var(--bg-light);
      --card-color: var(--card-light);
      --text-color: var(--text-light);
      --text-muted: var(--text-muted-light);
      --border-color: var(--border-light);
      --shadow: var(--shadow-light);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", "Meiryo", "メイリオ", "MS PGothic", "MS Pゴシック", sans-serif;
      line-height: 1.6;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px 0;
      border-bottom: 1px solid var(--border-color);
      position: relative;
    }
    
    .header::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 80px;
        height: 5px;
        background: var(--gradient-primary);
        border-radius: 2px;
    }

    .main-title {
      font-size: 2.8rem;
      font-weight: 700;
      margin-bottom: 10px;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--text-muted);
      font-weight: 300;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      gap: 20px;
      flex-wrap: wrap;
    }

    .search-container {
      position: relative;
      flex: 1;
      min-width: 300px;
    }

    .search-box {
      width: 100%;
      padding: 15px 50px 15px 20px;
      border: 2px solid var(--border-color);
      border-radius: 25px;
      background-color: var(--card-color);
      color: var(--text-color);
      font-size: 16px;
      transition: all 0.3s ease;
      box-shadow: var(--shadow);
    }

    .search-box:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .search-icon {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }

    .theme-toggle {
      background: var(--gradient-primary);
      border: none;
      border-radius: 25px;
      padding: 12px 20px;
      color: white;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      box-shadow: var(--shadow);
    }

    .theme-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: var(--card-color);
      padding: 25px;
      border-radius: 15px;
      box-shadow: var(--shadow);
      text-align: center;
      transition: all 0.3s ease;
      border: 1px solid var(--border-color);
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    [data-theme="dark"] .stat-card:hover {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 5px;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .section {
      margin-bottom: 60px;
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      gap: 15px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 15px;
    }

    .section-title {
      font-size: 2rem;
      font-weight: 600;
      color: var(--text-color);
      position: relative;
    }
    
    .section-title::after {
        content: '';
        position: absolute;
        bottom: -17px; /* Adjust based on padding-bottom of .section-header */
        left: 0;
        width: 60px;
        height: 4px;
        background: var(--gradient-accent);
        border-radius: 2px;
    }

    .section-icon {
      width: 50px;
      height: 50px;
      background: var(--gradient-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* Adjusted minmax for responsiveness */
      gap: 20px;
    }

    .file-card {
      background: var(--card-color);
      border-radius: 15px;
      padding: 25px;
      box-shadow: var(--shadow);
      transition: all 0.3s ease;
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    
    .file-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--gradient-primary);
        transform: scaleX(0);
        transition: transform 0.4s ease;
        transform-origin: left;
    }

    .file-card:hover::before {
        transform: scaleX(1);
    }

    .file-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.1);
    }
    
    [data-theme="dark"] .file-card:hover {
        box-shadow: 0 15px 40px rgba(0,0,0,0.4);
    }

    .file-info {
      margin-bottom: 20px;
    }

    .file-name {
      font-size: 1.1rem; /* Slightly reduced for better fit */
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 8px;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .file-icon {
      width: 24px;
      height: 24px;
      color: var(--primary-color);
      flex-shrink: 0;
    }

    .file-path {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-family: 'Consolas', 'Monaco', monospace;
      word-break: break-all; /* Prevent long paths from breaking layout */
    }

    .file-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap; /* Allow buttons to wrap on smaller cards */
      margin-top: auto; /* Push actions to the bottom */
    }

    .action-btn {
      padding: 10px 15px; /* Adjusted padding */
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      display: inline-flex; /* Use inline-flex for better alignment */
      align-items: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      color: white; /* Ensure text is white */
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .btn-html {
      background: linear-gradient(135deg, var(--info-color), #60a5fa);
    }

    .btn-pdf {
      background: linear-gradient(135deg, var(--error-color), #f87171);
    }

    .btn-marp {
      background: linear-gradient(135deg, var(--success-color), #34d399);
    }
    
    .tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.8rem;
        padding: 4px 12px;
        border-radius: 20px;
        background: var(--gradient-accent);
        color: white;
        font-weight: 500;
        margin-right: 10px; /* Spacing from file name */
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
      display: none; /* Initially hidden */
    }

    .no-results i {
      font-size: 4rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    .no-results h3 {
        font-size: 1.5rem;
        margin-bottom: 10px;
        color: var(--text-color);
    }

    @media (max-width: 768px) {
      .container {
        padding: 15px;
      }
      .main-title {
        font-size: 2rem;
      }
      .controls {
        flex-direction: column;
        align-items: stretch;
      }
      .search-container {
        min-width: unset;
      }
      .file-grid {
        grid-template-columns: 1fr;
      }
      .stats {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Adjust for smaller screens */
      }
    }

    @media (max-width: 480px) {
      .stats {
        grid-template-columns: 1fr;
      }
      .file-actions {
        flex-direction: column;
      }
      .action-btn {
        width: 100%;
        justify-content: center;
      }
      .file-name {
        font-size: 1rem;
      }
    }

    /* Fade-in animation */
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        /* Animation will be applied via JS to ensure it runs after elements are in DOM */
    }
    
    /* Loading state for initial load or heavy operations */
    body.loading {
        opacity: 0.6;
        pointer-events: none;
    }
  </style>
</head>
<body data-theme="light">
  <div class="container">
    <header class="header">
      <h1 class="main-title">ドキュメント一覧</h1>
      <p class="subtitle">NITAC情報研究部 教材・資料アーカイブ</p>
    </header>

    <div class="controls">
      <div class="search-container">
        <input type="text" class="search-box" placeholder="ファイル名やカテゴリで検索..." id="searchBox">
        <i class="fas fa-search search-icon"></i>
      </div>
      <button class="theme-toggle" id="themeToggle">
        <i class="fas fa-moon"></i>
        <span>ダークモード</span>
      </button>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number" id="totalFilesCount">${htmlFiles.length + marpHtmlFiles.length}</div>
        <div class="stat-label">総ファイル数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="regularFilesCount">${htmlFiles.length}</div>
        <div class="stat-label">通常ドキュメント</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="marpFilesCount">${marpHtmlFiles.length}</div>
        <div class="stat-label">Marpスライド</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="pdfFilesCount">${pdfFiles.length + marpPdfFiles.length}</div>
        <div class="stat-label">PDFファイル</div>
      </div>
    </div>

    <div class="section" id="regularSection" ${htmlFiles.length === 0 ? 'style="display: none;"' : ""}>
      <div class="section-header">
        <div class="section-icon"><i class="fas fa-file-alt"></i></div>
        <h2 class="section-title">通常ドキュメント</h2>
      </div>
      <div class="file-grid" id="regularFilesGrid">
        ${htmlFiles.map((file) => createFileCard(file, false)).join("\n")}
      </div>
    </div>

    <div class="section" id="marpSection" ${marpHtmlFiles.length === 0 ? 'style="display: none;"' : ""}>
      <div class="section-header">
        <div class="section-icon"><i class="fas fa-chalkboard-teacher"></i></div>
        <h2 class="section-title">Marpスライド</h2>
      </div>
      <div class="file-grid" id="marpFilesGrid">
        ${marpHtmlFiles.map((file) => createFileCard(file, true)).join("\n")}
      </div>
    </div>

    <div class="no-results" id="noResults">
      <i class="fas fa-search"></i>
      <h3>検索結果が見つかりません</h3>
      <p>別のキーワードで検索してみてください。</p>
    </div>
  </div>

  <script>
    document.body.classList.add('loading'); // Add loading class initially

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const themeIcon = themeToggle.querySelector('i');
    const themeText = themeToggle.querySelector('span');

    const applyTheme = (theme) => {
      body.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = ' ライトモード';
      } else {
        themeIcon.className = 'fas fa-moon';
        themeText.textContent = ' ダークモード';
      }
    };

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
      const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });

    // Search functionality
    const searchBox = document.getElementById('searchBox');
    const allFileCards = Array.from(document.querySelectorAll('.file-card'));
    const noResultsElement = document.getElementById('noResults');
    const regularSection = document.getElementById('regularSection');
    const marpSection = document.getElementById('marpSection');
    const regularFilesGrid = document.getElementById('regularFilesGrid');
    const marpFilesGrid = document.getElementById('marpFilesGrid');
    
    const totalFilesCountEl = document.getElementById('totalFilesCount');
    const regularFilesCountEl = document.getElementById('regularFilesCount');
    const marpFilesCountEl = document.getElementById('marpFilesCount');
    // PDF count is static based on initial generation, so not updated dynamically by search.

    searchBox.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      let regularVisibleCount = 0;
      let marpVisibleCount = 0;

      allFileCards.forEach(card => {
        const fileName = card.dataset.name;
        const category = card.dataset.category;
        const originalPath = card.querySelector('.file-path').textContent.toLowerCase();
        
        const matchesSearch = fileName.includes(searchTerm) || 
                              category.includes(searchTerm) || 
                              originalPath.includes(searchTerm);

        if (matchesSearch) {
          card.style.display = 'flex'; // Use flex as per .file-card styling
          if (category === 'regular') regularVisibleCount++;
          if (category === 'marp') marpVisibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      regularSection.style.display = regularVisibleCount > 0 ? 'block' : 'none';
      marpSection.style.display = marpVisibleCount > 0 ? 'block' : 'none';
      noResultsElement.style.display = (regularVisibleCount + marpVisibleCount) === 0 ? 'block' : 'none';
      
      // Update displayed counts based on visible cards
      totalFilesCountEl.textContent = regularVisibleCount + marpVisibleCount;
      regularFilesCountEl.textContent = regularVisibleCount;
      marpFilesCountEl.textContent = marpVisibleCount;
    });

    // Intersection Observer for fade-in animation
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          entry.target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    allFileCards.forEach(card => {
      observer.observe(card);
    });
    
    // Remove loading class after a short delay to allow content to render
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.body.classList.remove('loading');
        }, 200); // Adjust delay as needed
    });

  </script>
</body>
</html>
  `;

  fs.writeFileSync("output/index.html", indexHtml);
  console.log("Generated index.html with links to all files in output/index.html");

  // ルートにもコピー（GitHub Pages用）
  fs.copyFileSync("output/index.html", "index.html");
  console.log("Copied index.html to project root.");

  // style.css と marp_style.css を output/html と output/marp/html にコピー
  if (fs.existsSync("style.css")) {
    fs.copyFileSync("style.css", "output/html/style.css");
    console.log("Copied style.css to output/html/");
  }
  if (fs.existsSync("marp_style.css")) {
    fs.copyFileSync("marp_style.css", "output/marp/html/marp_style.css");
    console.log("Copied marp_style.css to output/marp/html/");
  }
}

// メイン実行関数
async function main() {
  console.log("=== Markdown File Conversion Process Started ===");
  ensureOutputDirs();

  try {
    const fileStructure = await getFileStructure("."); // カレントディレクトリから開始
    const allProcessedFiles = await processFilesRecursive(fileStructure);
    generateIndexHtml(allProcessedFiles);

    console.log("=== All Processes Completed Successfully ===");
  } catch (error) {
    console.error("Error during conversion process:", error);
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
