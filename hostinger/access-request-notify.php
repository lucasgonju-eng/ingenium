<?php
declare(strict_types=1);

ini_set("display_errors", "0");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "Método não permitido."]);
  exit;
}

/**
 * @param int $status
 * @param array<string,mixed> $payload
 */
function respond_json(int $status, array $payload): void {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/**
 * @param string $to
 * @param string $subject
 * @param string $html
 * @param string $fromEmail
 * @param string $fromName
 * @return bool
 */
function send_html_mail(string $to, string $subject, string $html, string $fromEmail, string $fromName): bool {
  $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
  $headers = [];
  $headers[] = "MIME-Version: 1.0";
  $headers[] = "Content-Type: text/html; charset=UTF-8";
  $headers[] = "From: {$fromName} <{$fromEmail}>";
  $headers[] = "Reply-To: {$fromEmail}";
  $headers[] = "X-Mailer: PHP/" . PHP_VERSION;
  return @mail($to, $encodedSubject, $html, implode("\r\n", $headers));
}

$raw = (string) file_get_contents("php://input");
$payload = json_decode($raw, true);
if (!is_array($payload)) {
  respond_json(400, ["ok" => false, "error" => "Payload inválido."]);
}

$requestType = strtolower(trim((string) ($payload["requestType"] ?? "teacher")));
$approved = (bool) ($payload["approved"] ?? false);
$fullName = trim((string) ($payload["fullName"] ?? ""));
$displayName = trim((string) ($payload["displayName"] ?? ""));
$candidateEmail = strtolower(trim((string) ($payload["candidateEmail"] ?? "")));
$subjectArea = trim((string) ($payload["subjectArea"] ?? ""));
$intendedOlympiad = trim((string) ($payload["intendedOlympiad"] ?? ""));
$adminReviewerEmail = strtolower(trim((string) ($payload["adminReviewerEmail"] ?? "")));
$approvedMessage = trim((string) ($payload["approvedMessage"] ?? "Parabéns, seu cadastro foi aprovado! Seja bem-vindo(a) ao InGenium!!"));

if ($fullName === "" || $candidateEmail === "" || !filter_var($candidateEmail, FILTER_VALIDATE_EMAIL)) {
  respond_json(400, ["ok" => false, "error" => "Dados obrigatórios ausentes para envio de e-mail."]);
}

$configPath = __DIR__ . "/smtp-config.json";
if (!is_file($configPath)) {
  respond_json(500, ["ok" => false, "error" => "smtp-config.json ausente no servidor."]);
}
$cfg = json_decode((string) file_get_contents($configPath), true);
if (!is_array($cfg)) {
  respond_json(500, ["ok" => false, "error" => "smtp-config.json inválido."]);
}

$fromEmail = trim((string) ($cfg["fromEmail"] ?? ""));
$fromName = trim((string) ($cfg["fromName"] ?? "InGenium"));
if ($fromEmail === "" || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
  respond_json(500, ["ok" => false, "error" => "fromEmail inválido na configuração SMTP."]);
}

$targetAdmin = "lucasgonju@gmail.com";
$roleLabel = $requestType === "collaborator" ? "colaborador(a)" : "professor(a)";
$candidateLabel = $displayName !== "" ? $displayName : $fullName;
$statusText = $approved ? "APROVADO" : "REPROVADO";
$statusColor = $approved ? "#16a34a" : "#b91c1c";

$candidateSubject = $approved
  ? "InGenium | Cadastro aprovado"
  : "InGenium | Atualização do seu cadastro";
$candidateBody = $approved
  ? "<p style='margin:0 0 12px 0;'>{$approvedMessage}</p>"
  : "<p style='margin:0 0 12px 0;'>Seu cadastro não foi aprovado nesta etapa. Entre em contato com a equipe InGenium para orientações.</p>";

$candidateHtml = "
<div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
  <div style='max-width:620px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
    <h2 style='margin:0 0 12px 0;color:#facc15;'>InGenium</h2>
    <p style='margin:0 0 10px 0;'>Olá, {$candidateLabel}.</p>
    {$candidateBody}
    <p style='margin:0;color:#cbd5e1;'>Equipe InGenium</p>
  </div>
</div>";

$adminSubject = "InGenium | Solicitação {$statusText} - {$candidateLabel}";
$adminHtml = "
<div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
  <div style='max-width:720px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
    <h2 style='margin:0 0 12px 0;color:#facc15;'>Painel Admin InGenium</h2>
    <p style='margin:0 0 8px 0;'>Solicitação de {$roleLabel} revisada.</p>
    <p style='margin:0 0 16px 0;'><strong>Status:</strong> <span style='color:{$statusColor};font-weight:bold;'>{$statusText}</span></p>
    <p style='margin:0 0 6px 0;'><strong>Nome completo:</strong> {$fullName}</p>
    <p style='margin:0 0 6px 0;'><strong>Nome exibido:</strong> " . ($displayName !== "" ? $displayName : "Não informado") . "</p>
    <p style='margin:0 0 6px 0;'><strong>E-mail candidato:</strong> {$candidateEmail}</p>
    <p style='margin:0 0 6px 0;'><strong>Área:</strong> " . ($subjectArea !== "" ? $subjectArea : "Não informada") . "</p>
    <p style='margin:0 0 6px 0;'><strong>Olimpíada pretendida:</strong> " . ($intendedOlympiad !== "" ? $intendedOlympiad : "Não informada") . "</p>
    <p style='margin:12px 0 0 0;color:#cbd5e1;'><strong>Revisor:</strong> " . ($adminReviewerEmail !== "" ? $adminReviewerEmail : "admin") . "</p>
  </div>
</div>";

$okCandidate = send_html_mail($candidateEmail, $candidateSubject, $candidateHtml, $fromEmail, $fromName);
$okAdmin = send_html_mail($targetAdmin, $adminSubject, $adminHtml, $fromEmail, $fromName);

if (!$okCandidate || !$okAdmin) {
  respond_json(500, ["ok" => false, "error" => "Falha ao enviar e-mails de notificação."]);
}

respond_json(200, ["ok" => true]);
