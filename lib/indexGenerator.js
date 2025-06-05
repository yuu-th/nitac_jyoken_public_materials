const fs = require("fs");
const path = require("path");

function generateIndexHtml(allFiles) {
  const { htmlFiles, pdfFiles, marpHtmlFiles, marpPdfFiles } = allFiles;

  const createLink = (file, type, isMarp = false) => {
    const relativePath = path.relative("output", file.path).replace(/\\/g, "/");
    return `<a href="${relativePath}" class="action-btn btn-${type}" target="_blank"><i class="fas fa-file-${type === "html" ? "code" : "pdf"}"></i> ${type.toUpperCase()}</a>`;
  };

  const createFileCard = (file, isMarp = false) => {
    const fileName = file.name;
    const originalFilePath = path.relative(".", file.originalPath).replace(/\\/g, "/");
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
    /* ...styles... */
  </style>
</head>
<body data-theme="light">
  <!-- ...body content... -->
</body>
</html>
  `;

  fs.writeFileSync("output/index.html", indexHtml);
  fs.copyFileSync("output/index.html", "index.html");
}

module.exports = { generateIndexHtml };
