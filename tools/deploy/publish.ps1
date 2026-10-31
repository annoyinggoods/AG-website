<#
.SYNOPSIS
    Publishes the Annoying Goods site to the IONOS webspace, or checks the
    connection, or repairs the permissions of an uploaded release.

.DESCRIPTION
    Three modes, one script:

    check   Opens the session, prints the server banner and the target folder,
            and closes again without transferring a single file.

    publish Runs the build gate, assembles the deployable folder, and copies
            it into the target folder on the server. The gate must be green
            before anything is transferred.

    fix     Repairs the permissions of the uploaded release. Folders become
            755 and files become 644, which is what the IONOS file manager
            gets wrong when it creates owner-only (700) folders. A page that
            renders unstyled is almost always this problem.

    The password is never written to a file. It is read from the environment
    variable AG_DEPLOY_PASSWORD when it is not passed as an argument. A key
    file is the better way in, because a password handed to PuTTY travels as
    a process argument and can be read from the process list.

.PARAMETER Mode
    check, publish or fix.

.PARAMETER Server
    The host name of the webspace, for example u123456.yourwebhost.com.

.PARAMETER User
    The account name on the webspace.

.PARAMETER Password
    The password for the account. Read from AG_DEPLOY_PASSWORD when omitted.

.PARAMETER Folder
    The absolute target folder on the server, by default
    /home/www/annoyinggoods.

.PARAMETER Staging
    Marks the run as a staging run. The script then refuses to publish or to
    repair the permissions when the target folder is the production folder, so
    a mistyped folder can never reach the live site. The check mode still
    looks at the folder, because looking is harmless.

.PARAMETER Port
    The SSH port, by default 22.

.PARAMETER KeyFile
    A private key file used instead of a password, for key based access.

.EXAMPLE
    powershell -File tools/deploy/publish.ps1 -Mode check -Server u123456.yourwebhost.com -User u123456

.EXAMPLE
    powershell -File tools/deploy/publish.ps1 -Mode publish -Server u123456.yourwebhost.com -User u123456

.EXAMPLE
    powershell -File tools/deploy/publish.ps1 -Mode publish -Staging -Folder /home/www/annoyinggoods-staging -Server u123456.yourwebhost.com -User u123456
#>
[CmdletBinding()]
param(
    [ValidateSet("check", "publish", "fix")]
    [string]$Mode = "check",
    [string]$Server = "",
    [string]$User = "",
    [string]$Password = "",
    [string]$Folder = "/home/www/annoyinggoods",
    [int]$Port = 22,
    [string]$KeyFile = "",
    [switch]$Staging
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$distDir = Join-Path $repoRoot "dist"
$productionFolder = "/home/www/annoyinggoods"
$snapshotFolderName = "snapshots"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

function Write-Fail {
    param([string]$Message)
    Write-Host "FAILED: $Message" -ForegroundColor Red
    exit 1
}

function Get-TransferCommand {
    $plink = Get-Command "plink.exe" -ErrorAction SilentlyContinue
    $pscp = Get-Command "pscp.exe" -ErrorAction SilentlyContinue
    if ($plink -and $pscp) {
        return @{ Kind = "putty"; Plink = $plink.Source; Pscp = $pscp.Source }
    }
    $ssh = Get-Command "ssh.exe" -ErrorAction SilentlyContinue
    $scp = Get-Command "scp.exe" -ErrorAction SilentlyContinue
    if ($ssh -and $scp) {
        return @{ Kind = "openssh"; Ssh = $ssh.Source; Scp = $scp.Source }
    }
    return $null
}

function Resolve-Secret {
    if ($Password -ne "") {
        return $Password
    }
    $fromEnvironment = [Environment]::GetEnvironmentVariable("AG_DEPLOY_PASSWORD")
    if ($fromEnvironment) {
        return $fromEnvironment
    }
    return ""
}

function Write-SecretWarning {
    if ($KeyFile -ne "") {
        return
    }
    if ((Resolve-Secret) -eq "") {
        return
    }
    Write-Host "Note: the password travels as a process argument for PuTTY. A key file is safer." -ForegroundColor Yellow
}

function Invoke-OpenSsh {
    param([string]$Command)
    $args = @("-p", $Port, "-o", "BatchMode=yes")
    if ($KeyFile -ne "") {
        $args += @("-i", $KeyFile)
    }
    $args += @("$User@$Server", $Command)
    & ssh.exe @args
    return $LASTEXITCODE
}

function Invoke-Putty {
    param([string]$Command)
    $args = @("-P", $Port, "-batch")
    if ($KeyFile -ne "") {
        $args += @("-i", $KeyFile)
    }
    $args += @("$User@$Server", $Command)
    $secret = Resolve-Secret
    if ($secret -ne "") {
        $args += @("-pw", $secret)
    }
    & plink.exe @args
    return $LASTEXITCODE
}

function Invoke-Remote {
    param([string]$Command)
    $tool = Get-TransferCommand
    if ($tool -eq $null) {
        Write-Fail "Neither PuTTY (plink, pscp) nor OpenSSH (ssh, scp) was found on this machine."
    }
    if ($tool.Kind -eq "putty") {
        return Invoke-Putty -Command $Command
    }
    return Invoke-OpenSsh -Command $Command
}

function Test-Connection {
    Write-Step "Opening a session to $User@$Server on port $Port."
    $banner = Invoke-Remote -Command "echo CONNECTED; pwd; ls -ld $Folder"
    if ($banner -ne 0) {
        Write-Fail "The session failed. Check the host, the user, the port and the password."
    }
    Write-Step "The connection works."
}

function Invoke-Gate {
    Write-Step "Running the build gate."
    Push-Location $repoRoot
    try {
        & npm run lint
        if ($LASTEXITCODE -ne 0) { Write-Fail "The type check failed, so nothing was uploaded." }
        & npm run build
        if ($LASTEXITCODE -ne 0) { Write-Fail "The build failed, so nothing was uploaded." }
        & npm test
        if ($LASTEXITCODE -ne 0) { Write-Fail "The test suite failed, so nothing was uploaded." }
        & node tools/build/package.mjs
        if ($LASTEXITCODE -ne 0) { Write-Fail "The packaging step failed, so nothing was uploaded." }
    } finally {
        Pop-Location
    }
}

function Get-NormalizedFolder {
    param([string]$Path)
    $clean = $Path.Trim().Replace("\", "/")
    while ($clean.Length -gt 1 -and $clean.EndsWith("/")) {
        $clean = $clean.Substring(0, $clean.Length - 1)
    }
    return $clean
}

# The staging run never touches the production folder. The check mode is
# allowed to look at it, because looking changes nothing.
function Assert-StagingTarget {
    if (-not $Staging) {
        return
    }
    if ($Mode -eq "check") {
        return
    }
    $target = Get-NormalizedFolder $Folder
    $production = Get-NormalizedFolder $productionFolder
    if ($target -eq $production) {
        Write-Fail "The staging run refuses the production folder $productionFolder. Point -Folder at the staging folder, or drop the -Staging switch for a production release."
    }
}

function Get-UploadItems {
    return Get-ChildItem -LiteralPath $distDir -Force | Where-Object { $_.Name -ne $snapshotFolderName }
}

# A snapshot keeps the release that is about to go out, so a bad publish can be
# undone by publishing the snapshot folder again.
function New-Snapshot {
    $stamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
    $snapshotPath = Join-Path (Join-Path $distDir $snapshotFolderName) $stamp
    New-Item -ItemType Directory -Path $snapshotPath -Force | Out-Null
    $items = Get-UploadItems
    foreach ($item in $items) {
        Copy-Item -LiteralPath $item.FullName -Destination $snapshotPath -Recurse -Force
    }
    Write-Step "Kept a snapshot of this release in $snapshotPath."
}

function Publish-Release {
    Invoke-Gate
    if (-not (Test-Path $distDir)) {
        Write-Fail "The deployable folder $distDir does not exist."
    }
    New-Snapshot
    Write-Step "Uploading the contents of dist/ to $Folder."
    $tool = Get-TransferCommand
    if ($tool -eq $null) {
        Write-Fail "Neither PuTTY (plink, pscp) nor OpenSSH (ssh, scp) was found on this machine."
    }
    $secret = Resolve-Secret
    if ($tool.Kind -eq "putty") {
        Write-SecretWarning
    }
    $items = Get-UploadItems
    foreach ($item in $items) {
        if ($tool.Kind -eq "putty") {
            $args = @("-P", $Port, "-batch", "-r")
            if ($KeyFile -ne "") { $args += @("-i", $KeyFile) }
            if ($secret -ne "") { $args += @("-pw", $secret) }
            $args += @($item.FullName, "$User@$Server`:$Folder/")
            & pscp.exe @args
        } else {
            $args = @("-P", $Port, "-r")
            if ($KeyFile -ne "") { $args += @("-i", $KeyFile) }
            $args += @($item.FullName, "$User@$Server`:$Folder/")
            & scp.exe @args
        }
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            Write-Fail "The upload failed. Nothing was changed on the server beyond a partial copy."
        }
    }
    Write-Step "The release is uploaded. Repair the permissions next with the fix mode."
}

function Repair-Permissions {
    Write-Step "Repairing the permissions under $Folder."
    $command = "find $Folder -type d -exec chmod 755 {} + ; find $Folder -type f -exec chmod 644 {} + ; echo PERMISSIONS_REPAIRED"
    $result = Invoke-Remote -Command $command
    if ($result -ne 0) {
        Write-Fail "The permission repair failed."
    }
    Write-Step "Folders are 755 and files are 644."
}

if ($Server -eq "" -or $User -eq "") {
    Write-Fail "The server and the user name are required. Run the script with -Server and -User."
}

Assert-StagingTarget

switch ($Mode) {
    "check" { Test-Connection }
    "publish" { Publish-Release }
    "fix" { Repair-Permissions }
}
