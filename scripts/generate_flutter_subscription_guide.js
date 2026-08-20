const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputDir = path.join(process.cwd(), 'docs');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(
  outputDir,
  'Flutter_Apple_Subscription_API_Integration_Guide.pdf',
);

const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
doc.pipe(fs.createWriteStream(outputPath));

const colors = {
  ink: '#172033',
  muted: '#5E6B7D',
  blue: '#2563EB',
  paleBlue: '#EFF6FF',
  green: '#15803D',
  paleGreen: '#F0FDF4',
  red: '#B91C1C',
  paleRed: '#FEF2F2',
  line: '#D8E0EA',
  code: '#111827',
  codeText: '#E5E7EB',
  white: '#FFFFFF',
};

const pageWidth = doc.page.width - 96;

function ensureSpace(height) {
  if (doc.y + height > doc.page.height - 56) doc.addPage();
}

function heading(text, level = 1) {
  const sizes = { 1: 22, 2: 16, 3: 12 };
  ensureSpace(level === 1 ? 44 : 32);
  doc
    .font('Helvetica-Bold')
    .fontSize(sizes[level])
    .fillColor(level === 1 ? colors.ink : colors.blue)
    .text(text, { lineGap: 3 });
  doc.moveDown(level === 1 ? 0.45 : 0.3);
}

function paragraph(text, options = {}) {
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 9.5)
    .fillColor(options.color || colors.ink)
    .text(text, { lineGap: 3, ...options });
  doc.moveDown(0.55);
}

function bullet(text) {
  ensureSpace(22);
  const y = doc.y;
  doc.circle(55, y + 5, 2).fill(colors.blue);
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(colors.ink)
    .text(text, 66, y, { width: pageWidth - 18, lineGap: 3 });
  doc.moveDown(0.35);
}

function label(text, color = colors.blue) {
  ensureSpace(24);
  const width = doc.widthOfString(text) + 14;
  const y = doc.y;
  doc.roundedRect(48, y, width, 18, 4).fill(color);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(colors.white)
    .text(text, 55, y + 5);
  doc.y = y + 25;
}

function code(value, language = 'JSON') {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const lines = text.split('\n').length;
  const height = Math.max(44, lines * 11 + 24);
  ensureSpace(Math.min(height, 260));
  const y = doc.y;
  doc.roundedRect(48, y, pageWidth, height, 5).fill(colors.code);
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#93C5FD')
    .text(language, 58, y + 8);
  doc
    .font('Courier')
    .fontSize(7.7)
    .fillColor(colors.codeText)
    .text(text, 58, y + 21, {
      width: pageWidth - 20,
      lineGap: 2,
    });
  doc.y = y + height + 10;
}

function note(title, text, type = 'info') {
  const palette =
    type === 'danger'
      ? [colors.paleRed, colors.red]
      : type === 'success'
        ? [colors.paleGreen, colors.green]
        : [colors.paleBlue, colors.blue];
  ensureSpace(62);
  const y = doc.y;
  const bodyHeight = doc.heightOfString(text, {
    width: pageWidth - 28,
    lineGap: 3,
  });
  const height = bodyHeight + 35;
  doc.roundedRect(48, y, pageWidth, height, 5).fill(palette[0]);
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(palette[1])
    .text(title, 60, y + 10);
  doc
    .font('Helvetica')
    .fontSize(8.8)
    .fillColor(colors.ink)
    .text(text, 60, y + 25, { width: pageWidth - 24, lineGap: 3 });
  doc.y = y + height + 10;
}

function endpoint(method, route, purpose) {
  ensureSpace(56);
  const y = doc.y;
  const methodColor = method === 'GET' ? colors.green : colors.blue;
  doc.roundedRect(48, y, pageWidth, 44, 5).fill('#F8FAFC').stroke(colors.line);
  doc.roundedRect(58, y + 10, 42, 20, 4).fill(methodColor);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(colors.white)
    .text(method, 65, y + 16);
  doc
    .font('Courier-Bold')
    .fontSize(9.5)
    .fillColor(colors.ink)
    .text(route, 110, y + 11);
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(colors.muted)
    .text(purpose, 110, y + 26, { width: pageWidth - 125 });
  doc.y = y + 54;
}

// Cover
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F8FAFC');
doc.rect(0, 0, doc.page.width, 185).fill(colors.ink);
doc
  .font('Helvetica-Bold')
  .fontSize(12)
  .fillColor('#93C5FD')
  .text('CASHFLOWIQ  /  MOBILE INTEGRATION', 48, 56);
doc
  .font('Helvetica-Bold')
  .fontSize(29)
  .fillColor(colors.white)
  .text('Flutter Apple Subscription\nAPI Integration Guide', 48, 88, {
    lineGap: 5,
  });
doc
  .font('Helvetica')
  .fontSize(11)
  .fillColor(colors.muted)
  .text(
    'StoreKit 2 purchase verification, premium status, restore, and history',
    48,
    224,
    { width: pageWidth },
  );
doc
  .roundedRect(48, 278, pageWidth, 138, 8)
  .fill(colors.white)
  .stroke(colors.line);
doc
  .font('Helvetica-Bold')
  .fontSize(10)
  .fillColor(colors.blue)
  .text('DOCUMENT DETAILS', 66, 298);
doc
  .font('Helvetica')
  .fontSize(9.5)
  .fillColor(colors.ink)
  .text('API version: v1', 66, 325)
  .text('Backend path: /api/v1/subscription', 66, 348)
  .text('Platform: Flutter / iOS / StoreKit 2', 66, 371)
  .text('Updated: August 3, 2026', 66, 394);
doc
  .font('Helvetica')
  .fontSize(8.5)
  .fillColor(colors.muted)
  .text(
    'Audience: Flutter developers integrating authenticated Apple auto-renewable subscriptions.',
    48,
    470,
    { width: pageWidth, align: 'center' },
  );

doc.addPage();
heading('1. Integration overview');
paragraph(
  'The Flutter app completes a StoreKit 2 purchase and sends only the Apple transaction ID and expected product ID to the backend. The backend contacts Apple, verifies Apple-signed transaction data, stores the subscription, and returns premium access.',
);
note(
  'Security rule',
  'Never calculate premium access from a client-provided purchase date, expiry date, boolean, receipt payload, or local device state. Treat the backend response as the source of truth.',
  'danger',
);
heading('Base URL', 2);
code('https://YOUR_API_HOST/api/v1/subscription', 'TEXT');
paragraph(
  'Replace YOUR_API_HOST with the production or staging backend hostname. The legacy plural prefix /api/v1/subscriptions is also supported, but new Flutter code should use the singular path shown above.',
);
heading('Authentication', 2);
paragraph('All four Flutter-facing subscription endpoints require an access JWT:');
code(
  `Authorization: Bearer <accessToken>\nContent-Type: application/json`,
  'HTTP HEADERS',
);
paragraph(
  'The accessToken is returned by POST /api/v1/auth/login. A refresh token must not be used in this Authorization header.',
);
heading('Recommended app flow', 2);
bullet('App starts or resumes: call GET /status and update premium UI.');
bullet('Purchase succeeds in StoreKit 2: call POST /verify.');
bullet('User selects Restore Purchases: call POST /restore.');
bullet('Subscription screen needs renewal records: call GET /history.');
bullet('On HTTP 401: refresh/login, then retry once.');

heading('2. Endpoint summary');
endpoint('POST', '/api/v1/subscription/verify', 'Verify a completed StoreKit purchase.');
endpoint('GET', '/api/v1/subscription/status', 'Get current backend-verified premium access.');
endpoint('POST', '/api/v1/subscription/restore', 'Restore subscription ownership and history.');
endpoint('GET', '/api/v1/subscription/history', 'Get verified Apple transaction history.');
note(
  'Backend-only routes',
  '/api/v1/apple/webhook and /notifications/* are for Apple or administrators. The Flutter app must never call them.',
);

doc.addPage();
heading('3. Verify purchase');
endpoint('POST', '/api/v1/subscription/verify', 'Call immediately after StoreKit reports a verified purchase.');
heading('Request JSON', 2);
code({
  transactionId: '100000123456789',
  productId: 'premium_monthly',
});
paragraph(
  'transactionId must be the StoreKit 2 transaction identifier. productId must exactly match the App Store Connect product identifier and the product allowlist configured on the backend.',
);
heading('Success: 200 OK', 2);
code({
  success: true,
  message: 'Apple subscription verified successfully',
  data: {
    premium: true,
    expiresAt: '2026-09-03T10:30:00.000Z',
  },
});
heading('Flutter behavior', 2);
bullet('Set premium UI from data.premium.');
bullet('Parse data.expiresAt as UTC using DateTime.parse(...).toUtc().');
bullet('Persist only for UI caching; re-check /status on the next app launch.');
bullet('Finish the StoreKit transaction after the backend verifies it successfully.');
note(
  'Do not send extra fields',
  'The backend intentionally ignores client expiry, price, status, plan, environment, and purchase dates. Apple-signed values replace all client claims.',
  'danger',
);

heading('4. Subscription status');
endpoint('GET', '/api/v1/subscription/status', 'Call on launch, resume, login, and after purchase/restore.');
heading('Request body', 2);
paragraph('No body. Send the Authorization header only.');
heading('Active success: 200 OK', 2);
code({
  success: true,
  message: 'Subscription status retrieved successfully',
  data: {
    premium: true,
    expiresAt: '2026-09-03T10:30:00.000Z',
  },
});
heading('No active subscription: 200 OK', 2);
code({
  success: true,
  message: 'Subscription status retrieved successfully',
  data: { premium: false, expiresAt: null },
});
paragraph(
  'Billing grace period may return premium: true until Apple’s signed grace-period expiry. Billing retry without grace, expiry, refund, and revocation return premium: false.',
);

doc.addPage();
heading('5. Restore purchases');
endpoint('POST', '/api/v1/subscription/restore', 'Use from a user-initiated Restore Purchases action.');
heading('Request JSON', 2);
code({ originalTransactionId: '100000123456789' });
paragraph(
  'Use the original transaction ID from StoreKit 2. The backend fetches the complete Apple history, verifies each signed transaction, and associates the subscription with the authenticated CashFlowIQ user.',
);
heading('Success: 200 OK', 2);
code({
  success: true,
  message: 'Apple subscription restored successfully',
  data: {
    premium: true,
    expiresAt: '2026-09-03T10:30:00.000Z',
  },
});
note(
  'Account ownership protection',
  'If an Apple original transaction is already linked to another CashFlowIQ account, the API returns HTTP 409. Do not silently switch accounts; explain that the subscription is linked elsewhere.',
  'info',
);

heading('6. Subscription history');
endpoint('GET', '/api/v1/subscription/history', 'Returns verified purchase and renewal transactions.');
heading('Success: 200 OK', 2);
code({
  success: true,
  message: 'Apple subscription history retrieved successfully',
  data: [
    {
      purchaseDate: '2026-08-03T10:30:00.000Z',
      expiresAt: '2026-09-03T10:30:00.000Z',
      productId: 'premium_monthly',
      transactionId: '100000123456789',
      originalTransactionId: '100000123456700',
      environment: 'Production',
      revoked: false,
    },
  ],
});
paragraph('A user without subscription history receives data: [].');

doc.addPage();
heading('7. Error responses');
paragraph('All handled errors use this JSON structure:');
code({
  success: false,
  message: 'Human-readable error summary',
  errorMessages: [
    { path: '', message: 'Detailed error message' },
  ],
});
heading('Important HTTP statuses', 2);
bullet('400 Bad Request — missing/invalid JSON, wrong product ID, or unsupported product.');
bullet('401 Unauthorized — missing, malformed, expired, or invalid access token.');
bullet('403 Forbidden — authenticated role cannot use the route.');
bullet('404 Not Found — no Apple purchase history was found during restore.');
bullet('409 Conflict — Apple subscription belongs to another app account.');
bullet('502 Bad Gateway — Apple returned incomplete or inconsistent data.');
bullet('503 Service Unavailable — Apple backend credentials/product mapping are unavailable.');
bullet('500 Internal Server Error — unexpected backend failure; show retry UI and log safely.');
heading('Validation error example', 2);
code({
  success: false,
  message: 'Validation Error',
  errorMessages: [
    { path: 'transactionId', message: 'String must contain at least 1 character(s)' },
  ],
});
heading('Recommended client policy', 2);
bullet('Never retry 400 or 409 automatically.');
bullet('For 401, refresh authentication and retry once.');
bullet('Retry 429/500/502/503 with capped exponential backoff.');
bullet('Do not display raw server stack traces or Apple payloads to users.');

doc.addPage();
heading('8. Flutter HTTP example');
paragraph('Example using package:http. Adapt token storage and error classes to the app architecture.');
code(
  `Future<Map<String, dynamic>> verifyApplePurchase({
  required String baseUrl,
  required String accessToken,
  required String transactionId,
  required String productId,
}) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/v1/subscription/verify'),
    headers: {
      'Authorization': 'Bearer $accessToken',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'transactionId': transactionId,
      'productId': productId,
    }),
  );

  final json = jsonDecode(response.body) as Map<String, dynamic>;
  if (response.statusCode != 200 || json['success'] != true) {
    throw ApiException(
      response.statusCode,
      json['message']?.toString() ?? 'Subscription verification failed',
    );
  }
  return json['data'] as Map<String, dynamic>;
}`,
  'DART',
);
heading('Status model', 2);
code(
  `class PremiumStatus {
  final bool premium;
  final DateTime? expiresAt;

  PremiumStatus.fromJson(Map<String, dynamic> json)
      : premium = json['premium'] == true,
        expiresAt = json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String).toUtc();
}`,
  'DART',
);
note(
  'StoreKit package',
  'Whichever Flutter in-app-purchase package is used, extract the StoreKit 2 transactionId/originalTransactionId from verified purchase data. Do not send Apple credentials, private keys, or server JWTs from Flutter.',
);

doc.addPage();
heading('9. Suggested Flutter state flow');
heading('On app launch or resume', 2);
bullet('If authenticated, call GET /status.');
bullet('Show a neutral loading state while status is unknown.');
bullet('Apply premium entitlements only when data.premium is true.');
bullet('If offline, cached status may shape UI but must not authorize sensitive server features.');
heading('After StoreKit purchase', 2);
bullet('Confirm the StoreKit result is locally verified by the StoreKit integration.');
bullet('Send transactionId and productId to POST /verify.');
bullet('When premium is true, finish/complete the StoreKit transaction.');
bullet('Refresh premium-gated screens and optionally fetch /history.');
heading('Restore action', 2);
bullet('Start the platform restore/sync flow.');
bullet('Obtain originalTransactionId from the restored StoreKit transaction.');
bullet('Call POST /restore and use the returned premium status.');
heading('Logout', 2);
bullet('Clear access/refresh tokens and cached subscription response.');
bullet('Do not carry premium state into a different CashFlowIQ login.');
note(
  'Testing',
  'Use Apple Sandbox accounts and backend Sandbox auto-detection. Test new purchase, renewal, expiry, billing retry/grace, refund/revoke, restore, expired JWT, and subscription-linked-to-another-account behavior.',
  'success',
);

doc.addPage();
heading('10. Flutter handoff checklist');
bullet('Production and staging API base URLs are configured per build flavor.');
bullet('Authorization uses the access token with the exact "Bearer " prefix.');
bullet('Product IDs exactly match App Store Connect and backend APPLE_PRODUCT_MAP.');
bullet('POST /verify runs after every successful StoreKit subscription purchase.');
bullet('GET /status runs on launch, resume, and after login.');
bullet('Restore Purchases is visible and calls POST /restore.');
bullet('All timestamps are parsed as UTC.');
bullet('Premium false and expiresAt null are handled normally.');
bullet('401 refreshes authentication once; 409 shows an account-linking message.');
bullet('Flutter never calls Apple webhook or admin notification endpoints.');
bullet('No Apple private key, issuer ID, key ID, or server JWT is shipped in the app.');
bullet('StoreKit transaction is finished only after successful backend verification.');
note(
  'Backend contact information',
  'Before release, obtain the final API hostname and exact production product IDs from the backend team. Those deployment-specific values are intentionally not embedded in this document.',
);

doc.end();
console.log(outputPath);
