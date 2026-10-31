// The shapes the helper answers with.

export interface TreeEntry {
  path: string;
  title: string;
  collection: string;
  parent: string | null;
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
}

export interface DeployLine {
  line: string;
}
