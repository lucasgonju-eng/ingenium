<?php
declare(strict_types=1);

ini_set("display_errors", "0");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, asaas-access-token");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "Método não permitido."]);
  exit;
}

$configPath = __DIR__ . "/asaas-config.json";
if (!is_file($configPath)) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Configuração Asaas ausente no servidor."]);
  exit;
}

$config = json_decode((string) file_get_contents($configPath), true);
if (!is_array($config)) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Configuração Asaas inválida."]);
  exit;
}

$expectedToken = (string) ($config["webhookToken"] ?? "");
if ($expectedToken === "") {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Webhook token não configurado."]);
  exit;
}

$headers = function_exists("getallheaders") ? getallheaders() : [];
$receivedToken = (string) ($headers["asaas-access-token"] ?? $headers["Asaas-Access-Token"] ?? "");
if ($receivedToken === "" || !hash_equals($expectedToken, $receivedToken)) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "Token de webhook inválido."]);
  exit;
}

$rawBody = (string) file_get_contents("php://input");
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Payload inválido."]);
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

/**
 * @return array<string,mixed>|null
 */
function asaas_get_customer(string $baseUrl, string $apiKey, string $customerId): ?array {
  if ($customerId === "") return null;
  $endpoint = rtrim($baseUrl, "/") . "/customers/" . rawurlencode($customerId);
  $ch = curl_init($endpoint);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Accept: application/json",
    "User-Agent: InGeniumHostingerWebhook/1.0",
    "access_token: " . $apiKey,
  ]);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
  curl_setopt($ch, CURLOPT_TIMEOUT, 20);
  $response = curl_exec($ch);
  $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if (!is_string($response) || $httpCode < 200 || $httpCode >= 300) return null;
  $json = json_decode($response, true);
  return is_array($json) ? $json : null;
}

/**
 * @return array{ok:bool,status:int,body:string,json:array<string,mixed>|null,error:string}
 */
function supabase_request(string $method, string $url, string $serviceRoleKey, ?array $body = null): array {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
  $headers = [
    "Accept: application/json",
    "apikey: " . $serviceRoleKey,
    "Authorization: Bearer " . $serviceRoleKey,
    "User-Agent: InGeniumWebhookXP/1.0",
  ];
  if ($body !== null) {
    $jsonBody = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($jsonBody)) {
      return ["ok" => false, "status" => 0, "body" => "", "json" => null, "error" => "Falha ao serializar JSON do Supabase."];
    }
    $headers[] = "Content-Type: application/json";
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
  }
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
  curl_setopt($ch, CURLOPT_TIMEOUT, 20);

  $response = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if (!is_string($response)) {
    return ["ok" => false, "status" => $status, "body" => "", "json" => null, "error" => $curlError !== "" ? $curlError : "Falha de transporte Supabase."];
  }
  $json = json_decode($response, true);
  return [
    "ok" => $status >= 200 && $status < 300,
    "status" => $status,
    "body" => $response,
    "json" => is_array($json) ? $json : null,
    "error" => $curlError,
  ];
}

function extract_uuid_from_external_reference(string $externalReference): string {
  if ($externalReference === "") return "";
  if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i', $externalReference, $m) === 1) {
    return strtolower((string) ($m[1] ?? ""));
  }
  return "";
}

$logDir = __DIR__ . "/logs";
if (!is_dir($logDir)) {
  @mkdir($logDir, 0755, true);
}

$logLine = json_encode([
  "received_at" => gmdate("c"),
  "event" => (string) ($payload["event"] ?? ""),
  "paymentId" => (string) ($payload["payment"]["id"] ?? ""),
  "data" => $payload,
], JSON_UNESCAPED_UNICODE);

if (is_string($logLine)) {
  @file_put_contents($logDir . "/asaas-webhook.log", $logLine . PHP_EOL, FILE_APPEND);
}

$event = strtoupper(trim((string) ($payload["event"] ?? "")));
$payment = is_array($payload["payment"] ?? null) ? $payload["payment"] : [];
$paymentId = trim((string) ($payment["id"] ?? ""));
$paymentStatus = strtoupper(trim((string) ($payment["status"] ?? "")));
$customerName = trim((string) ($payment["customerName"] ?? $payment["name"] ?? ""));
$customerEmail = strtolower(trim((string) ($payment["customerEmail"] ?? $payment["email"] ?? $payload["customer"]["email"] ?? "")));
$customerId = trim((string) ($payment["customer"] ?? ""));
$externalReference = trim((string) ($payment["externalReference"] ?? ""));
$paidValue = (float) ($payment["value"] ?? 0);

$paidEvents = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_APPROVED", "PAYMENT_SETTLED"];
$paidStatuses = ["RECEIVED", "CONFIRMED"];
$isPaid = in_array($event, $paidEvents, true) || in_array($paymentStatus, $paidStatuses, true);

if ($isPaid && $paymentId !== "") {
  $processedPath = $logDir . "/asaas-webhook-processed.log";
  $processedContent = "";
  if (is_file($processedPath)) {
    $processedContent = (string) file_get_contents($processedPath);
  }
  $emailAlreadyProcessed = strpos($processedContent, $paymentId . "|xp_email_sent") !== false;
  $xpAlreadyProcessed = strpos($processedContent, $paymentId . "|xp_awarded") !== false;

  $baseUrl = (string) ($config["baseUrl"] ?? "https://api.asaas.com/v3");
  $apiKey = (string) ($config["apiKey"] ?? "");
  if (($customerEmail === "" || $customerName === "") && $apiKey !== "" && $customerId !== "") {
    $customerInfo = asaas_get_customer($baseUrl, $apiKey, $customerId);
    if (is_array($customerInfo)) {
      if ($customerEmail === "") {
        $customerEmail = strtolower(trim((string) ($customerInfo["email"] ?? "")));
      }
      if ($customerName === "") {
        $customerName = trim((string) ($customerInfo["name"] ?? ""));
      }
    }
  }

  if (!$emailAlreadyProcessed) {
    $smtpPath = __DIR__ . "/smtp-config.json";
    if (is_file($smtpPath) && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
      $smtpCfgRaw = json_decode((string) file_get_contents($smtpPath), true);
      if (is_array($smtpCfgRaw)) {
        $smtpCfg = [
          "host" => trim((string) ($smtpCfgRaw["smtpHost"] ?? $smtpCfgRaw["host"] ?? "")),
          "port" => (int) ($smtpCfgRaw["smtpPort"] ?? $smtpCfgRaw["port"] ?? 0),
          "encryption" => trim((string) ($smtpCfgRaw["smtpEncryption"] ?? $smtpCfgRaw["encryption"] ?? "ssl")),
          "username" => trim((string) ($smtpCfgRaw["smtpUsername"] ?? $smtpCfgRaw["username"] ?? "")),
          "password" => (string) ($smtpCfgRaw["smtpPassword"] ?? $smtpCfgRaw["password"] ?? ""),
          "fromEmail" => trim((string) ($smtpCfgRaw["fromEmail"] ?? "")),
          "fromName" => trim((string) ($smtpCfgRaw["fromName"] ?? "InGenium Einstein")),
        ];

        $safeName = htmlspecialchars($customerName !== "" ? $customerName : "aluno(a)", ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
        $safePaidValue = number_format($paidValue, 2, ",", ".");
        $safePaymentId = htmlspecialchars($paymentId, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
        $safeRef = htmlspecialchars($externalReference !== "" ? $externalReference : "não informado", ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");

        $subject = "InGenium Einstein | Pagamento confirmado e +8.000 XP";
        $html = "
        <div style='font-family:Arial,sans-serif;background:#0a1b33;color:#ffffff;padding:24px;'>
          <div style='max-width:640px;margin:0 auto;background:#10274a;border:1px solid #1f3d6d;border-radius:12px;padding:20px;'>
            <h2 style='margin:0 0 12px 0;color:#facc15;'>Pagamento confirmado!</h2>
            <p style='margin:0 0 10px 0;'>Olá, {$safeName}.</p>
            <p style='margin:0 0 12px 0;'>Recebemos a confirmação do seu pagamento no InGenium Einstein 2026.</p>
            <p style='margin:0 0 12px 0;'><strong>Você ganhou 8.000 XP no InGenium Einstein 2026.</strong></p>
            <p style='margin:0 0 8px 0;color:#cbd5e1;'>Valor confirmado: R$ {$safePaidValue}</p>
            <p style='margin:0 0 8px 0;color:#cbd5e1;'>Referência: {$safeRef}</p>
            <p style='margin:0 0 12px 0;color:#cbd5e1;'>Pagamento: {$safePaymentId}</p>
            <p style='margin:0;color:#cbd5e1;'>Equipe InGenium Einstein</p>
          </div>
        </div>";

        $sendResult = send_html_mail($customerEmail, $subject, $html, $smtpCfg);
        $marker = $paymentId . "|" . ($sendResult["ok"] ? "xp_email_sent" : "xp_email_failed") . "|" . gmdate("c");
        @file_put_contents($processedPath, $marker . PHP_EOL, FILE_APPEND);
      }
    }
  }

  if (!$xpAlreadyProcessed) {
    $supabaseCfgPath = __DIR__ . "/supabase-admin-config.json";
    if (is_file($supabaseCfgPath)) {
      $supabaseCfgRaw = json_decode((string) file_get_contents($supabaseCfgPath), true);
      if (is_array($supabaseCfgRaw)) {
        $supabaseUrl = rtrim((string) ($supabaseCfgRaw["url"] ?? ""), "/");
        $supabaseServiceRoleKey = trim((string) ($supabaseCfgRaw["serviceRoleKey"] ?? ""));
        $profileId = extract_uuid_from_external_reference($externalReference);
        $sourceRef = "asaas_pro_payment_" . $paymentId;

        if ($supabaseUrl !== "" && $supabaseServiceRoleKey !== "" && $profileId !== "") {
          $checkUrl = $supabaseUrl . "/rest/v1/xp_events?select=id&user_id=eq." . rawurlencode($profileId) . "&source_ref=eq." . rawurlencode($sourceRef) . "&limit=1";
          $checkResult = supabase_request("GET", $checkUrl, $supabaseServiceRoleKey);
          $alreadyExists = false;
          if ($checkResult["ok"] && is_array($checkResult["json"])) {
            $alreadyExists = count($checkResult["json"]) > 0;
          }

          if (!$alreadyExists) {
            $insertUrl = $supabaseUrl . "/rest/v1/xp_events";
            $insertPayload = [
              "user_id" => $profileId,
              "event_type" => "volunteer_mentorship_bronze",
              "xp_amount" => 8000,
              "occurred_on" => gmdate("Y-m-d"),
              "source_ref" => $sourceRef,
              "note" => "Bônus Plano PRO confirmado via webhook Asaas (+8000 XP)",
            ];
            $insertResult = supabase_request("POST", $insertUrl, $supabaseServiceRoleKey, $insertPayload);
            if ($insertResult["ok"]) {
              $rpcUrl = $supabaseUrl . "/rest/v1/rpc/recalc_points_for_user";
              $rpcPayload = ["p_user_id" => $profileId];
              $rpcResult = supabase_request("POST", $rpcUrl, $supabaseServiceRoleKey, $rpcPayload);
              if ($rpcResult["ok"]) {
                @file_put_contents($processedPath, $paymentId . "|xp_awarded|" . gmdate("c") . PHP_EOL, FILE_APPEND);
              } else {
                @file_put_contents($processedPath, $paymentId . "|xp_recalc_failed|" . gmdate("c") . PHP_EOL, FILE_APPEND);
              }
            } else {
              @file_put_contents($processedPath, $paymentId . "|xp_insert_failed|" . gmdate("c") . PHP_EOL, FILE_APPEND);
            }
          } else {
            @file_put_contents($processedPath, $paymentId . "|xp_awarded|" . gmdate("c") . PHP_EOL, FILE_APPEND);
          }

          $isDaviPayment = stripos($customerName, "davi laranjeiras") !== false || stripos($customerName, "vania laranjeiras") !== false;
          if (!$isDaviPayment) {
            $profileCheckUrl = $supabaseUrl . "/rest/v1/profiles?select=full_name&id=eq." . rawurlencode($profileId) . "&limit=1";
            $profileCheck = supabase_request("GET", $profileCheckUrl, $supabaseServiceRoleKey);
            if ($profileCheck["ok"] && is_array($profileCheck["json"]) && count($profileCheck["json"]) > 0) {
              $profileRow = $profileCheck["json"][0];
              if (is_array($profileRow)) {
                $profileName = strtolower(trim((string) ($profileRow["full_name"] ?? "")));
                if (strpos($profileName, "davi laranjeiras") !== false) {
                  $isDaviPayment = true;
                }
              }
            }
          }
          if ($isDaviPayment && strpos($processedContent, "davi_backfill_8000_2026|done") === false) {
            $backfillRef = "manual_backfill_davi_8000_2026";
            $checkBackfillUrl = $supabaseUrl . "/rest/v1/xp_events?select=id&user_id=eq." . rawurlencode($profileId) . "&source_ref=eq." . rawurlencode($backfillRef) . "&limit=1";
            $checkBackfill = supabase_request("GET", $checkBackfillUrl, $supabaseServiceRoleKey);
            $hasBackfill = $checkBackfill["ok"] && is_array($checkBackfill["json"]) && count($checkBackfill["json"]) > 0;
            if (!$hasBackfill) {
              $backfillPayload = [
                "user_id" => $profileId,
                "event_type" => "volunteer_mentorship_bronze",
                "xp_amount" => 8000,
                "occurred_on" => gmdate("Y-m-d"),
                "source_ref" => $backfillRef,
                "note" => "Backfill manual Davi Laranjeiras (+8000 XP)",
              ];
              $backfillInsert = supabase_request("POST", $insertUrl, $supabaseServiceRoleKey, $backfillPayload);
              if ($backfillInsert["ok"]) {
                $rpcUrl = $supabaseUrl . "/rest/v1/rpc/recalc_points_for_user";
                $rpcPayload = ["p_user_id" => $profileId];
                $rpcBackfill = supabase_request("POST", $rpcUrl, $supabaseServiceRoleKey, $rpcPayload);
                if ($rpcBackfill["ok"]) {
                  @file_put_contents($processedPath, "davi_backfill_8000_2026|done|" . gmdate("c") . PHP_EOL, FILE_APPEND);
                }
              }
            } else {
              @file_put_contents($processedPath, "davi_backfill_8000_2026|done|" . gmdate("c") . PHP_EOL, FILE_APPEND);
            }
          }
        }
      }
    }
  }
}

http_response_code(200);
echo json_encode(["ok" => true]);
