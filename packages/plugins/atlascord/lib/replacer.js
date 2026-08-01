const path = require("path");
const languagesData = require("./languages.json");

const FAKE_EMPTY = "";

function getLanguageKey(language, filePath) {
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (languagesData.known_extensions[ext]) {
      return languagesData.known_extensions[ext];
    }
    const base = path.basename(filePath);
    if (languagesData.known_extensions[base]) {
      return languagesData.known_extensions[base];
    }
  }
  if (language) {
    const normalized = language.toLowerCase();
    const found = languagesData.known_languages.find((l) => l.language === normalized);
    if (found) return found.image;
  }
  return "code";
}

function getArticle(str) {
  if (!str) return "a";
  const first = str.charAt(0).toLowerCase();
  return ["a", "e", "i", "o", "u"].includes(first) ? "an" : "a";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getWorkspaceName(filePath) {
  if (!filePath) return "Atlas Studio";
  const parts = filePath.split(/[/\\]/);
  const projectsIdx = parts.indexOf("My projects");
  if (projectsIdx !== -1 && parts[projectsIdx + 1]) {
    return parts[projectsIdx + 1];
  }
  return parts.length > 2 ? parts[parts.length - 2] : "Workspace";
}

function replaceFileInfo(template, state, config) {
  if (!template) return "";
  let text = String(template);

  const privacyMode = config.get("app.privacyMode.enable");

  const hasFile = Boolean(state.filePath && state.filePath !== "No file open");
  const fileName = hasFile ? path.basename(state.filePath) : "";
  const fileExt = hasFile ? path.extname(state.filePath) : "";
  const dirName = hasFile ? path.basename(path.dirname(state.filePath)) : "";
  const workspaceName = hasFile ? getWorkspaceName(state.filePath) : (state.workspaceName || "Atlas Studio");
  const langKey = hasFile ? getLanguageKey(state.language, state.filePath) : "atlas";

  const totalProblems = config.get("status.problems.enabled") ? (state.problemCount || 0) : 0;
  const problemsText = totalProblems > 0 && config.get("status.problems.enabled")
    ? replaceFileInfo(config.get("status.problems.text"), { ...state, problemCount: totalProblems }, config)
    : "";

  let displayFileName = fileName;
  let displayFileExt = fileExt;
  let displayFolderAndFile = dirName ? `${dirName}/${fileName}` : fileName;
  let displayDirName = dirName;
  let displayWorkspace = workspaceName;

  if (privacyMode) {
    displayFileName = "a file";
    displayFileExt = "";
    displayFolderAndFile = "a file in a folder";
    displayDirName = "a folder";
    displayWorkspace = "a workspace";
  }

  const langLower = (state.language || langKey || "plaintext").toLowerCase();
  const langTitle = langLower.charAt(0).toUpperCase() + langLower.slice(1);
  const langUpper = langLower.toUpperCase();

  const replaceMap = new Map([
    ["{file_name}", displayFileName],
    ["{file_extension}", displayFileExt],
    ["{file_size}", state.fileSize ? formatBytes(state.fileSize) : FAKE_EMPTY],
    ["{folder_and_file}", displayFolderAndFile],
    ["{relative_file_path}", state.relativePath || displayFileName],
    ["{directory_name}", displayDirName],
    ["{full_directory_name}", `${displayWorkspace}/${displayDirName}`],
    ["{workspace}", displayWorkspace],
    ["{workspace_folder}", displayWorkspace],
    ["{workspace_and_folder}", displayWorkspace],
    ["{lang}", langLower],
    ["{Lang}", langTitle],
    ["{LANG}", langUpper],
    ["{a_lang}", `${getArticle(langLower)} ${langLower}`],
    ["{a_Lang}", `${getArticle(langTitle)} ${langTitle}`],
    ["{a_LANG}", `${getArticle(langUpper)} ${langUpper}`],
    ["{problems}", problemsText],
    ["{problems_count}", totalProblems.toLocaleString()],
    ["{problems_pluralize}", totalProblems === 1 ? "problem" : "problems"],
    ["{problems_count_errors}", (state.errorCount || 0).toLocaleString()],
    ["{problems_count_warnings}", (state.warningCount || 0).toLocaleString()],
    ["{line_count}", (state.lineCount || 0).toLocaleString()],
    ["{current_line}", (state.currentLine || 1).toLocaleString()],
    ["{current_column}", (state.currentCol || 1).toLocaleString()],
    ["{git_owner}", privacyMode ? FAKE_EMPTY : (state.gitOwner || FAKE_EMPTY)],
    ["{git_repo}", privacyMode ? FAKE_EMPTY : (state.gitRepo || FAKE_EMPTY)],
    ["{git_branch}", privacyMode ? FAKE_EMPTY : (state.gitBranch || FAKE_EMPTY)],
    ["{git_url}", privacyMode ? FAKE_EMPTY : (state.gitUrl || FAKE_EMPTY)],
  ]);

  for (const [key, val] of replaceMap) {
    text = text.replaceAll(key, val);
  }

  return text;
}

module.exports = {
  replaceFileInfo,
  getLanguageKey,
  getWorkspaceName,
};
