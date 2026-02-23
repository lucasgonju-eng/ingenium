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

function respond(int $status, array $payload): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

$logDir = __DIR__ . "/logs";
if (!is_dir($logDir)) {
  @mkdir($logDir, 0755, true);
}
$logFile = $logDir . "/asaas-checkout.log";

function appendLog(string $logFile, array $entry): void
{
  $line = json_encode($entry, JSON_UNESCAPED_UNICODE);
  if (is_string($line)) {
    @file_put_contents($logFile, $line . PHP_EOL, FILE_APPEND);
  }
}

$requestId = "";
try {
  $requestId = bin2hex(random_bytes(8));
} catch (Throwable $e) {
  $requestId = uniqid("req_", true);
}

register_shutdown_function(function () use ($logFile, $requestId): void {
  $fatal = error_get_last();
  if (!is_array($fatal)) {
    return;
  }
  $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
  if (!in_array((int) ($fatal["type"] ?? 0), $fatalTypes, true)) {
    return;
  }

  appendLog($logFile, [
    "received_at" => gmdate("c"),
    "requestId" => $requestId,
    "stage" => "fatal",
    "fatal" => $fatal,
  ]);

  if (!headers_sent()) {
    header("Content-Type: application/json; charset=utf-8");
    http_response_code(500);
    echo json_encode([
      "ok" => false,
      "error" => "Erro fatal no endpoint de checkout.",
      "requestId" => $requestId,
      "details" => (string) ($fatal["message"] ?? "Fatal error"),
    ], JSON_UNESCAPED_UNICODE);
  }
});

$configPath = __DIR__ . "/asaas-config.json";
if (!is_file($configPath)) {
  respond(500, ["ok" => false, "error" => "Configuração Asaas ausente no servidor.", "requestId" => $requestId]);
}

$config = json_decode((string) file_get_contents($configPath), true);
if (!is_array($config)) {
  respond(500, ["ok" => false, "error" => "Configuração Asaas inválida.", "requestId" => $requestId]);
}

$apiKey = (string) ($config["apiKey"] ?? "");
$baseUrl = (string) ($config["baseUrl"] ?? "https://api-sandbox.asaas.com/v3");
if ($apiKey === "") {
  respond(500, ["ok" => false, "error" => "API key do Asaas não configurada.", "requestId" => $requestId]);
}

$rawBody = (string) file_get_contents("php://input");
$body = json_decode($rawBody, true);
if (!is_array($body)) {
  respond(400, [
    "ok" => false,
    "error" => "Body JSON inválido.",
    "details" => json_last_error_msg(),
    "requestId" => $requestId,
    "rawPreview" => substr($rawBody, 0, 300),
  ]);
}

$userId = trim((string) ($body["userId"] ?? ""));
$userName = trim((string) ($body["userName"] ?? "Aluno InGenium"));
$olympiadTitle = trim((string) ($body["olympiadTitle"] ?? ""));

if ($userId === "") {
  respond(400, ["ok" => false, "error" => "userId é obrigatório.", "requestId" => $requestId]);
}

$name = "Plano PRO InGenium";
if ($olympiadTitle !== "") {
  $name .= " - " . $olympiadTitle;
}

$description = "Plano PRO InGenium (R$324,00 em até 12x no cartão).";
if ($userName !== "") {
  $description .= " Aluno: " . $userName . ".";
}

$payload = [
  "name" => $name,
  "description" => $description,
  "value" => 324.00,
  "billingType" => "CREDIT_CARD",
  "chargeType" => "INSTALLMENT",
  "maxInstallmentCount" => 12,
  "notificationEnabled" => true,
  "externalReference" => "ingenium-pro-" . $userId,
];

$endpoint = rtrim($baseUrl, "/") . "/paymentLinks";
$payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
if (!is_string($payloadJson)) {
  respond(500, ["ok" => false, "error" => "Falha ao serializar payload do Asaas.", "requestId" => $requestId]);
}

$requestHeaders = [
  "Content-Type: application/json",
  "Accept: application/json",
  "User-Agent: InGeniumHostingerCheckout/1.0",
  "access_token: " . $apiKey,
];

$responseBody = "";
$httpCode = 0;
$transportErr = "";
$transport = "curl";

if (function_exists("curl_init")) {
  $ch = curl_init($endpoint);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $requestHeaders);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  curl_setopt($ch, CURLOPT_USERAGENT, "InGeniumHostingerCheckout/1.0");
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

  $responseBody = (string) curl_exec($ch);
  $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $transportErr = curl_error($ch);
  curl_close($ch);
} else {
  $transport = "streams";
  $context = stream_context_create([
    "http" => [
      "method" => "POST",
      "header" => implode("\r\n", $requestHeaders),
      "content" => $payloadJson,
      "timeout" => 30,
      "ignore_errors" => true,
    ],
  ]);
  $rawResponse = @file_get_contents($endpoint, false, $context);
  if ($rawResponse === false) {
    $transportErr = (string) ((error_get_last()["message"] ?? "Falha de conexão ao chamar Asaas via streams."));
    $responseBody = "";
  } else {
    $responseBody = (string) $rawResponse;
  }
  if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
    if (preg_match('/\s(\d{3})\s/', (string) $http_response_header[0], $matches) === 1) {
      $httpCode = (int) $matches[1];
    }
  }
}

appendLog($logFile, [
  "received_at" => gmdate("c"),
  "requestId" => $requestId,
  "stage" => "asaas_response",
  "transport" => $transport,
  "httpCode" => $httpCode,
  "transportErr" => $transportErr,
  "requestPayload" => $payload,
  "responsePreview" => substr($responseBody, 0, 1200),
]);

if ($transportErr !== "") {
  respond(502, [
    "ok" => false,
    "error" => "Falha de conexão com Asaas: " . $transportErr,
    "requestId" => $requestId,
  ]);
}

$responseJson = json_decode($responseBody, true);
if ($httpCode < 200 || $httpCode >= 300) {
  $errorMsg = is_array($responseJson)
    ? (string) ($responseJson["errors"][0]["description"] ?? $responseJson["message"] ?? "Erro ao criar checkout no Asaas.")
    : "Erro ao criar checkout no Asaas.";
  respond(502, [
    "ok" => false,
    "error" => $errorMsg,
    "requestId" => $requestId,
    "asaasStatus" => $httpCode,
    "asaasRaw" => is_array($responseJson) ? null : substr($responseBody, 0, 500),
    "asaas" => is_array($responseJson) ? $responseJson : null,
  ]);
}

if (!is_array($responseJson)) {
  respond(502, [
    "ok" => false,
    "error" => "Resposta inválida do Asaas.",
    "requestId" => $requestId,
    "asaasRaw" => substr($responseBody, 0, 500),
  ]);
}

$checkoutUrl = (string) ($responseJson["url"] ?? "");
if ($checkoutUrl === "") {
  respond(502, [
    "ok" => false,
    "error" => "Asaas não retornou URL de checkout.",
    "requestId" => $requestId,
    "asaas" => $responseJson,
  ]);
}

echo json_encode([
  "ok" => true,
  "checkoutUrl" => $checkoutUrl,
  "paymentLinkId" => (string) ($responseJson["id"] ?? ""),
  "billingType" => "CREDIT_CARD",
  "installments" => 12,
  "value" => 324.00,
  "requestId" => $requestId,
]);
