const util = require("util");
const exec = util.promisify(require("child_process").exec);

// PDF変換が可能かチェックする関数
async function checkPdfSupport() {
  try {
    await exec("wkhtmltopdf --version", { timeout: 5000 });
    return true;
  } catch (error) {
    console.log("⚠ wkhtmltopdf not available - PDF conversion will be skipped");
    return false;
  }
}

// Marp CLIが利用可能かチェックする関数
async function checkMarpSupport() {
  try {
    await exec("npx @marp-team/marp-cli@latest --version", { timeout: 10000 });
    return true;
  } catch (error) {
    console.log("⚠ Marp CLI not available - Processing as regular markdown");
    return false;
  }
}

// NPMパッケージの依存関係チェック
async function checkNpmDependencies() {
  const requiredPackages = ["marked", "@marp-team/marp-cli"];
  const missingPackages = [];

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
    } catch (error) {
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    console.log(`Installing missing packages: ${missingPackages.join(", ")}`);
    try {
      await exec(`npm install ${missingPackages.join(" ")}`, { timeout: 60000 });
    } catch (error) {
      console.error("❌ Failed to install missing packages:", error.message);
      return false;
    }
  }
  return true;
}

module.exports = { checkPdfSupport, checkMarpSupport, checkNpmDependencies };
