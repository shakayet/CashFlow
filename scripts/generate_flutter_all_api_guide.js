const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outDir = path.join(process.cwd(), 'docs');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(
  outDir,
  'CashFlowIQ_Complete_Flutter_API_Integration_Guide.pdf',
);
const doc = new PDFDocument({ size: 'A4', margin: 46, bufferPages: true });
doc.pipe(fs.createWriteStream(out));

const C = {
  ink: '#172033',
  muted: '#64748B',
  blue: '#2563EB',
  green: '#15803D',
  red: '#B91C1C',
  line: '#D8E0EA',
  pale: '#F8FAFC',
  code: '#111827',
  white: '#FFFFFF',
};
const W = doc.page.width - 92;
const success = (message, data = { id: '...' }, pagination) => ({
  success: true,
  message,
  ...(pagination
    ? { pagination: { page: 1, limit: 10, totalPage: 1, total: 1 } }
    : {}),
  ...(data !== undefined ? { data } : {}),
});
const auth = 'Bearer · USER/ADMIN/SUPER_ADMIN';
const admin = 'Bearer · ADMIN/SUPER_ADMIN';
const pub = 'Public';
const apple = 'Apple server only';
const pageData = [{ id: '...', createdAt: '2026-08-03T10:30:00.000Z' }];
const money = {
  id: '...',
  amount: 125.5,
  category: 'Salary',
  date: '2026-08-03T00:00:00.000Z',
  description: 'Example',
  fileUrl: null,
};

const modules = [
  [
    'System',
    [
      [
        'GET',
        '/ (outside /api/v1)',
        pub,
        'Basic server health page.',
        null,
        '200 text/html server-alive page',
        'Use the API hostname root, for example https://YOUR_API_HOST/. This endpoint returns HTML, not JSON.',
      ],
    ],
  ],
  [
    'Authentication',
    [
      [
        'POST',
        '/auth/login',
        pub,
        'Authenticate with email/password.',
        { email: 'user@example.com', password: 'password123' },
        success('User logged in successfully.', {
          accessToken: '<jwt>',
          refreshToken: '<jwt>',
        }),
      ],
      [
        'POST',
        '/auth/forget-password',
        pub,
        'Send a password-reset OTP.',
        { email: 'user@example.com' },
        success(
          'Please check your email. We have sent you a one-time passcode (OTP).',
          undefined,
        ),
      ],
      [
        'POST',
        '/auth/verify-email',
        pub,
        'Verify registration OTP or password-reset OTP.',
        { email: 'user@example.com', oneTimeCode: 123456 },
        success('Email verify successfully', null),
      ],
      [
        'POST',
        '/auth/reset-password',
        'Reset token in Authorization header',
        'Set a new password after reset OTP verification.',
        { newPassword: 'newPassword123', confirmPassword: 'newPassword123' },
        success('Your password has been successfully reset.', undefined),
        'Authorization header contains the reset token returned by verify-email; this is not an access JWT.',
      ],
      [
        'POST',
        '/auth/change-password',
        auth,
        'Change the authenticated user password.',
        {
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        },
        success('Your password has been successfully changed', undefined),
      ],
      [
        'POST',
        '/auth/resend-otp',
        pub,
        'Resend an email OTP.',
        { email: 'user@example.com' },
        {
          success: true,
          message: 'OTP resent successfully, please check your email',
        },
      ],
      [
        'POST',
        '/auth/refresh-token',
        pub,
        'Rotate access and refresh tokens.',
        { refreshToken: '<refresh-jwt>' },
        success('Token refreshed successfully.', {
          createToken: '<new-access-jwt>',
          refreshToken: '<new-refresh-jwt>',
        }),
        'The access token property is currently named createToken.',
      ],
    ],
  ],
  [
    'Users',
    [
      [
        'POST',
        '/user',
        pub,
        'Register a local user.',
        {
          name: 'Jane Doe',
          contact: '+15555550100',
          email: 'jane@example.com',
          password: 'password123',
        },
        success('User created successfully', {
          id: '...',
          name: 'Jane Doe',
          email: 'jane@example.com',
          verified: false,
        }),
      ],
      [
        'GET',
        '/user/profile',
        auth,
        'Get authenticated profile.',
        null,
        success('Profile data retrieved successfully', {
          id: '...',
          name: 'Jane Doe',
          email: 'jane@example.com',
          plan: 'Free',
          isPremium: false,
        }),
      ],
      [
        'PATCH',
        '/user/profile',
        auth,
        'Update profile and optional image.',
        { multipart: { data: '{"name":"Jane Doe"}', image: '<image file>' } },
        success('Profile updated successfully', {
          id: '...',
          name: 'Jane Doe',
          image: 'https://...',
        }),
        'Use multipart/form-data. data is a JSON string; image is optional.',
      ],
      [
        'DELETE',
        '/user/profile',
        auth,
        'Delete the authenticated account.',
        null,
        success('Account deleted successfully', { id: '...' }),
      ],
      [
        'GET',
        '/user',
        admin,
        'List users.',
        {
          query: 'page, limit, searchTerm, sortBy, sortOrder, and model fields',
        },
        success('Users retrieved successfully', pageData, true),
      ],
      [
        'PATCH',
        '/user/:id/status',
        admin,
        'Activate or block a user.',
        { status: 'block' },
        success('User status updated successfully', {
          id: '...',
          status: 'block',
        }),
      ],
    ],
  ],
  [
    'Google OAuth',
    [
      [
        'GET',
        '/oauth/google',
        pub,
        'Start Google OAuth in a browser/webview.',
        null,
        '302 Redirect to Google',
      ],
      [
        'GET',
        '/oauth/google/callback',
        'Google OAuth callback',
        'Google returns here; backend redirects to Flutter/web callback.',
        null,
        '302 Redirect: FRONTEND_OAUTH_CALLBACK_URL?accessToken=...&refreshToken=...&userId=...',
        'Do not call manually. Register and handle the configured callback/deep link.',
      ],
      [
        'GET',
        '/oauth/profile',
        'Bearer JWT',
        'Return JWT profile claims.',
        null,
        success('User profile retrieved successfully', {
          id: '...',
          email: 'user@example.com',
          role: 'USER',
        }),
      ],
      [
        'GET',
        '/oauth/status',
        pub,
        'Check configured OAuth providers.',
        null,
        success('OAuth provider status retrieved', {
          google: { configured: true, name: 'Google' },
        }),
      ],
      [
        'GET',
        '/oauth/login-failed',
        pub,
        'OAuth failure landing endpoint.',
        null,
        {
          success: false,
          message: 'OAuth login failed',
          error: 'Authentication was not successful',
        },
      ],
    ],
  ],
  [
    'Income',
    [
      [
        'GET',
        '/income',
        auth,
        'Monthly summary or detailed month records.',
        {
          query:
            'month=2026-08 OR month=8&year=2026; page, limit, sortBy, sortOrder',
        },
        success('Income list retrieved successfully', [money], true),
        'Without month/year, data is [{year, month, total}] and pagination is omitted.',
      ],
      [
        'POST',
        '/income',
        auth,
        'Create income with optional document/image.',
        {
          multipart: {
            data: '{"amount":125.5,"category":"Salary","date":"2026-08-03","description":"Example"}',
            doc: '<file>',
            image: '<file>',
          },
        },
        success('Income recorded successfully', money),
        'Use multipart/form-data; choose doc or image. JSON-only body is also accepted when no file is needed.',
      ],
      [
        'PATCH',
        '/income/:id',
        auth,
        'Update owned income.',
        {
          multipart: {
            data: '{"amount":150}',
            doc: '<optional file>',
            image: '<optional file>',
          },
        },
        success('Income updated successfully', { ...money, amount: 150 }),
      ],
      [
        'DELETE',
        '/income/:id',
        auth,
        'Delete owned income.',
        null,
        success('Income deleted successfully', { id: '...' }),
      ],
      [
        'GET',
        '/income/history',
        auth,
        'Paginated complete income history.',
        { query: 'page, limit, sortBy, sortOrder, category, date' },
        success('Income history retrieved successfully', [money], true),
      ],
    ],
  ],
  [
    'Expense',
    [
      [
        'GET',
        '/expense',
        auth,
        'Monthly summary or detailed month records.',
        {
          query:
            'month=2026-08 OR month=8&year=2026; page, limit, sortBy, sortOrder',
        },
        success(
          'Expense list retrieved successfully',
          [{ ...money, category: 'Food' }],
          true,
        ),
        'Without month/year, data is [{year, month, total}].',
      ],
      [
        'POST',
        '/expense',
        auth,
        'Create expense with optional document/image.',
        {
          multipart: {
            data: '{"amount":25.5,"category":"Food","date":"2026-08-03"}',
            doc: '<file>',
            image: '<file>',
          },
        },
        success('Expense recorded successfully', {
          ...money,
          amount: 25.5,
          category: 'Food',
        }),
      ],
      [
        'PATCH',
        '/expense/:id',
        auth,
        'Update owned expense.',
        {
          multipart: {
            data: '{"description":"Updated"}',
            doc: '<optional file>',
            image: '<optional file>',
          },
        },
        success('Expense updated successfully', { ...money, category: 'Food' }),
      ],
      [
        'DELETE',
        '/expense/:id',
        auth,
        'Delete owned expense.',
        null,
        success('Expense deleted successfully', { id: '...' }),
      ],
      [
        'GET',
        '/expense/history',
        auth,
        'Paginated complete expense history.',
        { query: 'page, limit, sortBy, sortOrder, category, date' },
        success(
          'Expense history retrieved successfully',
          [{ ...money, category: 'Food' }],
          true,
        ),
      ],
    ],
  ],
  [
    'Receipt OCR and Scan',
    [
      [
        'POST',
        '/ocr/analyze',
        auth,
        'Analyze receipt image or supplied OCR text without saving an expense.',
        {
          multipart: {
            file: '<receipt image>',
            text: '<alternative receipt text>',
          },
        },
        success('Receipt analyzed successfully', {
          amount: 42.75,
          category: 'Food',
        }),
        'Send either file or text.',
      ],
      [
        'POST',
        '/scan/extract-review',
        auth,
        'OCR a receipt and create an expense draft/record.',
        { multipart: { file: '<receipt image>' } },
        success('Expense created successfully', {
          ...money,
          category: 'Food',
          fileUrl: 'https://...',
        }),
      ],
      [
        'PATCH',
        '/scan/:id',
        auth,
        'Correct OCR-created expense.',
        {
          amount: 42.75,
          category: 'Food',
          date: '2026-08-03',
          description: 'Lunch',
          fileUrl: 'https://...',
          fileName: 'receipt.jpg',
        },
        success('Expense updated successfully', { ...money, category: 'Food' }),
      ],
    ],
  ],
  [
    'Audit Risk',
    [
      [
        'GET',
        '/audit-risk',
        auth,
        'Count income/expense records without evidence files.',
        null,
        success('Audit risk count retrieved successfully', { count: 3 }),
      ],
    ],
  ],
  [
    'Bank Transactions',
    [
      [
        'POST',
        '/bank-transaction',
        auth,
        'Create an owned bank transaction.',
        {
          amount: 125.5,
          bankName: 'Example Bank',
          accountNumberLast4Digits: '1234',
          refId: 'REF-123',
          date: '2026-08-03',
        },
        success('Bank transaction created successfully', {
          id: '...',
          amount: 125.5,
          bankName: 'Example Bank',
          accountNumberLast4Digits: '1234',
          refId: 'REF-123',
          date: '2026-08-03T00:00:00.000Z',
        }),
      ],
      [
        'GET',
        '/bank-transaction',
        auth,
        'List owned bank transactions.',
        { query: 'page, limit, searchTerm, sortBy, sortOrder' },
        success('Bank transactions retrieved successfully', pageData, true),
      ],
      [
        'PATCH',
        '/bank-transaction/:id',
        auth,
        'Update an owned bank transaction.',
        { amount: 150 },
        success('Bank transaction updated successfully', {
          id: '...',
          amount: 150,
        }),
      ],
      [
        'DELETE',
        '/bank-transaction/:id',
        auth,
        'Delete an owned bank transaction.',
        null,
        success('Bank transaction deleted successfully', undefined),
      ],
    ],
  ],
  [
    'Chat',
    [
      [
        'POST',
        '/chat/create-room',
        auth,
        'Create or return the user’s support room.',
        {},
        success('Chat room created successfully', {
          id: '...',
          participants: ['...'],
          admin: '...',
          user: '...',
        }),
      ],
      [
        'GET',
        '/chat/my-rooms',
        auth,
        'List chat rooms visible to the user/admin.',
        { query: 'page, limit, sortBy, sortOrder' },
        success('Chat rooms retrieved successfully', pageData, true),
      ],
      [
        'POST',
        '/chat/send-message/:chatRoomId',
        auth,
        'Send text, image, or PDF.',
        {
          multipart: {
            data: '{"messageType":"text","content":"Hello"}',
            file: '<image/pdf when applicable>',
          },
        },
        success('Message sent successfully', {
          id: '...',
          messageType: 'text',
          content: 'Hello',
          readBy: ['...'],
        }),
        'Use JSON body without file, or multipart with data JSON string and file.',
      ],
      [
        'GET',
        '/chat/:chatRoomId/messages',
        auth,
        'List room messages.',
        { query: 'page, limit, sortBy, sortOrder' },
        success('Chat messages retrieved successfully', pageData, true),
      ],
      [
        'PATCH',
        '/chat/:chatRoomId/mark-read',
        auth,
        'Mark other participants’ messages read.',
        null,
        success('Messages marked as read successfully', undefined),
      ],
    ],
  ],
  [
    'Reports',
    [
      [
        'GET',
        '/reports/pdf',
        auth,
        'Download financial report as PDF.',
        { query: 'startDate=2026-08-01&endDate=2026-08-31' },
        '200 application/pdf binary',
        'Use Flutter byte download/share handling, not JSON decoding.',
      ],
      [
        'GET',
        '/reports/excel',
        auth,
        'Download report as XLSX.',
        { query: 'startDate and endDate (optional ISO dates)' },
        '200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet binary',
      ],
      [
        'GET',
        '/reports/csv',
        auth,
        'Download report as CSV.',
        { query: 'startDate and endDate (optional ISO dates)' },
        '200 text/csv binary',
      ],
    ],
  ],
  [
    'Notices',
    [
      [
        'POST',
        '/notices',
        admin,
        'Create notice with document.',
        {
          multipart: {
            type: 'IRS Notice | Case Status',
            doc: '<file> OR document=<file>',
          },
        },
        success('Notice created successfully', {
          id: '...',
          type: 'IRS Notice',
          document: 'https://...',
        }),
      ],
      [
        'GET',
        '/notices',
        auth,
        'List notices.',
        { query: 'page, limit, sortBy, sortOrder, type' },
        success('Notices retrieved successfully', pageData, true),
      ],
      [
        'DELETE',
        '/notices/:id',
        admin,
        'Delete notice and document.',
        null,
        success('Notice deleted successfully', { id: '...' }),
      ],
    ],
  ],
  [
    'Terms and Conditions',
    [
      [
        'POST',
        '/terms-and-conditions',
        admin,
        'Create terms.',
        { title: 'Terms', description: '...' },
        success('Terms and Conditions created successfully', {
          id: '...',
          title: 'Terms',
          description: '...',
        }),
      ],
      [
        'GET',
        '/terms-and-conditions',
        pub,
        'List terms.',
        { query: 'page, limit, sortBy, sortOrder' },
        success('Terms and Conditions retrieved successfully', pageData, true),
      ],
      [
        'GET',
        '/terms-and-conditions/:id',
        pub,
        'Get one terms document.',
        null,
        success('Terms and Conditions retrieved successfully', {
          id: '...',
          title: 'Terms',
          description: '...',
        }),
      ],
      [
        'PATCH',
        '/terms-and-conditions/:id',
        admin,
        'Update terms.',
        { title: 'Updated Terms' },
        success('Terms and Conditions updated successfully', {
          id: '...',
          title: 'Updated Terms',
        }),
      ],
      [
        'DELETE',
        '/terms-and-conditions/:id',
        admin,
        'Delete terms.',
        null,
        success('Terms and Conditions deleted successfully', { id: '...' }),
      ],
    ],
  ],
  [
    'Privacy Policy',
    [
      [
        'POST',
        '/privacy-policy',
        admin,
        'Create privacy policy.',
        { title: 'Privacy Policy', description: '...' },
        success('Privacy Policy created successfully', {
          id: '...',
          title: 'Privacy Policy',
          description: '...',
        }),
      ],
      [
        'GET',
        '/privacy-policy',
        pub,
        'List privacy policies.',
        { query: 'page, limit, sortBy, sortOrder' },
        success('Privacy Policies retrieved successfully', pageData, true),
      ],
      [
        'GET',
        '/privacy-policy/:id',
        pub,
        'Get one privacy policy.',
        null,
        success('Privacy Policy retrieved successfully', {
          id: '...',
          title: 'Privacy Policy',
          description: '...',
        }),
      ],
      [
        'PATCH',
        '/privacy-policy/:id',
        admin,
        'Update privacy policy.',
        { description: 'Updated text' },
        success('Privacy Policy updated successfully', {
          id: '...',
          description: 'Updated text',
        }),
      ],
      [
        'DELETE',
        '/privacy-policy/:id',
        admin,
        'Delete privacy policy.',
        null,
        success('Privacy Policy deleted successfully', { id: '...' }),
      ],
    ],
  ],
  [
    'Apple Subscription',
    [
      [
        'POST',
        '/subscription/verify',
        auth,
        'Verify StoreKit 2 purchase.',
        { transactionId: '100000123456789', productId: 'premium_monthly' },
        success('Apple subscription verified successfully', {
          premium: true,
          expiresAt: '2026-09-03T10:30:00.000Z',
        }),
        'All /subscription routes are also mounted under the legacy /subscriptions prefix. New Flutter code should use /subscription.',
      ],
      [
        'GET',
        '/subscription/status',
        auth,
        'Get Apple-verified premium status.',
        null,
        success('Subscription status retrieved successfully', {
          premium: true,
          expiresAt: '2026-09-03T10:30:00.000Z',
        }),
      ],
      [
        'POST',
        '/subscription/restore',
        auth,
        'Restore Apple purchase history.',
        { originalTransactionId: '100000123456789' },
        success('Apple subscription restored successfully', {
          premium: true,
          expiresAt: '2026-09-03T10:30:00.000Z',
        }),
      ],
      [
        'GET',
        '/subscription/history',
        auth,
        'Get verified Apple renewal history.',
        null,
        success('Apple subscription history retrieved successfully', [
          {
            purchaseDate: '2026-08-03T10:30:00.000Z',
            expiresAt: '2026-09-03T10:30:00.000Z',
            productId: 'premium_monthly',
            transactionId: '...',
            originalTransactionId: '...',
            environment: 'Production',
            revoked: false,
          },
        ]),
      ],
      [
        'POST',
        '/subscription/notifications/test',
        admin,
        'Request Apple test notification.',
        { environment: 'Sandbox | Production' },
        success('Apple test notification requested', {
          testNotificationToken: '...',
        }),
      ],
      [
        'POST',
        '/subscription/notifications/history',
        admin,
        'Request Apple notification delivery history.',
        {
          environment: 'Sandbox',
          paginationToken: 'optional',
          startDate: 1785686400000,
          endDate: 1785772800000,
          notificationType: 'optional',
          notificationSubtype: 'optional',
          transactionId: 'optional',
          onlyFailures: false,
        },
        success('Apple notification history retrieved', {
          notificationHistory: [],
          hasMore: false,
        }),
      ],
      [
        'GET',
        '/subscription/notifications/history/:notificationId',
        admin,
        'Get locally processed notification metadata.',
        null,
        success('Apple notification details retrieved', {
          notificationUUID: '...',
          notificationType: 'DID_RENEW',
          processedAt: '2026-08-03T10:30:00.000Z',
        }),
      ],
      [
        'POST',
        '/apple/webhook',
        apple,
        'App Store Server Notifications V2 receiver.',
        { signedPayload: '<Apple JWS>' },
        '200 OK text',
        'Flutter must never call this endpoint.',
      ],
    ],
  ],
  [
    'Administration',
    [
      [
        'GET',
        '/admin/dashboard',
        admin,
        'Get revenue/user/subscription dashboard.',
        null,
        success('Dashboard data retrieved successfully', {
          totalRevenue: 1000,
          totalActiveUsers: 25,
          totalSubscribers: 10,
          newSubscribersLast60Days: 3,
          subscriptionDistribution: [],
        }),
      ],
      [
        'GET',
        '/admin/subscribers',
        admin,
        'List premium subscribers.',
        { query: 'page, limit, searchTerm, sortBy, sortOrder' },
        success('Subscribers retrieved successfully', pageData, true),
      ],
      [
        'GET',
        '/admin/monthly-revenue',
        admin,
        'Get last 12 months revenue.',
        null,
        success('Monthly revenue retrieved successfully', [
          { year: 2026, month: 8, revenue: 299 },
        ]),
      ],
      [
        'DELETE',
        '/admin/delete-account/:id',
        admin,
        'Delete user and related records.',
        null,
        success('Account and all related data deleted successfully', undefined),
      ],
      [
        'PATCH',
        '/admin/update-user/:id',
        admin,
        'Update user fields.',
        { name: 'Updated Name', status: 'active' },
        success('User updated successfully', {
          id: '...',
          name: 'Updated Name',
          status: 'active',
        }),
      ],
    ],
  ],
];

const endpointCount = modules.reduce((n, [, eps]) => n + eps.length, 0);
function space(h = 30) {
  if (doc.y + h > doc.page.height - 48) doc.addPage();
}
function h(text, size = 19, color = C.ink) {
  space(size + 18);
  doc
    .font('Helvetica-Bold')
    .fontSize(size)
    .fillColor(color)
    .text(text, { lineGap: 3 });
  doc.moveDown(0.35);
}
function p(text, opt = {}) {
  doc
    .font(opt.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opt.size || 8.8)
    .fillColor(opt.color || C.ink)
    .text(text, { lineGap: 2.7, ...opt });
  doc.moveDown(0.4);
}
function code(v, label = 'JSON') {
  const t = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  const ht = Math.max(38, t.split('\n').length * 9.4 + 22);
  space(Math.min(ht, 250));
  const y = doc.y;
  doc.roundedRect(46, y, W, ht, 4).fill(C.code);
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor('#93C5FD')
    .text(label, 55, y + 7);
  doc
    .font('Courier')
    .fontSize(6.7)
    .fillColor('#E5E7EB')
    .text(t, 55, y + 18, { width: W - 18, lineGap: 1.4 });
  doc.y = y + ht + 8;
}
function badge(text, color) {
  const width = Math.min(250, doc.widthOfString(text) + 12);
  doc.roundedRect(46, doc.y, width, 17, 3).fill(color);
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor(C.white)
    .text(text, 52, doc.y + 5);
  doc.y += 23;
}
function endpoint(ep, index) {
  const [method, route, access, purpose, request, response, note] = ep;
  doc.addPage();
  badge(`${index}. ${method}`, method === 'GET' ? C.green : C.blue);
  h(route, 14, C.ink);
  p(purpose, { size: 9.5 });
  p(`Access: ${access}`, {
    bold: true,
    color: access === pub ? C.green : access === apple ? C.red : C.blue,
  });
  h('Request', 11, C.blue);
  if (request === null) p('No request body.');
  else code(request, request.multipart ? 'MULTIPART / QUERY' : 'JSON / QUERY');
  h('Success response', 11, C.blue);
  code(response, typeof response === 'string' ? 'HTTP' : 'JSON');
  if (note) {
    h('Integration note', 11, C.blue);
    p(note);
  }
}

// Cover
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F8FAFC');
doc.rect(0, 0, doc.page.width, 205).fill(C.ink);
doc
  .font('Helvetica-Bold')
  .fontSize(11)
  .fillColor('#93C5FD')
  .text('CASHFLOWIQ · COMPLETE API REFERENCE', 46, 52);
doc
  .font('Helvetica-Bold')
  .fontSize(28)
  .fillColor(C.white)
  .text('Flutter API\nIntegration Handbook', 46, 86, { lineGap: 5 });
doc
  .font('Helvetica')
  .fontSize(11)
  .fillColor(C.muted)
  .text(
    `${endpointCount} endpoints · ${modules.length} modules · API v1`,
    46,
    244,
  );
doc.roundedRect(46, 285, W, 145, 7).fill(C.white).stroke(C.line);
doc
  .font('Helvetica-Bold')
  .fontSize(10)
  .fillColor(C.blue)
  .text('BASE URL', 64, 307);
doc
  .font('Courier-Bold')
  .fontSize(10)
  .fillColor(C.ink)
  .text('https://YOUR_API_HOST/api/v1', 64, 331);
doc
  .font('Helvetica')
  .fontSize(9)
  .fillColor(C.ink)
  .text('Default JSON header: Content-Type: application/json', 64, 366)
  .text('Protected header: Authorization: Bearer <accessToken>', 64, 390)
  .text(
    'Generated from current Express routes, validation, and controllers',
    64,
    414,
  );

doc.addPage();
h('How to use this handbook');
p(
  'This document covers every currently mounted HTTP endpoint. Replace :id, :chatRoomId, and :notificationId with actual identifiers. Examples shorten MongoDB documents to their mobile-relevant fields.',
);
h('Standard success envelope', 13, C.blue);
code(success('Operation completed', { id: '...' }));
h('Standard error envelope', 13, C.blue);
code({
  success: false,
  message: 'Human-readable error',
  errorMessages: [{ path: 'fieldName', message: 'Detailed error' }],
});
h('Pagination', 13, C.blue);
p(
  'List endpoints commonly accept page, limit, sortBy, sortOrder, searchTerm, and model-specific filters. The response includes pagination when shown in the endpoint example.',
);
h('Files', 13, C.blue);
p(
  'For multipart requests, do not manually force the multipart boundary in Flutter. Let Dio/http MultipartRequest build Content-Type. Fields named data contain a JSON-encoded string where documented.',
);
h('Role labels', 13, C.blue);
p(
  'USER is the regular mobile user. ADMIN and SUPER_ADMIN routes must only appear in authorized admin builds. Apple server-only routes must never be invoked by Flutter.',
);
h('Module index', 13, C.blue);
modules.forEach(([name, eps]) =>
  p(`${name}: ${eps.length} endpoint${eps.length === 1 ? '' : 's'}`),
);

let idx = 1;
for (const [name, eps] of modules) {
  doc.addPage();
  h(name);
  p(`${eps.length} endpoint${eps.length === 1 ? '' : 's'} in this module.`, {
    color: C.muted,
  });
  eps.forEach(ep => {
    const [m, r, a, purpose] = ep;
    p(`${idx}. ${m} ${r} — ${purpose}`, { size: 8.5 });
    idx += 1;
  });
  idx -= eps.length;
  for (const ep of eps) {
    endpoint(ep, idx);
    idx += 1;
  }
}

doc.addPage();
h('Flutter implementation checklist');
[
  'Configure API base URL per flavor; never hard-code production URLs in widgets.',
  'Store access and refresh tokens in secure storage.',
  'Attach Bearer access JWT only to protected routes.',
  'Refresh authentication once on 401; avoid infinite retry loops.',
  'Parse ISO timestamps as UTC and format only in the UI layer.',
  'Use typed response models and handle data being null or an empty array.',
  'Use multipart requests for profile, income, expense, notices, scan, OCR, and chat attachments.',
  'Treat report responses as bytes/files, not JSON.',
  'Hide admin routes from regular-user builds and enforce roles server-side.',
  'Never call /apple/webhook from Flutter or ship Apple server credentials.',
  'Log request IDs/statuses safely; never log passwords, JWTs, or reset tokens.',
].forEach(x => p(`• ${x}`));

doc.end();
console.log(out);
