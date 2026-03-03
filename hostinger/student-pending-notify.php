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
 * @param array<string,mixed> $smtp
 * @return array{ok:bool,error:string}
 */
function send_html_mail(string $to, string $subject, string $html, array $smtp): array {
  $host = trim((string) ($smtp["host"] ?? ""));
  $port = (int) ($smtp["port"] ?? 0);
  $encryption = strtolower(trim((string) ($smtp["encryption"] ?? "ssl")));
  $username = trim((string) ($smtp["username"] ?? ""));
  $password = (string) ($smtp["password"] ?? "");
  $fromEmail = trim((string) ($smtp["fromEmail"] ?? ""));
  $fromName = trim((string) ($smtp["fromName"] ?? "InGenium Einstein"));

  if ($host === "" || $port <= 0 || $username === "" || $password === "" || $fromEmail === "") {
    return ["ok" => false, "error" => "Configuração SMTP incompleta."];
  }
  if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    return ["ok" => false, "error" => "E-mail de destino inválido."];
  }

  $remote = ($encryption === "ssl" ? "ssl://" : "") . $host . ":" . $port;
  $errno = 0;
  $errstr = "";
  $socket = @stream_socket_client($remote, $errno, $errstr, 20);
  if (!$socket) {
    return ["ok" => false, "error" => "Falha conexão SMTP: {$errstr} ({$errno})"];
  }

  $readLine = static function ($fp): string {
    $data = "";
    while (!feof($fp)) {
      $line = fgets($fp, 515);
      if ($line === false) break;
      $data .= $line;
      if (preg_match('/^\d{3}\s/', $line) === 1) break;
    }
    return trim($data);
  };
  $expectCode = static function (string $response, array $codes): bool {
    foreach ($codes as $code) {
      if (strpos($response, (string) $code) === 0) return true;
    }
    return false;
  };
  $sendCmd = static function ($fp, string $cmd): void {
    fwrite($fp, $cmd . "\r\n");
  };

  stream_set_timeout($socket, 20);
  $greeting = $readLine($socket);
  if (!$expectCode($greeting, [220])) {
    fclose($socket);
    return ["ok" => false, "error" => "SMTP greeting inválido: {$greeting}"];
  }

  $sendCmd($socket, "EHLO ingenium.einsteinhub.co");
  $ehlo = $readLine($socket);
  if (!$expectCode($ehlo, [250])) {
    fclose($socket);
    return ["ok" => false, "error" => "EHLO falhou: {$ehlo}"];
  }

  if ($encryption === "tls") {
    $sendCmd($socket, "STARTTLS");
    $tlsResp = $readLine($socket);
    if (!$expectCode($tlsResp, [220])) {
      fclose($socket);
      return ["ok" => false, "error" => "STARTTLS falhou: {$tlsResp}"];
    }
    $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    if (!$cryptoOk) {
      fclose($socket);
      return ["ok" => false, "error" => "Não foi possível iniciar TLS."];
    }
    $sendCmd($socket, "EHLO ingenium.einsteinhub.co");
    $ehloTls = $readLine($socket);
    if (!$expectCode($ehloTls, [250])) {
      fclose($socket);
      return ["ok" => false, "error" => "EHLO pós-TLS falhou: {$ehloTls}"];
    }
  }

  $sendCmd($socket, "AUTH LOGIN");
  $authResp = $readLine($socket);
  if (!$expectCode($authResp, [334])) {
    fclose($socket);
    return ["ok" => false, "error" => "AUTH LOGIN falhou: {$authResp}"];
  }
  $sendCmd($socket, base64_encode($username));
  $userResp = $readLine($socket);
  if (!$expectCode($userResp, [334])) {
    fclose($socket);
    return ["ok" => false, "error" => "Usuário SMTP rejeitado: {$userResp}"];
  }
  $sendCmd($socket, base64_encode($password));
  $passResp = $readLine($socket);
  if (!$expectCode($passResp, [235])) {
    fclose($socket);
    return ["ok" => false, "error" => "Senha SMTP rejeitada: {$passResp}"];
  }

  $sendCmd($socket, "MAIL FROM:<{$fromEmail}>");
  $mailFromResp = $readLine($socket);
  if (!$expectCode($mailFromResp, [250])) {
    fclose($socket);
    return ["ok" => false, "error" => "MAIL FROM falhou: {$mailFromResp}"];
  }

  $sendCmd($socket, "RCPT TO:<{$to}>");
  $rcptResp = $readLine($socket);
  if (!$expectCode($rcptResp, [250, 251])) {
    fclose($socket);
    return ["ok" => false, "error" => "RCPT TO falhou: {$rcptResp}"];
  }

  $sendCmd($socket, "DATA");
  $dataResp = $readLine($socket);
  if (!$expectCode($dataResp, [354])) {
    fclose($socket);
    return ["ok" => false, "error" => "DATA falhou: {$dataResp}"];
  }

  $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
  $safeFromName = str_replace(["\r", "\n"], "", $fromName);
  $safeFromEmail = str_replace(["\r", "\n"], "", $fromEmail);
  $safeTo = str_replace(["\r", "\n"], "", $to);
  $bodyBase64 = chunk_split(base64_encode($html));
  $headers = [];
  $headers[] = "Date: " . gmdate("r");
  $headers[] = "From: {$safeFromName} <{$safeFromEmail}>";
  $headers[] = "To: <{$safeTo}>";
  $headers[] = "Subject: {$encodedSubject}";
  $headers[] = "MIME-Version: 1.0";
  $headers[] = "Content-Type: text/html; charset=UTF-8";
  $headers[] = "Content-Transfer-Encoding: base64";
  $headers[] = "X-Mailer: InGenium SMTP";

  $message = implode("\r\n", $headers) . "\r\n\r\n" . $bodyBase64 . "\r\n.";
  fwrite($socket, $message . "\r\n");
  $sendResp = $readLine($socket);
  if (!$expectCode($sendResp, [250])) {
    fclose($socket);
    return ["ok" => false, "error" => "Envio SMTP falhou: {$sendResp}"];
  }

  $sendCmd($socket, "QUIT");
  fclose($socket);
  return ["ok" => true, "error" => ""];
}

$raw = (string) file_get_contents("php://input");
$payload = json_decode($raw, true);
if (!is_array($payload)) {
  respond_json(400, ["ok" => false, "error" => "Payload inválido."]);
}

$action = strtolower(trim((string) ($payload["action"] ?? "pending_created")));
$fullName = trim((string) ($payload["fullName"] ?? ""));
$candidateEmail = strtolower(trim((string) ($payload["candidateEmail"] ?? "")));
$enrollmentNumber = trim((string) ($payload["enrollmentNumber"] ?? ""));
$grade = trim((string) ($payload["grade"] ?? ""));
$reason = trim((string) ($payload["reason"] ?? ""));

if ($fullName === "" || $candidateEmail === "" || !filter_var($candidateEmail, FILTER_VALIDATE_EMAIL)) {
  respond_json(400, ["ok" => false, "error" => "Dados obrigatórios ausentes para notificação."]);
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
$fromName = trim((string) ($cfg["fromName"] ?? "InGenium Einstein"));
$smtpHost = trim((string) ($cfg["smtpHost"] ?? $cfg["host"] ?? ""));
$smtpPort = (int) ($cfg["smtpPort"] ?? $cfg["port"] ?? 0);
$smtpEncryption = trim((string) ($cfg["smtpEncryption"] ?? $cfg["encryption"] ?? "ssl"));
$smtpUsername = trim((string) ($cfg["smtpUsername"] ?? $cfg["username"] ?? ""));
$smtpPassword = (string) ($cfg["smtpPassword"] ?? $cfg["password"] ?? "");
if ($fromEmail === "" || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
  respond_json(500, ["ok" => false, "error" => "fromEmail inválido na configuração SMTP."]);
}
if ($smtpHost === "" || $smtpPort <= 0 || $smtpUsername === "" || $smtpPassword === "") {
  respond_json(500, ["ok" => false, "error" => "Configuração SMTP ausente/incompleta no smtp-config.json."]);
}

$smtpCfg = [
  "host" => $smtpHost,
  "port" => $smtpPort,
  "encryption" => $smtpEncryption,
  "username" => $smtpUsername,
  "password" => $smtpPassword,
  "fromEmail" => $fromEmail,
  "fromName" => $fromName,
];

$safeName = htmlspecialchars($fullName, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
$safeEnrollment = htmlspecialchars($enrollmentNumber !== "" ? $enrollmentNumber : "não informada", ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
$safeGrade = htmlspecialchars($grade !== "" ? $grade : "não informada", ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
$safeReason = htmlspecialchars($reason !== "" ? $reason : "Divergência na validação da matrícula 2026.", ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");

if ($action === "pending_created") {
  $adminEmail = "contato@ingenium.einsteinhub.co";
  $adminSubject = "InGenium | Novo aluno pendente de validação";
  $adminHtml = "
  <div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
    <div style='max-width:720px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
      <h2 style='margin:0 0 12px 0;color:#facc15;'>Aluno pendente de validação</h2>
      <p style='margin:0 0 8px 0;'><strong>Nome:</strong> {$safeName}</p>
      <p style='margin:0 0 8px 0;'><strong>E-mail:</strong> {$candidateEmail}</p>
      <p style='margin:0 0 8px 0;'><strong>Matrícula:</strong> {$safeEnrollment}</p>
      <p style='margin:0 0 8px 0;'><strong>Série:</strong> {$safeGrade}</p>
      <p style='margin:0;'><strong>Motivo:</strong> {$safeReason}</p>
    </div>
  </div>";

  $candidateSubject = "InGenium | Inscrição em validação";
  $candidateHtml = "
  <div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
    <div style='max-width:620px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
      <h2 style='margin:0 0 12px 0;color:#facc15;'>InGenium Einstein</h2>
      <p style='margin:0 0 10px 0;'>Olá, {$safeName}.</p>
      <p style='margin:0 0 12px 0;'>Recebemos sua inscrição e ela está em validação pela equipe administrativa.</p>
      <p style='margin:0 0 12px 0;'>Em breve você receberá outro e-mail confirmando a validação da sua inscrição.</p>
      <p style='margin:0;color:#cbd5e1;'>Equipe InGenium</p>
    </div>
  </div>";

  $sendAdmin = send_html_mail($adminEmail, $adminSubject, $adminHtml, $smtpCfg);
  $sendCandidate = send_html_mail($candidateEmail, $candidateSubject, $candidateHtml, $smtpCfg);
  if (!$sendAdmin["ok"] || !$sendCandidate["ok"]) {
    $errors = [];
    if (!$sendAdmin["ok"]) $errors[] = "admin: " . $sendAdmin["error"];
    if (!$sendCandidate["ok"]) $errors[] = "aluno: " . $sendCandidate["error"];
    respond_json(500, ["ok" => false, "error" => "Falha SMTP: " . implode(" | ", $errors)]);
  }
  respond_json(200, ["ok" => true]);
}

if ($action === "approved") {
  $candidateSubject = "InGenium | Inscrição confirmada";
  $candidateHtml = "
  <div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
    <div style='max-width:620px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
      <h2 style='margin:0 0 12px 0;color:#facc15;'>InGenium Einstein</h2>
      <p style='margin:0 0 10px 0;'>Olá, {$safeName}.</p>
      <p style='margin:0 0 12px 0;'>Sua inscrição foi validada e confirmada com sucesso.</p>
      <p style='margin:0 0 12px 0;'>Seu acesso ao SaaS já está liberado. Entre com seu e-mail e senha para começar.</p>
      <p style='margin:0;color:#cbd5e1;'>Equipe InGenium</p>
    </div>
  </div>";
  $sendCandidate = send_html_mail($candidateEmail, $candidateSubject, $candidateHtml, $smtpCfg);
  if (!$sendCandidate["ok"]) {
    respond_json(500, ["ok" => false, "error" => "Falha SMTP: " . $sendCandidate["error"]]);
  }
  respond_json(200, ["ok" => true]);
}

if ($action === "rejected") {
  $candidateSubject = "InGenium | Inscrição não validada";
  $candidateHtml = "
  <div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
    <div style='max-width:620px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
      <h2 style='margin:0 0 12px 0;color:#facc15;'>InGenium Einstein</h2>
      <p style='margin:0 0 10px 0;'>Olá, {$safeName}.</p>
      <p style='margin:0 0 12px 0;'>Não foi possível validar sua inscrição como aluno Einstein 2026.</p>
      <p style='margin:0 0 12px 0;'>Se desejar suporte, entre em contato: <strong>contato@ingenium.einsteinhub.co</strong>.</p>
      <p style='margin:0;color:#cbd5e1;'>Equipe InGenium</p>
    </div>
  </div>";
  $sendCandidate = send_html_mail($candidateEmail, $candidateSubject, $candidateHtml, $smtpCfg);
  if (!$sendCandidate["ok"]) {
    respond_json(500, ["ok" => false, "error" => "Falha SMTP: " . $sendCandidate["error"]]);
  }
  respond_json(200, ["ok" => true]);
}

respond_json(400, ["ok" => false, "error" => "Ação de notificação inválida."]);
