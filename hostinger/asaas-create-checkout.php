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

$apiKey = (string) ($config["apiKey"] ?? "");
$baseUrl = (string) ($config["baseUrl"] ?? "https://api-sandbox.asaas.com/v3");
if ($apiKey === "") {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "API key do Asaas não configurada."]);
  exit;
}

$rawBody = (string) file_get_contents("php://input");
$body = json_decode($rawBody, true);
if (!is_array($body)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Body JSON inválido."]);
  exit;
}

$userId = trim((string) ($body["userId"] ?? ""));
$userName = trim((string) ($body["userName"] ?? "Aluno InGenium"));
$olympiadTitle = trim((string) ($body["olympiadTitle"] ?? ""));

if ($userId === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "userId é obrigatório."]);
  exit;
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

$ch = curl_init(rtrim($baseUrl, "/") . "/paymentLinks");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Content-Type: application/json",
  "access_token: " . $apiKey,
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$responseBody = (string) curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr !== "") {
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => "Falha de conexão com Asaas: " . $curlErr]);
  exit;
}

$responseJson = json_decode($responseBody, true);
if (!is_array($responseJson)) {
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => "Resposta inválida do Asaas.", "raw" => substr($responseBody, 0, 500)]);
  exit;
}

if ($httpCode < 200 || $httpCode >= 300) {
  $errorMsg = (string) ($responseJson["errors"][0]["description"] ?? $responseJson["message"] ?? "Erro ao criar checkout no Asaas.");
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => $errorMsg, "asaas" => $responseJson]);
  exit;
}

$checkoutUrl = (string) ($responseJson["url"] ?? "");
if ($checkoutUrl === "") {
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => "Asaas não retornou URL de checkout.", "asaas" => $responseJson]);
  exit;
}

echo json_encode([
  "ok" => true,
  "checkoutUrl" => $checkoutUrl,
  "paymentLinkId" => (string) ($responseJson["id"] ?? ""),
  "billingType" => "CREDIT_CARD",
  "installments" => 12,
  "value" => 324.00,
]);
