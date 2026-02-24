<?php
declare(strict_types=1);

ini_set("display_errors", "0");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

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
 * @return array{ok:bool,response:array<string,mixed>}
 */
function hardBlock(string $reason, string $category = "abusive", float $score = 0.9): array {
  return [
    "ok" => true,
    "response" => [
      "approved" => false,
      "reason" => $reason,
      "category" => $category,
      "score" => max(0, min(1, $score)),
    ],
  ];
}

function normalizeForRules(string $text): string {
  $lower = mb_strtolower($text, "UTF-8");
  $ascii = strtr($lower, [
    "á" => "a", "à" => "a", "ã" => "a", "â" => "a",
    "é" => "e", "ê" => "e",
    "í" => "i",
    "ó" => "o", "ô" => "o", "õ" => "o",
    "ú" => "u",
    "ç" => "c",
  ]);
  $clean = preg_replace("/[^a-z0-9\s]/u", " ", $ascii);
  if (!is_string($clean)) return trim($ascii);
  $compact = preg_replace("/\s+/", " ", $clean);
  return is_string($compact) ? trim($compact) : trim($clean);
}

/**
 * @return array{approved:bool,reason:string,category:string,score:float}|null
 */
function violatesHardSafetyRules(string $text): ?array {
  $t = normalizeForRules($text);

  $threatPatterns = [
    "/\b(quero|vou|vamos)\s+(bater|agredir|espancar|matar|ferir|machucar)\b/u",
    "/\b(ate)\s+(sangrar|morrer)\b/u",
    "/\b(cala\s+a\s+boca|some\s+daqui|te\s+arrebento|te\s+quebro)\b/u",
  ];

  $directedAbusePatterns = [
    "/\b(voce|vc)\s+e\s+(burro|idiota|otario|lixo|inutil)\b/u",
    "/\b(seu|sua)\s+(idiota|otario|lixo|inutil)\b/u",
  ];

  foreach ($threatPatterns as $pattern) {
    if (preg_match($pattern, $t) === 1) {
      return [
        "approved" => false,
        "reason" => "Conteúdo com ameaça/violência direcionada não é permitido para menores de 12 anos.",
        "category" => "violence",
        "score" => 0.99,
      ];
    }
  }

  foreach ($directedAbusePatterns as $pattern) {
    if (preg_match($pattern, $t) === 1) {
      return [
        "approved" => false,
        "reason" => "Conteúdo com humilhação/ofensa direcionada não é permitido para menores de 12 anos.",
        "category" => "abusive",
        "score" => 0.96,
      ];
    }
  }

  return null;
}

/**
 * @return array{ok:bool,data:array<string,mixed>}
 */
function callOpenAi(string $apiKey, string $endpoint, array $payload): array {
  $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if (!is_string($json)) {
    return ["ok" => false, "data" => []];
  }

  $ch = curl_init($endpoint);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $apiKey,
  ]);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
  curl_setopt($ch, CURLOPT_TIMEOUT, 25);
  $raw = curl_exec($ch);
  $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);

  if (!is_string($raw) || $raw === "" || $err !== "" || $httpCode < 200 || $httpCode >= 300) {
    return ["ok" => false, "data" => []];
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    return ["ok" => false, "data" => []];
  }

  return ["ok" => true, "data" => $decoded];
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  respondJson(204, ["ok" => true]);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  respondJson(405, ["ok" => false, "error" => "Método não permitido."]);
}

$configPath = __DIR__ . "/ai-audit-config.json";
if (!is_file($configPath)) {
  respondJson(200, hardBlock("Auditoria IA indisponível no momento. Tente novamente.", "other", 0.6)["response"]);
}

$config = json_decode((string) file_get_contents($configPath), true);
if (!is_array($config)) {
  respondJson(200, hardBlock("Auditoria IA indisponível no momento. Tente novamente.", "other", 0.6)["response"]);
}

$apiKey = trim((string) ($config["openAiApiKey"] ?? ""));
if ($apiKey === "") {
  respondJson(200, hardBlock("Auditoria IA indisponível no momento. Tente novamente.", "other", 0.6)["response"]);
}

$rawBody = (string) file_get_contents("php://input");
$body = json_decode($rawBody, true);
if (!is_array($body)) {
  respondJson(400, hardBlock("Body inválido para auditoria.", "other", 1)["response"]);
}

$content = trim((string) ($body["content"] ?? ""));
if ($content === "") {
  respondJson(400, hardBlock("Digite um conteúdo antes de publicar.", "other", 1)["response"]);
}

$ruleHit = violatesHardSafetyRules($content);
if (is_array($ruleHit)) {
  respondJson(200, $ruleHit);
}

$moderation = callOpenAi($apiKey, "https://api.openai.com/v1/moderations", [
  "model" => "omni-moderation-latest",
  "input" => $content,
]);

if ($moderation["ok"]) {
  $flagged = (bool) (($moderation["data"]["results"][0]["flagged"] ?? false));
  if ($flagged) {
    respondJson(200, hardBlock("Conteúdo bloqueado pela política de segurança para menores de 12 anos.", "abusive", 0.95)["response"]);
  }
}

$prompt = implode("\n", [
  "Você é um auditor de segurança de conteúdo para plataforma escolar com crianças menores de 12 anos.",
  "Classifique o texto do usuário e retorne SOMENTE JSON válido.",
  "Campos obrigatórios: approved(boolean), reason(string), category(enum: safe|abusive|sexual|violence|hate|self_harm|other), score(number 0..1).",
  "Regra crítica: approved=true SOMENTE se o conteúdo for totalmente adequado para menores de 12 anos.",
  "Insulto, humilhação, ameaça, palavrão, conteúdo sexual, violência, drogas, ódio ou autolesão => approved=false.",
  "Texto: " . $content,
]);

$classification = callOpenAi($apiKey, "https://api.openai.com/v1/chat/completions", [
  "model" => "gpt-4o-mini",
  "temperature" => 0,
  "response_format" => ["type" => "json_object"],
  "messages" => [
    ["role" => "system", "content" => "Responda apenas JSON válido."],
    ["role" => "user", "content" => $prompt],
  ],
]);

if (!$classification["ok"]) {
  respondJson(200, hardBlock("Não foi possível validar o conteúdo com segurança agora. Tente novamente.", "other", 0.6)["response"]);
}

$rawModel = (string) ($classification["data"]["choices"][0]["message"]["content"] ?? "");
$parsed = json_decode($rawModel, true);
if (!is_array($parsed)) {
  respondJson(200, hardBlock("Não foi possível validar o conteúdo com segurança agora. Tente novamente.", "other", 0.6)["response"]);
}

$category = (string) ($parsed["category"] ?? "other");
$score = (float) ($parsed["score"] ?? 0.5);
$score = max(0, min(1, $score));
$approvedFromModel = (($parsed["approved"] ?? false) === true);
$approved = $approvedFromModel && $category === "safe" && $score <= 0.3;

if (!$approved) {
  respondJson(200, [
    "approved" => false,
    "reason" => (string) ($parsed["reason"] ?? "Conteúdo inadequado para menores de 12 anos."),
    "category" => $category,
    "score" => $score,
  ]);
}

respondJson(200, [
  "approved" => true,
  "reason" => "Conteúdo adequado para menores de 12 anos.",
  "category" => "safe",
  "score" => min($score, 0.3),
]);
