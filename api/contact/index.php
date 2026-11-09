<?php
declare(strict_types=1);

/**
 * Annoying Goods first-party contact endpoint.
 *
 * Contract:
 *   POST /api/contact/
 *   Content-Type: application/json
 *   Body: flat JSON object of form field names to string values.
 *   Success: 200 {"ok":true}
 *   Failure: 4xx/5xx {"ok":false,"error":"short reason"}
 *
 * No third-party service is involved. Submissions are validated here, rate
 * limited per IP address, checked for spam without a captcha, and then handed
 * to the studio mailboxes. Failures are logged without personal data.
 */

// Both studio addresses receive every message, so a report is never lost
// when one of them is not watched.
const MAILBOXES = [
    'annoying.goods@gmail.com',
    'marek@annoyinggoods.com',
];
const REPLY_TO = 'marek@annoyinggoods.com';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600;
const MIN_SECONDS_ON_FORM = 3;
const MAX_FIELD_LENGTH = 4000;
const ALLOWED_FIELDS = [
    'product', 'version', 'summary', 'steps', 'expected', 'actual', 'email',
    'area', 'title', 'description', 'usecase', 'form_started_at', 'website',
];

const RATE_DIR = __DIR__ . '/../.rate';
const LOG_FILE = __DIR__ . '/../.contact.log';

function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $reason): void
{
    respond($status, ['ok' => false, 'error' => $reason]);
}

function log_failure(string $reason, string $ip): void
{
    $line = gmdate('c') . ' reason=' . $reason . ' ip=' . $ip . PHP_EOL;
    @file_put_contents($LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

function client_ip(): string
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
    return substr($ip, 0, 45);
}

function rate_limited(string $ip): bool
{
    if (!is_dir(RATE_DIR)) {
        @mkdir(RATE_DIR, 0700, true);
    }
    $file = RATE_DIR . '/' . sha1($ip) . '.txt';
    $now = time();
    $stamps = [];
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return false;
    }
    @flock($handle, LOCK_EX);
    $raw = stream_get_contents($handle);
    if (is_string($raw) && $raw !== '') {
        foreach (explode("\n", $raw) as $line) {
            $stamp = (int) trim($line);
            if ($stamp > 0 && ($now - $stamp) < RATE_LIMIT_WINDOW) {
                $stamps[] = $stamp;
            }
        }
    }
    if (count($stamps) >= RATE_LIMIT_MAX) {
        @flock($handle, LOCK_UN);
        fclose($handle);
        return true;
    }
    $stamps[] = $now;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, implode("\n", $stamps) . "\n");
    @fflush($handle);
    @flock($handle, LOCK_UN);
    fclose($handle);
    return false;
}

function clean(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[ \t]+/', ' ', $value) ?? $value;
    $value = preg_replace('/\n{3,}/', "\n\n", $value) ?? $value;
    return trim($value);
}

function header_value(string $name): string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return isset($_SERVER[$key]) ? clean((string) $_SERVER[$key]) : '';
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    fail(405, 'method_not_allowed');
}

$ip = client_ip();

if (rate_limited($ip)) {
    log_failure('rate_limited', $ip);
    fail(429, 'too_many_submissions');
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 64 * 1024) {
    log_failure('body_too_large', $ip);
    fail(413, 'payload_too_large');
}

$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    log_failure('bad_json', $ip);
    fail(400, 'invalid_json');
}

$values = [];
foreach ($decoded as $key => $value) {
    $name = (string) $key;
    if (!in_array($name, ALLOWED_FIELDS, true)) {
        continue;
    }
    if (!is_scalar($value)) {
        continue;
    }
    $text = clean((string) $value);
    if (strlen($text) > MAX_FIELD_LENGTH) {
        $text = substr($text, 0, MAX_FIELD_LENGTH);
    }
    $values[$name] = $text;
}

if (count($values) === 0) {
    log_failure('no_known_fields', $ip);
    fail(400, 'nothing_to_handle');
}

if (isset($values['website']) && $values['website'] !== '') {
    log_failure('honeypot', $ip);
    respond(200, ['ok' => true]);
}

$startedAt = isset($values['form_started_at']) ? (int) $values['form_started_at'] : 0;
if ($startedAt > 0 && (time() - $startedAt) < MIN_SECONDS_ON_FORM) {
    log_failure('too_fast', $ip);
    respond(200, ['ok' => true]);
}

$summary = $values['summary'] ?? ($values['title'] ?? '');
if ($summary === '') {
    log_failure('missing_summary', $ip);
    fail(400, 'summary_required');
}

$email = $values['email'] ?? '';
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    log_failure('bad_email', $ip);
    fail(400, 'email_invalid');
}

$isFeature = isset($values['title']) || isset($values['usecase']);
$lines = [];
foreach ($values as $key => $value) {
    if ($key === 'website' || $key === 'form_started_at') {
        continue;
    }
    $lines[] = $key . ': ' . $value;
}
$body = implode("\n", $lines);

$subject = $isFeature
    ? 'Feature request: ' . $summary
    : 'Bug report: ' . $summary;

$headers = [];
$headers[] = 'From: website@annoyinggoods.com';
$headers[] = 'Reply-To: ' . ($email !== '' ? $email : REPLY_TO);
$headers[] = 'Content-Type: text/plain; charset=utf-8';
$headers[] = 'X-Mailer: annoying-goods-endpoint';

// The recipient is a list, so every studio mailbox gets the message.
$sent = @mail(
    MAILBOXES,
    $subject,
    $body,
    implode("\r\n", $headers)
);

if (!$sent) {
    log_failure('mail_failed', $ip);
    fail(500, 'delivery_failed');
}

respond(200, ['ok' => true]);
