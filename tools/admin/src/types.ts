// The shapes the helper answers with.

export interface TreeEntry {
  path: string;
  title: string;
  collection: string;
  parent: string | null;
}

// A page of the site whose text lives in a content fragment.
export interface PageFragment {
  slug: string;
  path: string;
  title: string;
}

// The fragment the panel reads back and writes into.
export interface PageFragmentDraft {
  slug: string;
  html: string;
}

export interface EntrySummary {
  slug: string;
  title: string;
  date: string;
  collection: string;
  tags: string[];
}

export interface EntryDraft {
  slug: string;
  collection: string;
  title: string;
  date: string;
  tags: string;
  body: string;
  excerpt?: string;
  standfirst?: string;
  author?: string;
}

export interface TrashEntry {
  name: string;
  collection: string;
  slug: string;
  title: string;
  date: string;
}

export interface RegistryReport {
  categories: string[];
  unknown: string[];
  files: string[];
}

export interface HealthReport {
  ok: boolean;
  root: string;
  stale: boolean;
  staleReason: string;
  build: BuildReport;
  idleSeconds: number;
  idleTimeoutMinutes: number;
}

// The outcome of the last build the panel started.
export interface BuildReport {
  ran: boolean;
  ok: boolean;
  code: number;
  message: string;
  startedAt: number;
}

export interface ExcerptReport {
  excerpt: string;
  truncated: boolean;
  cardLink: string;
}

export interface SnapshotReport {
  name: string;
  path: string;
  folder: string;
}

export interface StyleTarget {
  file: string;
  category: string;
  selectors: string[];
}

export interface StyleValues {
  height: string;
  width: string;
  position: string;
  zIndex: string;
  color: string;
  backgroundColor: string;
  backgroundImage: string;
}

export interface StyleSaveRequest {
  target: StyleTarget;
  values: StyleValues;
  changedProperties: string[];
  text: string;
  changedText: boolean;
  elementId: string;
  page: string;
}

export interface StyleSaveResult {
  ok: boolean;
  message: string;
  changedFiles: string[];
}

export interface DeploySettings {
  server: string;
  user: string;
  password: string;
  folder: string;
  port: number;
  testPort: number;
}

export interface DeployLine {
  line: string;
  done?: boolean;
  code?: number;
}

// The answer of a change the helper made in the repository.
export interface ChangeReport {
  ok: boolean;
  message: string;
  changed: boolean;
  buildStartedAt: number;
}
