const fs = require("fs");
const path = require("path");

/**
 * 階層的なディレクトリインデックスページを生成する
 */
class HierarchicalIndexGenerator {
  constructor() {
    this.outputDir = "output";
    this.projectRoot = process.cwd(); // プロジェクトのルートディレクトリ
    this.baseTemplate = this.getBaseTemplate();
  }
  /**
   * すべてのディレクトリのインデックスページを生成
   */
  generateAllIndexes(allFiles) {
    try {
      console.log("🌳 Generating hierarchical directory indexes...");
      console.log("📊 Input files:", {
        htmlFiles: allFiles.htmlFiles?.length || 0,
        pdfFiles: allFiles.pdfFiles?.length || 0,
        marpHtmlFiles: allFiles.marpHtmlFiles?.length || 0,
        marpPdfFiles: allFiles.marpPdfFiles?.length || 0,
      });

      // ファイルをディレクトリ別に整理
      const filesByDirectory = this.organizeFilesByDirectory(allFiles);
      console.log("📁 Organized files by directory:", filesByDirectory.size, "directories");

      // ディレクトリ構造を解析
      const directoryStructure = this.analyzeDirectoryStructure(filesByDirectory);
      console.log("🏗️ Analyzed directory structure:", directoryStructure);

      // 各ディレクトリのインデックスページを生成
      this.generateDirectoryIndexes(directoryStructure, filesByDirectory);

      console.log("✅ All directory indexes generated");
    } catch (error) {
      console.error("❌ Error generating hierarchical indexes:", error);
      throw error;
    }
  }

  /**
   * ファイルをディレクトリ別に整理
   */
  organizeFilesByDirectory(allFiles) {
    const { htmlFiles, pdfFiles, marpHtmlFiles, marpPdfFiles } = allFiles;
    const filesByDirectory = new Map();

    // すべてのファイルを処理
    [...htmlFiles, ...marpHtmlFiles].forEach((file) => {
      const dirPath = this.getDirectoryFromFilePath(file.originalPath);

      if (!filesByDirectory.has(dirPath)) {
        filesByDirectory.set(dirPath, {
          htmlFiles: [],
          pdfFiles: [],
          marpHtmlFiles: [],
          marpPdfFiles: [],
        });
      }

      const directory = filesByDirectory.get(dirPath);

      if (marpHtmlFiles.includes(file)) {
        directory.marpHtmlFiles.push(file);
        // 対応するPDFファイルを検索
        const pdfFile = marpPdfFiles.find((p) => p.name === file.name);
        if (pdfFile) {
          directory.marpPdfFiles.push(pdfFile);
        }
      } else {
        directory.htmlFiles.push(file);
        // 対応するPDFファイルを検索
        const pdfFile = pdfFiles.find((p) => p.name === file.name);
        if (pdfFile) {
          directory.pdfFiles.push(pdfFile);
        }
      }
    });

    return filesByDirectory;
  }
  /**
   * ファイルパスからディレクトリパスを取得
   */
  getDirectoryFromFilePath(filePath) {
    // 絶対パスを相対パスに変換
    const relativePath = path.relative(this.projectRoot, filePath);
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const dirPath = path.dirname(normalizedPath).replace(/\\/g, "/");
    return dirPath === "." ? "" : dirPath;
  }
  /**
   * ディレクトリ構造を解析
   */
  analyzeDirectoryStructure(filesByDirectory) {
    const directories = Array.from(filesByDirectory.keys());
    const structure = new Map();

    // すべてのディレクトリとその親ディレクトリを追加
    const allDirectories = new Set();

    directories.forEach((dir) => {
      allDirectories.add(dir);
      // 親ディレクトリも追加
      let currentDir = dir;
      while (currentDir && currentDir !== "") {
        const parentDir = path.dirname(currentDir).replace(/\\/g, "/");
        if (parentDir === "." || parentDir === currentDir) break;
        allDirectories.add(parentDir);
        currentDir = parentDir;
      }
    });

    // ルートディレクトリも追加
    allDirectories.add("");

    // 構造を分析
    allDirectories.forEach((dir) => {
      const children = Array.from(allDirectories)
        .filter((d) => d !== dir && this.isDirectChild(dir, d))
        .sort();

      structure.set(dir, {
        children,
        hasFiles: filesByDirectory.has(dir),
      });
    });

    return structure;
  }

  /**
   * 直接の子ディレクトリかどうかを判定
   */
  isDirectChild(parent, child) {
    if (parent === "") {
      // ルートの直接の子
      return !child.includes("/");
    }

    if (!child.startsWith(parent + "/")) {
      return false;
    }

    const remainder = child.substring(parent.length + 1);
    return !remainder.includes("/");
  }

  /**
   * 各ディレクトリのインデックスページを生成
   */
  generateDirectoryIndexes(directoryStructure, filesByDirectory) {
    for (const [dirPath, info] of directoryStructure) {
      this.generateSingleDirectoryIndex(dirPath, info, directoryStructure, filesByDirectory);
    }
  }
  /**
   * 単一ディレクトリのインデックスページを生成
   */
  generateSingleDirectoryIndex(dirPath, info, directoryStructure, filesByDirectory) {
    // outputディレクトリからの相対パスを計算
    const outputPath = dirPath ? path.join(this.outputDir, dirPath, "index.html") : path.join(this.outputDir, "index.html");

    const outputDirPath = path.dirname(outputPath);

    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    // ページ内容を生成
    const pageContent = this.generatePageContent(dirPath, info, directoryStructure, filesByDirectory);

    // HTMLファイルを書き込み
    fs.writeFileSync(outputPath, pageContent);
    console.log(`📄 Generated: ${outputPath}`);
  }
  /**
   * ページ内容を生成
   */
  generatePageContent(dirPath, info, directoryStructure, filesByDirectory) {
    const displayPath = dirPath || "ルート";
    const breadcrumb = this.generateBreadcrumb(dirPath);
    const navigation = this.generateNavigation(dirPath, info, directoryStructure, filesByDirectory);
    const directFiles = this.generateDirectFiles(dirPath, filesByDirectory);
    const allDescendantFiles = this.generateAllDescendantFiles(dirPath, directoryStructure, filesByDirectory);

    return this.baseTemplate.replace("{{TITLE}}", `${displayPath} - ドキュメント一覧`).replace("{{BREADCRUMB}}", breadcrumb).replace("{{NAVIGATION}}", navigation).replace("{{DIRECT_FILES}}", directFiles).replace("{{ALL_DESCENDANT_FILES}}", allDescendantFiles);
  }
  /**
   * ブレッドクラムナビゲーションを生成
   */
  generateBreadcrumb(dirPath) {
    if (!dirPath) {
      return '<span class="breadcrumb-current">ルート</span>';
    }

    const parts = dirPath.split("/");
    // ルートへのパスを正しく計算（現在のディレクトリから相対的に）
    const rootPath = "../".repeat(parts.length) + "index.html";
    let breadcrumb = `<a href="${rootPath}" class="breadcrumb-link">ルート</a>`;

    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      currentPath += (i > 0 ? "/" : "") + parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        breadcrumb += ` <span class="breadcrumb-separator">&gt;</span> <span class="breadcrumb-current">${parts[i]}</span>`;
      } else {
        // 各中間ディレクトリへのパスを計算
        const stepsBack = parts.length - i - 1;
        const relativePath = stepsBack > 0 ? "../".repeat(stepsBack) + "index.html" : "index.html";
        breadcrumb += ` <span class="breadcrumb-separator">&gt;</span> <a href="${relativePath}" class="breadcrumb-link">${parts[i]}</a>`;
      }
    }

    return breadcrumb;
  }
  /**
   * サブディレクトリナビゲーションを生成
   */
  generateNavigation(dirPath, info, directoryStructure, filesByDirectory) {
    if (!info.children || info.children.length === 0) {
      return "";
    }

    let navigation = '<div class="subdirectory-nav"><h3><i class="fas fa-folder"></i> サブディレクトリ</h3><div class="subdirectory-grid">';

    info.children.forEach((childDir) => {
      const childName = path.basename(childDir);
      const childInfo = directoryStructure.get(childDir);
      const hasFiles = childInfo && childInfo.hasFiles;
      const fileCount = this.countFilesInDirectory(childDir, directoryStructure, filesByDirectory);

      navigation += `
        <a href="${childName}/index.html" class="subdirectory-card">
          <div class="subdirectory-icon">
            <i class="fas fa-folder${hasFiles ? "-open" : ""}"></i>
          </div>
          <div class="subdirectory-info">
            <h4>${childName}</h4>
            <p>${fileCount > 0 ? fileCount + " ファイル" : "空"}</p>
          </div>
        </a>
      `;
    });

    navigation += "</div></div>";
    return navigation;
  }
  /**
   * 直下のファイル一覧を生成
   */
  generateDirectFiles(dirPath, filesByDirectory) {
    const files = filesByDirectory.get(dirPath);
    if (!files || (files.htmlFiles.length === 0 && files.marpHtmlFiles.length === 0)) {
      return "";
    }

    let content = '<div class="files-section"><h3><i class="fas fa-file-alt"></i> このディレクトリのファイル</h3><div class="file-grid">';

    // 通常のHTMLファイル
    files.htmlFiles.forEach((file) => {
      content += this.createFileCard(file, files.pdfFiles, false, "", dirPath);
    });

    // Marpファイル
    files.marpHtmlFiles.forEach((file) => {
      content += this.createFileCard(file, files.marpPdfFiles, true, "", dirPath);
    });

    content += "</div></div>";
    return content;
  }
  /**
   * すべての子孫ファイル一覧を生成
   */
  generateAllDescendantFiles(dirPath, directoryStructure, filesByDirectory) {
    const allFiles = this.getAllDescendantFiles(dirPath, directoryStructure, filesByDirectory);

    if (allFiles.length === 0) {
      return "";
    }

    let content = '<div class="files-section"><h3><i class="fas fa-sitemap"></i> すべての配下ファイル</h3><div class="file-grid">';

    allFiles.forEach((fileInfo) => {
      content += this.createFileCard(fileInfo.file, fileInfo.pdfFiles, fileInfo.isMarp, fileInfo.relativePath, dirPath);
    });

    content += "</div></div>";
    return content;
  }
  /**
   * すべての子孫ファイルを取得
   */
  getAllDescendantFiles(dirPath, directoryStructure, filesByDirectory) {
    const allFiles = [];

    // 再帰的にすべての子ディレクトリのファイルを収集
    const collectFiles = (currentDir) => {
      const info = directoryStructure.get(currentDir);
      if (!info) return;

      // 子ディレクトリのファイルを収集
      info.children.forEach((childDir) => {
        const files = filesByDirectory.get(childDir);
        if (files) {
          const relativePath = dirPath ? childDir.substring(dirPath.length + 1) : childDir;

          files.htmlFiles.forEach((file) => {
            allFiles.push({
              file,
              pdfFiles: files.pdfFiles || [],
              isMarp: false,
              relativePath,
            });
          });

          files.marpHtmlFiles.forEach((file) => {
            allFiles.push({
              file,
              pdfFiles: files.marpPdfFiles || [],
              isMarp: true,
              relativePath,
            });
          });
        }

        // 再帰的に子ディレクトリを処理
        collectFiles(childDir);
      });
    };
    collectFiles(dirPath);
    return allFiles;
  }

  /**
   * ファイルカードのHTMLを生成
   */
  createFileCard(file, pdfFiles, isMarp, relativePath = "", currentDirPath = "") {
    const fileName = file.name;
    const originalFilePath = path.relative(this.projectRoot, file.originalPath).replace(/\\/g, "/");
    const displayPath = relativePath ? `${relativePath}/${originalFilePath}` : originalFilePath;

    const htmlLink = this.createLink(file, "html", isMarp, currentDirPath);

    // PDFファイルを探す：同じoriginalPathを持つファイルを優先
    let pdfFile = null;
    if (pdfFiles && pdfFiles.length > 0) {
      pdfFile = pdfFiles.find((p) => {
        // originalPathが一致するものを優先
        if (p.originalPath && file.originalPath && p.originalPath === file.originalPath) return true;
        // それ以外はnameとディレクトリで比較
        const pdfDir = path.dirname(p.path);
        const htmlDir = path.dirname(file.path);
        const pdfDirNormalized = pdfDir.replace(/^output[\/\\](marp[\/\\])?pdf/, "");
        const htmlDirNormalized = htmlDir.replace(/^output[\/\\](marp[\/\\])?html/, "");
        return p.name === fileName && pdfDirNormalized === htmlDirNormalized;
      });
    }

    const pdfLink = pdfFile ? this.createLink(pdfFile, "pdf", isMarp, currentDirPath) : "";
    const marpTag = isMarp ? '<span class="tag marp-tag"><i class="fas fa-star"></i> Marp</span>' : "";
    const pathTag = relativePath ? `<span class="path-tag"><i class="fas fa-folder"></i> ${relativePath}</span>` : "";

    return `
      <div class="file-card fade-in" data-name="${fileName.toLowerCase()}" data-category="${isMarp ? "marp" : "regular"}">
        <div class="file-info">
          <h4 class="file-name">
            <i class="fas ${isMarp ? "fa-chalkboard-teacher" : "fa-file-alt"} file-icon"></i>
            ${marpTag}${fileName}
          </h4>
          <p class="file-path">${displayPath}</p>
          ${pathTag}
        </div>
        <div class="file-actions">
          ${htmlLink}
          ${pdfLink}
        </div>      </div>
    `;
  }
  /**
   * リンクHTMLを生成
   */
  createLink(file, type, isMarp = false, currentDirPath = "") {
    // ファイルの実際のパスを取得
    const actualFilePath = file.path; // outputディレクトリ内での実際のパスを計算
    let outputPath;
    if (type === "html") {
      if (isMarp) {
        // Marpファイルの場合: output/marp/html/[directory]/[filename].html
        // 'marp/html' パスの重複を修正（例: marp/html/marp/html を marp/html に）
        outputPath = actualFilePath.replace(/marp\/html\/marp\/html/, "marp/html");
      } else {
        // 通常ファイルの場合: output/html/[directory]/[filename].html
        outputPath = actualFilePath;
      }
    } else {
      // PDF の場合
      if (isMarp) {
        // MarpのPDF: output/marp/pdf/[directory]/[filename].pdf
        // パス修正を適用してから置換
        const normalizedPath = actualFilePath.replace(/marp\/html\/marp\/html/, "marp/html");
        outputPath = normalizedPath.replace(/marp\/html/, "marp/pdf").replace(/\.html$/, ".pdf");
      } else {
        // 通常のPDF: output/pdf/[directory]/[filename].pdf
        // html/を正確にpdf/に置換
        outputPath = actualFilePath.replace(/\/html\//, "/pdf/").replace(/\.html$/, ".pdf");
      }
    }

    // 現在のディレクトリからoutputディレクトリルートへの相対パスを計算
    let relativePath;
    if (currentDirPath && currentDirPath !== "") {
      const depth = currentDirPath.split("/").length;
      // "output/"プレフィックスは削除して相対パス処理
      const cleanPath = outputPath.replace(/^output[\/\\]/, "");
      relativePath = "../".repeat(depth) + cleanPath.replace(/\\/g, "/");
    } else {
      // "output/"プレフィックスは削除
      relativePath = outputPath.replace(/^output[\/\\]/, "").replace(/\\/g, "/");
    }

    return `<a href="${relativePath}" class="action-btn btn-${type}" target="_blank"><i class="fas fa-file-${type === "html" ? "code" : "pdf"}"></i> ${type.toUpperCase()}</a>`;
  }
  /**
   * ディレクトリ内のファイル数をカウント（子孫ファイルも含む）
   */
  countFilesInDirectory(dirPath, directoryStructure, filesByDirectory) {
    let count = 0;

    // 直接ファイルをカウント
    const directFiles = filesByDirectory.get(dirPath);
    if (directFiles) {
      count += directFiles.htmlFiles.length + directFiles.marpHtmlFiles.length;
    }

    // 子ディレクトリのファイルも再帰的にカウント
    const dirInfo = directoryStructure.get(dirPath);
    if (dirInfo && dirInfo.children) {
      dirInfo.children.forEach((childDir) => {
        count += this.countFilesInDirectory(childDir, directoryStructure, filesByDirectory);
      });
    }

    return count;
  }

  /**
   * ベーステンプレートを取得
   */
  getBaseTemplate() {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    :root {
      --primary-color: #2563eb;
      --secondary-color: #1e40af;
      --accent-color: #3b82f6;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --danger-color: #ef4444;
      --dark-color: #1f2937;
      --light-color: #f8fafc;
      --border-color: #e5e7eb;
      --text-primary: #1f2937;
      --text-secondary: #6b7280;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans JP', sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background-color: var(--light-color);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    /* ヘッダー */
    .header {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 2rem 0;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-md);
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-align: center;
    }

    /* ブレッドクラム */
    .breadcrumb {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: var(--shadow-sm);
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }

    .breadcrumb-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .breadcrumb-separator {
      margin: 0 0.5rem;
      color: var(--text-secondary);
    }

    .breadcrumb-current {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* サブディレクトリナビゲーション */
    .subdirectory-nav {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      margin-bottom: 2rem;
    }

    .subdirectory-nav h3 {
      color: var(--text-primary);
      margin-bottom: 1rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .subdirectory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .subdirectory-card {
      display: flex;
      align-items: center;
      padding: 1rem;
      background: var(--light-color);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .subdirectory-card:hover {
      border-color: var(--primary-color);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .subdirectory-icon {
      font-size: 2rem;
      color: var(--primary-color);
      margin-right: 1rem;
    }

    .subdirectory-info h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .subdirectory-info p {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    /* ファイルセクション */
    .files-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      margin-bottom: 2rem;
    }

    .files-section h3 {
      color: var(--text-primary);
      margin-bottom: 1rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .file-card {
      background: var(--light-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.2s ease;
    }

    .file-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .file-info {
      margin-bottom: 1rem;
    }

    .file-name {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .file-icon {
      color: var(--primary-color);
    }

    .file-path {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-right: 0.5rem;
    }

    .marp-tag {
      background: #fef3c7;
      color: #92400e;
    }

    .path-tag {
      background: #dbeafe;
      color: #1e40af;
    }

    .file-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .btn-html {
      background: var(--primary-color);
      color: white;
    }

    .btn-html:hover {
      background: var(--secondary-color);
    }

    .btn-pdf {
      background: var(--danger-color);
      color: white;
    }

    .btn-pdf:hover {
      background: #dc2626;
    }

    /* レスポンシブ */
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .header h1 {
        font-size: 2rem;
      }

      .subdirectory-grid {
        grid-template-columns: 1fr;
      }

      .file-grid {
        grid-template-columns: 1fr;
      }

      .file-actions {
        flex-direction: column;
      }
    }

    .fade-in {
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="container">
      <h1><i class="fas fa-folder-open"></i> ドキュメント一覧</h1>
    </div>
  </header>

  <div class="container">
    <nav class="breadcrumb">
      {{BREADCRUMB}}
    </nav>

    {{NAVIGATION}}

    {{DIRECT_FILES}}

    {{ALL_DESCENDANT_FILES}}
  </div>
</body>
</html>`;
  }
}

module.exports = { HierarchicalIndexGenerator };
