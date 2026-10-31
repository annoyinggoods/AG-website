import { defineConfig, devices, Project, ReporterDescription } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = here;
const serverScript = path.join(projectRoot, "tools", "build", "serve.mjs");

// The extra profiles are opt-in, because the desktop run is the one that
// runs the whole suite and the phone and the reduced motion run are the
// extra passes of the pipeline.
const profile = process.env.AG_TEST_PROFILE || "desktop";

// The port is overridable because a service that is not ours can hold 8000;
// the two specs that hardcode the URL keep working on the default port.
const testPort = Number(process.env.AG_TEST_PORT || 8000);

const projects: Project[] = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    // The touch specs need a touch capable browser, so they run in the
    // mobile project instead of the desktop one.
    testIgnore: "**/nag/ui/touch.spec.mjs",
  },
];

if (profile === "mobile") {
  projects.push({
    name: "mobile",
    use: { ...devices["Pixel 5"] },
  });
}

if (profile === "reduced") {
  projects.push({
    name: "reduced",
    use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" },
    // The reduced pass has no touch screen, so the touch specs have nothing
    // to prove there. They run in the mobile pass.
    testIgnore: "**/nag/ui/touch.spec.mjs",
  });
}

// The json report is the machine readable result of the run. The summary
// script reads it and writes the job summary, so every run leaves the same
// file behind, on the laptop and on the build server alike.
function reporters(): ReporterDescription[] {
  const list: ReporterDescription[] = [
    ["list"],
    ["json", { outputFile: "playwright-report.json" }],
  ];
  if (process.env.CI) {
    list.push(["html", { open: "never" }]);
  }
  return list;
}

export default defineConfig({
  testDir: "REVIEW/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: reporters(),
  use: {
    baseURL: `http://localhost:${testPort}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `node "${serverScript}"`,
    port: testPort,
    env: { ...process.env, PORT: String(testPort) },
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: projects,
});
