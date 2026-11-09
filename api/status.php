<?php
require_once __DIR__ . '/bootstrap.php';

$tid = trim($_GET['tid'] ?? '');

if (empty($tid) || strlen($tid) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Identificador de transação ausente ou inválido.']);
    exit;
}

// Rate Limiting por IP + TID
$ip = getClientIp();
if (!checkRateLimit("status_{$ip}_{$tid}", 40, 60)) {
    http_response_code(429);
    echo json_encode(['error' => 'Muitas consultas simultâneas. Aguarde.']);
    exit;
}

$txDir = getStorageDir('transactions');
$txFile = $txDir . '/' . $tid . '.json';

if (!file_exists($txFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'Transação não encontrada.']);
    exit;
}

$rawTx = file_get_contents($txFile);
$tx = json_decode($rawTx, true);

if (!$tx) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao ler dados da transação.']);
    exit;
}

function buildRedirectUrl($tx) {
    $baseUpsell = env('UPSELL_URL', 'https://esquemasplacas.lovable.app/upsell');
    $parts = parse_url($baseUpsell);

    $query = [];
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $query);
    }

    $query['transaction_id'] = $tx['id'];

    $trackingKeys = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_id',
        'utm_term', 'utm_content', 'ref', 'src', 'sck'
    ];

    foreach ($trackingKeys as $key) {
        $val = trim($tx['tracking'][$key] ?? '');
        if ($val !== '') {
            $query[$key] = $val;
        }
    }

    $scheme   = isset($parts['scheme']) ? $parts['scheme'] . '://' : '';
    $host     = $parts['host'] ?? '';
    $port     = isset($parts['port']) ? ':' . $parts['port'] : '';
    $user     = $parts['user'] ?? '';
    $pass     = isset($parts['pass']) ? ':' . $parts['pass']  : '';
    $pass     = ($user || $pass) ? "$pass@" : '';
    $path     = $parts['path'] ?? '';
    $fragment = isset($parts['fragment']) ? '#' . $parts['fragment'] : '';

    return $scheme . $user . $pass . $host . $port . $path . '?' . http_build_query($query) . $fragment;
}

$nowIso = gmdate('Y-m-d\TH:i:s\Z');

// 1. Se já está paga -> retorno imediato com redirectUrl (Idempotência perfeita)
if ($tx['status'] === 'paid') {
    echo json_encode([
        'status'      => 'paid',
        'expiresAt'   => $tx['expiresAt'],
        'redirectUrl' => buildRedirectUrl($tx)
    ]);
    exit;
}

// 2. Se já expirou pelo tempo
if ($tx['status'] === 'pending' && $nowIso > $tx['expiresAt']) {
    $tx['status'] = 'expired';
    file_put_contents($txFile, json_encode($tx), LOCK_EX);
    echo json_encode([
        'status'    => 'expired',
        'expiresAt' => $tx['expiresAt']
    ]);
    exit;
}

if ($tx['status'] === 'expired' || $tx['status'] === 'failed') {
    echo json_encode([
        'status'    => $tx['status'],
        'expiresAt' => $tx['expiresAt']
    ]);
    exit;
}

// 3. Status é pending: consulta a BuckPay com cache de 3 segundos
$cacheDir = getStorageDir('cache');
$cacheFile = $cacheDir . '/buck_' . md5($tx['externalId']) . '.json';
$nowTime = time();

$buckpayStatus = 'pending';
$cacheHit = false;

if (file_exists($cacheFile)) {
    $cacheData = json_decode(file_get_contents($cacheFile), true);
    if ($cacheData && ($nowTime - $cacheData['time']) < 3) {
        $buckpayStatus = $cacheData['status'];
        $cacheHit = true;
    }
}

if (!$cacheHit) {
    $token = env('BUCKPAY_TOKEN');
    $baseUrl = rtrim(env('BUCKPAY_BASE_URL', 'https://api.realtechdev.com.br'), '/');
    $url = "$baseUrl/v1/transactions/external_id/" . urlencode($tx['externalId']);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            "Authorization: Bearer $token",
            'User-Agent: Buckpay API'
        ]
    ]);

    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resp && $httpCode === 200) {
        $resJson = json_decode($resp, true);
        $rawStatus = strtolower(trim($resJson['data']['status'] ?? 'pending'));

        if (in_array($rawStatus, ['paid', 'approved', 'completed', 'success'], true)) {
            $buckpayStatus = 'paid';
        } elseif (in_array($rawStatus, ['expired', 'canceled', 'cancelled', 'failed', 'refused'], true)) {
            $buckpayStatus = 'expired';
        } else {
            $buckpayStatus = 'pending';
        }

        @file_put_contents($cacheFile, json_encode([
            'time'   => $nowTime,
            'status' => $buckpayStatus
        ]), LOCK_EX);
    }
}

// 4. Se a BuckPay confirmou o pagamento: transição atômica
if ($buckpayStatus === 'paid') {
    $fp = fopen($txFile, 'r+');
    if ($fp && flock($fp, LOCK_EX)) {
        $currentContent = stream_get_contents($fp);
        $currentTx = json_decode($currentContent, true) ?: $tx;

        if ($currentTx['status'] !== 'paid') {
            $currentTx['status'] = 'paid';
            $currentTx['paidAt'] = $nowIso;
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($currentTx));
        }

        flock($fp, LOCK_UN);
        fclose($fp);
        $tx = $currentTx;
    }

    echo json_encode([
        'status'      => 'paid',
        'expiresAt'   => $tx['expiresAt'],
        'redirectUrl' => buildRedirectUrl($tx)
    ]);
    exit;
}

if ($buckpayStatus === 'expired' || $buckpayStatus === 'failed') {
    $tx['status'] = $buckpayStatus;
    file_put_contents($txFile, json_encode($tx), LOCK_EX);
    echo json_encode([
        'status'    => $buckpayStatus,
        'expiresAt' => $tx['expiresAt']
    ]);
    exit;
}

// Retorno padrão para pendente (inclui pixCode e qrCodeBase64 para retomada)
echo json_encode([
    'status'       => 'pending',
    'expiresAt'    => $tx['expiresAt'],
    'amountCents'  => $tx['amountCents'],
    'pixCode'      => $tx['pixCode'],
    'qrCodeBase64' => $tx['qrBase64'] ?? null
]);
