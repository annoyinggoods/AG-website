// The files the panel wrote during this run, with the time they carried
// before the write and the time the write gave them. The staleness check
// uses the time from before the write while the file still carries the time
// the panel gave it, so a change the panel made itself never makes the panel
// refuse its own work. A later change by somebody else is seen again.

const touched = new Map();

export function rememberWrite(target, mtimeBefore, mtimeAfter) {
  touched.set(target, { before: mtimeBefore, after: mtimeAfter });
}

export function rememberedTime(target) {
  const value = touched.get(target);
  return value === undefined ? null : value;
}

export function touchedFiles() {
  return Array.from(touched.keys());
}
