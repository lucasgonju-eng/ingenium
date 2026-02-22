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

if (!isset($_FILES["avatar"])) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Arquivo 'avatar' não enviado."]);
  exit;
}

$userIdRaw = $_POST["user_id"] ?? "";
$userId = preg_replace("/[^a-zA-Z0-9_-]/", "", (string) $userIdRaw);
if ($userId === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "user_id inválido."]);
  exit;
}

$extInput = strtolower((string) ($_POST["ext"] ?? ""));
$allowedExt = ["jpg", "jpeg", "png", "webp"];
$ext = in_array($extInput, $allowedExt, true) ? $extInput : "jpg";
if ($ext === "jpeg") $ext = "jpg";

$file = $_FILES["avatar"];
if (!isset($file["tmp_name"]) || (int) $file["error"] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Erro no upload do arquivo."]);
  exit;
}

$maxBytes = 5 * 1024 * 1024;
if ((int) $file["size"] > $maxBytes) {
  http_response_code(413);
  echo json_encode(["ok" => false, "error" => "Arquivo maior que 5MB."]);
  exit;
}

$mime = "";
if (function_exists("finfo_open")) {
  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime = $finfo ? (string) finfo_file($finfo, $file["tmp_name"]) : "";
  if ($finfo) finfo_close($finfo);
}
if ($mime === "") {
  $mime = (string) ($file["type"] ?? "");
}

$allowedMime = [
  "jpg" => "image/jpeg",
  "png" => "image/png",
  "webp" => "image/webp",
];

if (!isset($allowedMime[$ext]) || ($mime !== "" && $allowedMime[$ext] !== $mime)) {
  http_response_code(415);
  echo json_encode(["ok" => false, "error" => "Tipo de arquivo inválido."]);
  exit;
}

$baseDir = __DIR__ . "/imagens";
if (!is_dir($baseDir)) {
  if (!mkdir($baseDir, 0755, true) && !is_dir($baseDir)) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Não foi possível criar /imagens."]);
    exit;
  }
}

foreach (glob($baseDir . "/avatar-" . $userId . ".*") ?: [] as $existing) {
  @unlink($existing);
}

$filename = "avatar-" . $userId . "." . $ext;
$targetPath = $baseDir . "/" . $filename;

if (!move_uploaded_file($file["tmp_name"], $targetPath)) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Falha ao salvar imagem em /imagens."]);
  exit;
}

$https = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
$host = (string) ($_SERVER["HTTP_HOST"] ?? "ingenium.einsteinhub.co");
$publicUrl = $https . "://" . $host . "/imagens/" . rawurlencode($filename) . "?v=" . time();

echo json_encode([
  "ok" => true,
  "url" => $publicUrl,
]);
