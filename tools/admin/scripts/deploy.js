// View three: the deploy panel.
// It asks for the connection details, runs the deploy helper and shows the
// server answer line by line. The password lives in the page only, for as
// long as the page is open.
import { fetchSnapshot, runDeploy } from "./api.js";
import { required, setStatus } from "./dom.js";
const MODES = [
    { id: "check", label: "Check connection" },
    { id: "publish", label: "Publish to IONOS" },
    { id: "fix", label: "Fix server permissions" }
];
function settings() {
    return {
        server: required("[data-deploy-server]").value.trim(),
        user: required("[data-deploy-user]").value.trim(),
        password: required("[data-deploy-password]").value,
        folder: required("[data-deploy-folder]").value.trim() || "/home/www/annoyinggoods",
        port: Number(required("[data-deploy-port]").value) || 22
    };
}
function appendLine(line) {
    const output = required("[data-deploy-output]");
    output.textContent = output.textContent ? output.textContent + "\n" + line : line;
    output.scrollTop = output.scrollHeight;
}
// The command the operator runs by hand, with the password kept out of it.
function exportCommand() {
    const values = settings();
    const command = [
        "powershell -ExecutionPolicy Bypass -File tools/deploy/publish.ps1",
        "-Mode publish",
        "-Server " + (values.server || "<host>"),
        "-User " + (values.user || "<user>"),
        "-Folder " + values.folder,
        "-Port " + String(values.port)
    ].join(" ");
    const note = [
        command,
        "",
        "Set the password in the environment variable before the run:",
        "$env:AG_DEPLOY_PASSWORD = \"your password\"",
        "The password travels in AG_DEPLOY_PASSWORD and never in the command line."
    ].join("\n");
    required("[data-deploy-command]").textContent = note;
}
// Where the snapshot of the last release sits.
async function loadSnapshot() {
    const node = required("[data-deploy-snapshot]");
    try {
        const report = await fetchSnapshot();
        if (report.path === "") {
            node.textContent = "No snapshot of a past release is in " + report.folder
                + " yet. A publish keeps one there, named after the release time.";
            return;
        }
        node.textContent = "The snapshot of the build output is in " + report.path + ".";
    }
    catch (err) {
        void err;
        node.textContent = "The helper is not running, so the snapshot folder cannot be read.";
    }
}
async function run(mode) {
    const values = settings();
    if (!values.server || !values.user) {
        setStatus("The host address and the user name are needed before anything can run.", "error");
        return;
    }
    const output = required("[data-deploy-output]");
    output.textContent = "";
    setStatus("The " + mode + " run has started.", "plain");
    try {
        await runDeploy(mode, values, appendLine);
        await loadSnapshot();
        setStatus("The " + mode + " run has finished.", "ok");
    }
    catch (err) {
        setStatus(err instanceof Error ? err.message : String(err), "error");
    }
}
export function startDeploy() {
    for (const mode of MODES) {
        const attribute = mode.id === "check" ? "[data-deploy-check]" : (mode.id === "publish" ? "[data-deploy-publish]" : "[data-deploy-fix]");
        required(attribute).addEventListener("click", function () {
            void run(mode.id);
        });
    }
    required("[data-deploy-export]").addEventListener("click", function () {
        exportCommand();
        setStatus("The publish command is ready to copy into a PowerShell window.", "ok");
    });
    void loadSnapshot();
}
//# sourceMappingURL=deploy.js.map