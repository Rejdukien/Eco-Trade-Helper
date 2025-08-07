<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://rejdukien.github.io');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Origin');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the target URL from query parameter
$targetUrl = $_GET['url'] ?? '';

if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing url parameter']);
    exit();
}

// Validate URL format
if (!filter_var($targetUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL format']);
    exit();
}

// Initialize cURL
$ch = curl_init();

// Set cURL options
curl_setopt_array($ch, [
    CURLOPT_URL => $targetUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_USERAGENT => 'CORS-proxy/1.0',
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Content-Type: application/json'
    ]
]);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// Handle cURL errors
if ($response === false || !empty($error)) {
    http_response_code(500);
    echo json_encode(['error' => 'Request failed: ' . $error]);
    exit();
}

// Set the response code from the target server
http_response_code($httpCode);

// Output the response
echo $response;
?>