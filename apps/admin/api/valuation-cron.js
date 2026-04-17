import valuationPackHandler from './valuation-pack.js';

function getAuthorizationHeader(headers) {
  if (!headers) {
    return '';
  }

  if (typeof headers.get === 'function') {
    return headers.get('authorization') || '';
  }

  return headers.authorization || headers.Authorization || '';
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authorization = getAuthorizationHeader(request?.headers);
  return authorization === `Bearer ${secret}`;
}

export default async function valuationCronHandler(request, response) {
  if (request?.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAuthorized(request)) {
    response.status(401).json({ error: 'Unauthorized cron request' });
    return;
  }

  return valuationPackHandler(
    {
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: new Date().toISOString(),
      },
    },
    response,
  );
}
