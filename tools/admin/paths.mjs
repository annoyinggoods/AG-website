// Every path the panel knows, in one place, so no module has to guess where
// the project folder is.

import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
export const PANEL_DIR = SCRIPT_DIR;
export const CONTENT_DIR = path.join(ROOT, "tools", "build", "content");
export const ENTRIES_DIR = path.join(ROOT, "content");
export const DRAFTS_DIR = path.join(ENTRIES_DIR, "drafts");
export const TRASH_DIR = path.join(ENTRIES_DIR, "trash");
export const STYLES_DIR = path.join(ROOT, "styles");
export const DIST_DIR = path.join(ROOT, "dist");
export const SNAPSHOT_DIR = path.join(DIST_DIR, "snapshots");
export const WORK_LOG = path.join(ROOT, "REVIEW", "WORK_LOG2.md");
export const TREE_FILE = path.join(ROOT, "tools", "menu.tree.json");
export const SITE_CONFIG_FILE = path.join(ROOT, "tools", "build", "site.config.json");
export const PARTIALS_DIR = path.join(ROOT, "tools", "partials");
export const BUILD_CONTENT_DIR = path.join(ROOT, "tools", "build", "content");
export const SOURCE_DIR = path.join(ROOT, "src");
