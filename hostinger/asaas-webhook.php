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

http_response_code(200);
echo json_encode(["ok" => true]);
