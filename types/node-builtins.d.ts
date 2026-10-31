// The Node built-ins that the repository uses, declared by hand.
//
// The project ships no @types package, so the lint step cannot resolve
// "node:fs", "node:path" and the other Node modules on its own. These
// declarations cover exactly the calls the Playwright config and the test
// sources make, so a new Node call has to be declared here before it type
// checks. Nothing in this file ships with the site.

interface Buffer {
  readonly length: number;
  toString(encoding?: string): string;
}

declare const process: {
  env: Record<string, string | undefined>;
  execPath: string;
  pid: number;
  platform: string;
  cwd(): string;
};

declare module "node:fs" {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export interface Stats {
    size: number;
    atime: Date;
    mtime: Date;
    atimeMs: number;
    mtimeMs: number;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export function existsSync(target: string): boolean;
  export function mkdirSync(target: string, options?: { recursive?: boolean }): void;
  export function readdirSync(target: string): string[];
  export function readdirSync(target: string, options: { withFileTypes: true }): Dirent[];
  export function readFileSync(target: string, encoding: "utf8"): string;
  export function readFileSync(target: string): Buffer;
  export function rmSync(target: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function statSync(target: string): Stats;
  export function utimesSync(target: string, atime: Date | string | number, mtime: Date | string | number): void;
  export function writeFileSync(target: string, data: string, encoding?: string): void;
}

declare module "node:path" {
  export const sep: string;
  export function basename(target: string, extension?: string): string;
  export function dirname(target: string): string;
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}

declare module "node:crypto" {
  export interface Hash {
    update(data: string | Buffer, encoding?: string): Hash;
    digest(encoding: string): string;
  }
  export function createHash(algorithm: string): Hash;
}

declare module "node:child_process" {
  export interface Writable {
    write(chunk: string): boolean;
    end(): void;
  }
  export interface ChildProcess {
    pid?: number;
    stdin: Writable | null;
    on(event: string, listener: (...args: any[]) => void): ChildProcess;
    kill(): boolean;
  }
  export interface SpawnOptions {
    cwd?: string;
    env?: Record<string, string | undefined>;
    stdio?: string | string[];
  }
  export function spawn(command: string, args: string[], options?: SpawnOptions): ChildProcess;
  export function execFileSync(command: string, args: string[], options?: { cwd?: string; stdio?: string }): Buffer;
  export function execFileSync(command: string, args: string[], options: { cwd?: string; stdio?: string; encoding: string }): string;
  export function spawnSync(command: string, args: string[], options: { cwd?: string; encoding: string }): { status: number | null; stdout: string; stderr: string };
  export function spawnSync(command: string, args: string[], options?: { cwd?: string }): { status: number | null; stdout: Buffer; stderr: Buffer };
}
