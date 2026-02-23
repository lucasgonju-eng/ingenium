<?php
declare(strict_types=1);

ini_set("display_errors", "0");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
$requestId = bin2hex(random_bytes(8));

/**
 * @param int $status
 * @param array<string,mixed> $payload
 */
function respondJson(int $status, array $payload): void {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/**
 * @param string $baseUrl
 * @param string $apiKey
 * @param array<string,mixed> $payload
 * @return array{ok:bool,httpCode:int,responseBody:string,error:string,transport:string}
 */
function sendToAsaas(string $baseUrl, string $apiKey, array $payload): array {
  $endpoint = rtrim($baseUrl, "/") . "/paymentLinks";
  $jsonPayload = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if (!is_string($jsonPayload)) {
    return [
      "ok" => false,
      "httpCode" => 0,
      "responseBody" => "",
      "error" => "Falha ao serializar payload para JSON: " . json_last_error_msg(),
      "transport" => "json_encode",
    ];
  }

  $ch = curl_init($endpoint);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Accept: application/json",
    "access_token: " . $apiKey,
  ]);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
  curl_setopt($ch, CURLOPT_TIMEOUT, 45);

  $responseBody = curl_exec($ch);
  $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlErr = curl_error($ch);
  curl_close($ch);

  if (is_string($responseBody) && $curlErr === "") {
    return [
      "ok" => true,
      "httpCode" => $httpCode,
      "responseBody" => $responseBody,
      "error" => "",
      "transport" => "curl",
    ];
  }

  // Fallback para ambientes com cURL instável no host.
  $headers = [
    "Content-Type: application/json",
    "Accept: application/json",
    "access_token: " . $apiKey,
  ];
  $context = stream_context_create([
    "http" => [
      "method" => "POST",
      "header" => implode("\r\n", $headers),
      "content" => $jsonPayload,
      "timeout" => 45,
      "ignore_errors" => true,
    ],
  ]);

  $fallbackBody = @file_get_contents($endpoint, false, $context);
  $fallbackHttpCode = 0;
  if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $line) {
      if (preg_match("/^HTTP\/\d+\.\d+\s+(\d+)/", $line, $matches) === 1) {
        $fallbackHttpCode = (int) ($matches[1] ?? 0);
        break;
      }
    }
  }

  if (is_string($fallbackBody)) {
    return [
      "ok" => true,
      "httpCode" => $fallbackHttpCode,
      "responseBody" => $fallbackBody,
      "error" => "",
      "transport" => "file_get_contents",
    ];
  }

  return [
    "ok" => false,
    "httpCode" => $httpCode,
    "responseBody" => is_string($responseBody) ? $responseBody : "",
    "error" => $curlErr !== "" ? $curlErr : "Falha de transporte com cURL e fallback stream.",
    "transport" => "curl+fallback",
  ];
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  respondJson(204, ["ok" => true, "requestId" => $requestId]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  respondJson(405, ["ok" => false, "error" => "Método não permitido.", "requestId" => $requestId]);
}

$configPath = __DIR__ . "/asaas-config.json";
if (!is_file($configPath)) {
  respondJson(500, ["ok" => false, "error" => "Configuração Asaas ausente no servidor.", "requestId" => $requestId]);
}

$config = json_decode((string) file_get_contents($configPath), true);
if (!is_array($config)) {
  respondJson(500, ["ok" => false, "error" => "Configuração Asaas inválida.", "requestId" => $requestId]);
}

$apiKey = (string) ($config["apiKey"] ?? "");
$baseUrl = (string) ($config["baseUrl"] ?? "https://api-sandbox.asaas.com/v3");
if ($apiKey === "") {
  respondJson(500, ["ok" => false, "error" => "API key do Asaas não configurada.", "requestId" => $requestId]);
}

$rawBody = (string) file_get_contents("php://input");
$body = json_decode($rawBody, true);
if (!is_array($body)) {
  respondJson(400, [
    "ok" => false,
    "error" => "Body JSON inválido.",
    "details" => json_last_error_msg(),
    "requestId" => $requestId,
    "rawPreview" => substr($rawBody, 0, 200),
  ]);
}

$userId = trim((string) ($body["userId"] ?? ""));
$userName = trim((string) ($body["userName"] ?? "Aluno InGenium"));
$olympiadTitle = trim((string) ($body["olympiadTitle"] ?? ""));

if ($userId === "") {
  respondJson(400, ["ok" => false, "error" => "userId é obrigatório.", "requestId" => $requestId]);
}

$name = "Plano PRO InGenium";
if ($olympiadTitle !== "") {
  $name .= " - " . $olympiadTitle;
}

$description = "Plano PRO InGenium (R$324,00 em até 12x no cartão).";
if ($userName !== "") {
  $description .= " Aluno: " . $userName . ".";
}

$primaryPayload = [
  "name" => $name,
  "description" => $description,
  "value" => 324.00,
  "billingType" => "CREDIT_CARD",
  "chargeType" => "INSTALLMENT",
  "maxInstallmentCount" => 12,
  "notificationEnabled" => true,
  "externalReference" => "ingenium-pro-" . $userId,
];

$attempt = sendToAsaas($baseUrl, $apiKey, $primaryPayload);
if (!$attempt["ok"]) {
  respondJson(502, [
    "ok" => false,
    "error" => "Falha de conexão com Asaas: " . $attempt["error"],
    "transport" => $attempt["transport"],
    "requestId" => $requestId,
  ]);
}

$httpCode = $attempt["httpCode"];
$responseBody = $attempt["responseBody"];
$transport = $attempt["transport"];
$responseJson = json_decode($responseBody, true);
if (!is_array($responseJson)) {
  respondJson(502, [
    "ok" => false,
    "error" => "Resposta inválida do Asaas.",
    "requestId" => $requestId,
    "transport" => $transport,
    "statusAsaas" => $httpCode,
    "raw" => substr($responseBody, 0, 500),
  ]);
}

if ($httpCode < 200 || $httpCode >= 300) {
  $errorMsg = (string) ($responseJson["errors"][0]["description"] ?? $responseJson["message"] ?? "Erro ao criar checkout no Asaas.");
  $fallbackPayload = [
    "name" => $name,
    "description" => $description,
    "value" => 324.00,
    "billingType" => "CREDIT_CARD",
    "chargeType" => "DETACHED",
    "notificationEnabled" => true,
    "externalReference" => "ingenium-pro-" . $userId,
  ];

  // Se a combinação de parcelamento for rejeitada, tenta um formato alternativo aceito em alguns ambientes.
  if (
    $httpCode >= 400 && $httpCode < 500 &&
    (stripos($errorMsg, "chargeType") !== false || stripos($errorMsg, "installment") !== false || stripos($errorMsg, "maxInstallmentCount") !== false)
  ) {
    $retry = sendToAsaas($baseUrl, $apiKey, $fallbackPayload);
    if ($retry["ok"]) {
      $retryCode = $retry["httpCode"];
      $retryJson = json_decode($retry["responseBody"], true);
      if ($retryCode >= 200 && $retryCode < 300 && is_array($retryJson)) {
        $checkoutUrl = (string) ($retryJson["url"] ?? "");
        if ($checkoutUrl !== "") {
          respondJson(200, [
            "ok" => true,
            "checkoutUrl" => $checkoutUrl,
            "paymentLinkId" => (string) ($retryJson["id"] ?? ""),
            "billingType" => "CREDIT_CARD",
            "installments" => 12,
            "value" => 324.00,
            "requestId" => $requestId,
            "fallbackApplied" => true,
          ]);
        }
      }
    }
  }

  $errorMsg = (string) ($responseJson["errors"][0]["description"] ?? $responseJson["message"] ?? "Erro ao criar checkout no Asaas.");
  $statusToReturn = ($httpCode >= 400 && $httpCode < 600) ? $httpCode : 502;
  respondJson($statusToReturn, [
    "ok" => false,
    "error" => $errorMsg,
    "asaas" => $responseJson,
    "requestId" => $requestId,
    "transport" => $transport,
    "statusAsaas" => $httpCode,
  ]);
}

$checkoutUrl = (string) ($responseJson["url"] ?? "");
if ($checkoutUrl === "") {
  respondJson(502, [
    "ok" => false,
    "error" => "Asaas não retornou URL de checkout.",
    "asaas" => $responseJson,
    "requestId" => $requestId,
    "transport" => $transport,
    "statusAsaas" => $httpCode,
  ]);
}

respondJson(200, [
  "ok" => true,
  "checkoutUrl" => $checkoutUrl,
  "paymentLinkId" => (string) ($responseJson["id"] ?? ""),
  "billingType" => "CREDIT_CARD",
  "installments" => 12,
  "value" => 324.00,
  "requestId" => $requestId,
]);
