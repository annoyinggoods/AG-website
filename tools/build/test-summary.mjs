// Reads the Playwright json report and writes a short markdown summary.
//
// The target file is named by the GITHUB_STEP_SUMMARY environment variable.
// When the variable is not set the summary goes to the standard output, so
// the script also works on the laptop.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const REPORT_FILE = path.join(ROOT, "playwright-report.json");

function readReport() {
  if (!fs.existsSync(REPORT_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  } catch (err) {
    void err;
    return null;
  }
}

function collectEntries(suites, found) {
  for (const suite of suites) {
    addSuiteEntries(suite, found);
  }
}

function addSuiteEntries(suite, found) {
  for (const spec of suite.specs || []) {
    addSpecEntries(spec, suite.file || spec.file || "", found);
  }
  collectEntries(suite.suites || [], found);
}

function addSpecEntries(spec, file, found) {
  for (const test of spec.tests || []) {
    found.push({
      title: spec.title,
      file: file,
      project: test.projectName || "unknown",
      status: test.status || "unknown",
      messages: errorMessages(test)
    });
  }
}

function errorMessages(test) {
  const messages = [];
  for (const result of test.results || []) {
    for (const error of result.errors || []) {
      const text = error && error.message ? String(error.message) : String(error);
      messages.push(text.split("\n")[0]);
    }
  }
  return messages;
}

function countTotals(entries) {
  const totals = { passed: 0, failed: 0, skipped: 0, flaky: 0, other: 0 };
  for (const entry of entries) {
    if (entry.status === "expected") {
      totals.passed += 1;
    } else if (entry.status === "unexpected") {
      totals.failed += 1;
    } else if (entry.status === "skipped") {
      totals.skipped += 1;
    } else if (entry.status === "flaky") {
      totals.flaky += 1;
    } else {
      totals.other += 1;
    }
  }
  return totals;
}

function countPerProject(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const current = counts.get(entry.project) || { total: 0, failed: 0 };
    current.total += 1;
    if (entry.status === "unexpected") {
      current.failed += 1;
    }
    counts.set(entry.project, current);
  }
  return counts;
}

function failedEntries(entries) {
  const failed = [];
  for (const entry of entries) {
    if (entry.status === "unexpected") {
      failed.push(entry);
    }
  }
  return failed;
}

function secondsOf(duration) {
  return (Number(duration || 0) / 1000).toFixed(1);
}

function projectTable(counts) {
  const lines = ["| Project | Tests | Failed |", "| --- | --- | --- |"];
  for (const [name, count] of counts) {
    lines.push("| " + name + " | " + String(count.total) + " | " + String(count.failed) + " |");
  }
  return lines;
}

function failureList(failed) {
  if (failed.length === 0) {
    return ["No test failed."];
  }
  const lines = [];
  for (const entry of failed) {
    const first = entry.messages.length > 0 ? entry.messages[0] : "no message";
    lines.push("- " + entry.title + " (" + entry.file + ", " + entry.project + "): " + first);
  }
  return lines;
}

function buildSummary(report) {
  const entries = [];
  collectEntries(report.suites || [], entries);
  const totals = countTotals(entries);
  const counts = countPerProject(entries);
  const failed = failedEntries(entries);
  const lines = [
    "## Playwright results",
    "",
    "- Passed: " + String(totals.passed),
    "- Failed: " + String(totals.failed),
    "- Skipped: " + String(totals.skipped),
    "- Flaky: " + String(totals.flaky),
    "- Duration: " + secondsOf(report.stats && report.stats.duration) + " s",
    "",
    "### Per project",
    ""
  ];
  for (const line of projectTable(counts)) {
    lines.push(line);
  }
  lines.push("");
  lines.push("### Failed tests");
  lines.push("");
  for (const line of failureList(failed)) {
    lines.push(line);
  }
  lines.push("");
  return lines.join("\n");
}

function writeSummary(text) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) {
    console.log(text);
    return;
  }
  fs.appendFileSync(target, text, "utf8");
  console.log("The test summary was written to " + target + ".");
}

const report = readReport();
if (!report) {
  writeSummary("## Playwright results\n\nNo json report was found, so there is nothing to summarise.\n");
} else {
  writeSummary(buildSummary(report));
}
