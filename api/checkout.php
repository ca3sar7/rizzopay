<?php
require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

// 1. Rate Limiting por IP (5 criações / minuto)
$ip = getClientIp();
if (!checkRateLimit("checkout_create_$ip", 5, 60)) {
    http_response_code(429);
    echo json_encode(['error' => 'Muitas tentativas. Aguarde 1 minuto para tentar novamente.', 'type' => 'RATE_LIMIT']);
    exit;
}

// 2. Leitura e Decodificação do Payload
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

if (!$body || !is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Corpo da requisição inválido']);
    exit;
}

$sessionId = trim($body['sessionId'] ?? '');
$name      = trim($body['name'] ?? '');
$email     = strtolower(trim($body['email'] ?? ''));
$phone     = trim($body['phone'] ?? '');
$utm       = $body['utm'] ?? [];
$isRetry   = !empty($body['retry']);

// 3. Validação dos 3 Campos Obrigatórios
$fieldErrors = [];

if (empty($sessionId)) {
    $fieldErrors['sessionId'] = 'Sessão inválida.';
}

if (!isValidFullName($name)) {
    $fieldErrors['name'] = 'Informe seu nome e sobrenome completo.';
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $fieldErrors['email'] = 'Confira o e-mail digitado.';
}

if (!isValidBrazilianPhone($phone)) {
    $fieldErrors['phone'] = 'Informe o telefone com DDD válido.';
}

if (!empty($fieldErrors)) {
    http_response_code(422);
    echo json_encode([
        'error' => 'Dados inválidos',
        'fieldErrors' => $fieldErrors,
        'type' => 'VALIDATION_ERROR'
    ]);
    exit;
}

// 4. Verificação de Idempotência
$sessionsDir = getStorageDir('sessions');
$txDir       = getStorageDir('transactions');
$sessionFile = $sessionsDir . '/' . md5($sessionId) . '.json';

$existingTx = null;
if (file_exists($sessionFile)) {
    $sessionData = json_decode(file_get_contents($sessionFile), true);
    if (!empty($sessionData['lastTransactionId'])) {
        $txFile = $txDir . '/' . $sessionData['lastTransactionId'] . '.json';
        if (file_exists($txFile)) {
            $existingTx = json_decode(file_get_contents($txFile), true);
        }
    }
}

$nowIso = gmdate('Y-m-d\TH:i:s\Z');

// Se já existe uma transação pendente e não expirada para a sessão, e NÃO é retry explícito:
if ($existingTx && $existingTx['status'] === 'pending' && $existingTx['expiresAt'] > $nowIso) {
    if (!$isRetry) {
        http_response_code(200);
        echo json_encode([
            'transactionId' => $existingTx['id'],
            'amountCents'   => $existingTx['amountCents'],
            'pixCode'       => $existingTx['pixCode'],
            'qrCodeBase64'  => $existingTx['qrBase64'] ?? null,
            'expiresAt'     => $existingTx['expiresAt'],
            'status'        => $existingTx['status'],
        ]);
        exit;
    }
}

// Determinar número da tentativa
$attempt = 1;
if ($isRetry && $existingTx) {
    $attempt = ($existingTx['attempt'] ?? 1) + 1;
}

$amountCents = (int) env('PRODUCT_PRICE_CENTS', '3700');
$externalId  = "{$sessionId}_{$amountCents}_{$attempt}";
$normalizedPhone = normalizePhoneForGateway($phone);

// 5. Mapeamento das 9 Chaves de Tracking da BuckPay
$u = is_array($utm) ? $utm : [];
$utmSource = trim($u['utm_source'] ?? '');
$tracking = [
    'ref'          => trim($u['ref'] ?? '') ?: $utmSource,
    'src'          => trim($u['src'] ?? '') ?: $utmSource,
    'sck'          => trim($u['sck'] ?? '') ?: trim($u['xcod'] ?? ''),
    'utm_source'   => $utmSource,
    'utm_medium'   => trim($u['utm_medium'] ?? ''),
    'utm_campaign' => trim($u['utm_campaign'] ?? ''),
    'utm_id'       => trim($u['utm_id'] ?? ''),
    'utm_term'     => trim($u['utm_term'] ?? ''),
    'utm_content'  => trim($u['utm_content'] ?? '')
];

// 6. Chamada à API BuckPay (100% isolada no servidor)
$token = env('BUCKPAY_TOKEN');
$baseUrl = rtrim(env('BUCKPAY_BASE_URL', 'https://api.realtechdev.com.br'), '/');

if (empty($token)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuração do gateway ausente no servidor.']);
    exit;
}

$buckpayPayload = [
    'payment_method' => 'pix',
    'amount'         => $amountCents,
    'external_id'    => $externalId,
    'buyer'          => [
        'name'  => $name,
        'email' => $email,
        'phone' => $normalizedPhone
        // Sem document (validado pelo probe-buckpay)
    ],
    'tracking'       => $tracking,
    'metadata'       => [
        'product' => env('PRODUCT_NAME', 'DiagLava - Conserto na Palma da Mão')
    ]
];

$ch = curl_init("$baseUrl/v1/transactions");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($buckpayPayload),
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
        "Authorization: Bearer $token",
        'User-Agent: Buckpay API'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($response === false || !empty($curlErr)) {
    http_response_code(503);
    echo json_encode([
        'error' => 'Sem conexão com o servidor de pagamento. Verifique sua conexão e tente novamente.',
        'type'  => 'COMMUNICATION_ERROR'
    ]);
    exit;
}

$data = json_decode($response, true);
$buckData = $data['data'] ?? null;

if (($httpCode !== 201 && $httpCode !== 200) || empty($buckData['id']) || empty($buckData['pix']['code'])) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Não foi possível gerar seu PIX. Confira seus dados e tente novamente.',
        'type'  => 'GENERATION_ERROR'
    ]);
    exit;
}

// Normalização do QR Code Base64
$rawQr = $buckData['pix']['qrcode_base64'] ?? '';
$qrBase64 = null;
if (!empty($rawQr)) {
    $qrBase64 = strpos($rawQr, 'data:image/') === 0 ? $rawQr : "data:image/png;base64,$rawQr";
}

// Expiração
$defaultExpiry = (int) env('PIX_EXPIRY_SECONDS', '900');
if (!empty($buckData['expires_at'])) {
    $expiresAt = gmdate('Y-m-d\TH:i:s\Z', strtotime($buckData['expires_at']));
} else {
    $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + $defaultExpiry);
}

// 7. Gravação Atômica da Transação
$txId = generateUuid();
$transaction = [
    'id'          => $txId,
    'sessionId'   => $sessionId,
    'attempt'     => $attempt,
    'externalId'  => $externalId,
    'gatewayId'   => $buckData['id'],
    'status'      => 'pending',
    'amountCents' => $amountCents,
    'buyer'       => [
        'name'  => $name,
        'email' => $email,
        'phone' => $normalizedPhone
    ],
    'tracking'    => $tracking,
    'pixCode'     => $buckData['pix']['code'],
    'qrBase64'    => $qrBase64,
    'createdAt'   => $nowIso,
    'expiresAt'   => $expiresAt
];

$txFilePath = $txDir . '/' . $txId . '.json';
file_put_contents($txFilePath, json_encode($transaction), LOCK_EX);

// Atualizar índice de sessão
file_put_contents($sessionFile, json_encode([
    'sessionId'         => $sessionId,
    'lastTransactionId' => $txId,
    'updatedAt'         => $nowIso
]), LOCK_EX);

// 8. Resposta segura ao cliente (sem segredos, sem PII completa)
http_response_code(201);
echo json_encode([
    'transactionId' => $txId,
    'amountCents'   => $amountCents,
    'pixCode'       => $transaction['pixCode'],
    'qrCodeBase64'  => $transaction['qrBase64'],
    'expiresAt'     => $transaction['expiresAt'],
    'status'        => 'pending'
]);
