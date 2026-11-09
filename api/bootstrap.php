<?php
/**
 * Bootstrap comum para a API do Checkout DiagLava
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Carregar variáveis de ambiente do .env
function loadEnv($path = __DIR__ . '/../.env') {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            if (!isset($_ENV[$key])) {
                $_ENV[$key] = $val;
                putenv("$key=$val");
            }
        }
    }
}

loadEnv();

function env($key, $default = '') {
    $defaults = [
        'BUCKPAY_TOKEN'       => 'sk_live_e77fe478f994c90fb5951f6c396adfb6',
        'BUCKPAY_BASE_URL'    => 'https://api.realtechdev.com.br',
        'PRODUCT_NAME'        => 'DiagLava - Conserto na Palma da Mão',
        'PRODUCT_PRICE_CENTS' => '3700',
        'UPSELL_URL'          => 'https://esquemasplacas.lovable.app/upsell',
        'PIX_EXPIRY_SECONDS'  => '900'
    ];
    return $_ENV[$key] ?? getenv($key) ?: ($defaults[$key] ?? $default);
}

function getClientIp() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return trim($_SERVER['HTTP_X_REAL_IP']);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

function checkRateLimit($key, $maxRequests, $windowSeconds) {
    $dir = __DIR__ . '/../storage/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $file = $dir . '/' . md5($key) . '.json';
    $now = time();

    $data = ['count' => 0, 'reset' => $now + $windowSeconds];
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        $parsed = json_decode($content, true);
        if ($parsed && $parsed['reset'] > $now) {
            $data = $parsed;
        }
    }

    if ($data['count'] >= $maxRequests) {
        return false;
    }

    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

function isValidFullName($name) {
    if (empty($name)) return false;
    $trimmed = trim($name);
    $parts = preg_split('/\s+/u', $trimmed);
    if (count($parts) < 2) return false;
    foreach ($parts as $part) {
        if (!preg_match('/^[\p{L}]{2,}$/u', $part)) {
            return false;
        }
    }
    return true;
}

function isValidBrazilianPhone($phone) {
    $clean = preg_replace('/\D/', '', $phone);
    if (strlen($clean) !== 10 && strlen($clean) !== 11) {
        return false;
    }

    $validDdds = [
        '11','12','13','14','15','16','17','18','19',
        '21','22','24','27','28',
        '31','32','33','34','35','37','38',
        '41','42','43','44','45','46','47','48','49',
        '51','53','54','55',
        '61','62','64','63','65','66','67',
        '71','73','74','75','77','79',
        '81','87','82','83','84',
        '85','88','86','89','98','99','91','93','94','96','92','97','95','68','69'
    ];

    $ddd = substr($clean, 0, 2);
    if (!in_array($ddd, $validDdds, true)) {
        return false;
    }

    if (strlen($clean) === 11 && $clean[2] !== '9') {
        return false;
    }

    // Evita sequências repetidas como 11111111111
    if (count(array_unique(str_split($clean))) === 1) {
        return false;
    }

    return true;
}

function normalizePhoneForGateway($phone) {
    $clean = preg_replace('/\D/', '', $phone);
    if (strpos($clean, '55') === 0 && (strlen($clean) === 12 || strlen($clean) === 13)) {
        return $clean;
    }
    return '55' . $clean;
}

function generateUuid() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function getStorageDir($subdir) {
    $dir = __DIR__ . '/../storage/' . $subdir;
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}
