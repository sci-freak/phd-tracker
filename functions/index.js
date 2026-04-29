const admin = require('firebase-admin');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { google } = require('googleapis');
const crypto = require('crypto');

admin.initializeApp();

const GOOGLE_CALENDAR_CLIENT_ID = defineSecret('GOOGLE_CALENDAR_CLIENT_ID');
const GOOGLE_CALENDAR_CLIENT_SECRET = defineSecret('GOOGLE_CALENDAR_CLIENT_SECRET');
const GOOGLE_CALENDAR_REDIRECT_URI = defineSecret('GOOGLE_CALENDAR_REDIRECT_URI');

const db = admin.firestore();
const CONNECTION_COLLECTION = 'googleCalendarConnections';
const STATE_TTL_MS = 10 * 60 * 1000;
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';

// Allowlist of origins that can call the HTTP endpoints from a browser.
// Native (React Native, Electron) clients don't send an Origin header, so they
// bypass this check naturally. Add staging/preview domains here if needed.
const ALLOWED_ORIGINS = new Set([
  'https://phd-tracker-ae84e.firebaseapp.com',
  'https://phd-tracker-ae84e.web.app',
  'http://localhost:5173',
  'http://localhost:4173'
]);
const CORS_BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
  'Vary': 'Origin'
};

const getOAuthClient = () => {
  const clientId = GOOGLE_CALENDAR_CLIENT_ID.value().trim();
  const clientSecret = GOOGLE_CALENDAR_CLIENT_SECRET.value().trim();
  const redirectUri = GOOGLE_CALENDAR_REDIRECT_URI.value().trim();

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

const getConnectionRef = (uid) => db.collection(CONNECTION_COLLECTION).doc(uid);
const getStateRef = (stateId) => db.collection('_googleCalendarAuthStates').doc(stateId);
const hasUsableAccessToken = (connection = {}) =>
  Boolean(connection.accessToken) &&
  (!connection.expiryDate || connection.expiryDate > Date.now());

const requireAuth = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  return request.auth.uid;
};

const applyCors = (req, res) => {
  Object.entries(CORS_BASE_HEADERS).forEach(([header, value]) => {
    res.set(header, value);
  });
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
};

const handleOptions = (req, res) => {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).send('');
    return true;
  }
  return false;
};

const requireHttpAuth = async (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', 'Missing Firebase auth token.');
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded.uid;
};

exports.getGoogleCalendarAuthUrl = onCall(
  {
    secrets: [GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI]
  },
  async (request) => {
    const uid = requireAuth(request);
    const stateId = crypto.randomUUID();

    await getStateRef(stateId).set({
      uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const oauth2Client = getOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [CALENDAR_SCOPE],
      prompt: 'consent',
      state: stateId,
      include_granted_scopes: true
    });

    return { authUrl };
  }
);

exports.googleCalendarOAuthCallback = onRequest(
  {
    secrets: [GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI]
  },
  async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        res.status(400).send(`Google Calendar authorization failed: ${error}`);
        return;
      }

      if (!code || !state) {
        res.status(400).send('Missing code or state.');
        return;
      }

      const stateDoc = await getStateRef(String(state)).get();
      if (!stateDoc.exists) {
        res.status(200).send(
          '<html><body style="font-family:sans-serif;padding:2rem;">Google Calendar authorization was already completed or the link expired. You can return to PhD Tracker.</body></html>'
        );
        return;
      }

      const stateData = stateDoc.data();
      const createdAt = stateData.createdAt?.toMillis?.() || 0;
      if (createdAt && Date.now() - createdAt > STATE_TTL_MS) {
        await stateDoc.ref.delete();
        res.status(200).send(
          '<html><body style="font-family:sans-serif;padding:2rem;">Google Calendar authorization link expired. Please return to PhD Tracker and try connecting again.</body></html>'
        );
        return;
      }

      const uid = stateData.uid;
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(String(code));
      console.log('googleCalendarOAuthCallback token exchange', {
        uid,
        hasRefreshToken: Boolean(tokens.refresh_token),
        hasAccessToken: Boolean(tokens.access_token),
        expiryDate: tokens.expiry_date || null,
        scope: tokens.scope || CALENDAR_SCOPE
      });

      const connectionUpdate = {
        accessToken: tokens.access_token || '',
        expiryDate: tokens.expiry_date || null,
        scope: tokens.scope || CALENDAR_SCOPE,
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (tokens.refresh_token) {
        connectionUpdate.refreshToken = tokens.refresh_token;
      }

      await getConnectionRef(uid).set(connectionUpdate, { merge: true });
      console.log('googleCalendarOAuthCallback stored connection', {
        uid,
        storedRefreshToken: Boolean(connectionUpdate.refreshToken),
        storedAccessToken: Boolean(connectionUpdate.accessToken),
        storedExpiryDate: connectionUpdate.expiryDate || null
      });

      await stateDoc.ref.delete();

      res.status(200).send(
        '<html><body style="font-family:sans-serif;padding:2rem;">Google Calendar connected. You can close this window and return to PhD Tracker.</body></html>'
      );
    } catch (error) {
      console.error('googleCalendarOAuthCallback failed', error);
      res.status(500).send('Failed to complete Google Calendar authorization.');
    }
  }
);

exports.getGoogleCalendarAuthUrlHttp = onRequest(
  {
    secrets: [GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI]
  },
  async (req, res) => {
    if (handleOptions(req, res)) {
      return;
    }

    try {
      applyCors(req, res);
      const uid = await requireHttpAuth(req);
      const stateId = crypto.randomUUID();

      await getStateRef(stateId).set({
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const oauth2Client = getOAuthClient();
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [CALENDAR_SCOPE],
        prompt: 'consent',
        state: stateId,
        include_granted_scopes: true
      });

      res.status(200).json({ authUrl });
    } catch (error) {
      console.error('getGoogleCalendarAuthUrlHttp failed', error);
      const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
      res.status(statusCode).json({ error: error.message || 'Failed to start Google Calendar auth.' });
    }
  }
);

exports.listGoogleCalendarEvents = onCall(
  {
    secrets: [GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI]
  },
  async (request) => {
    const uid = requireAuth(request);
    const connectionDoc = await getConnectionRef(uid).get();

    if (!connectionDoc.exists) {
      throw new HttpsError('failed-precondition', 'Google Calendar is not connected.');
    }

    const connection = connectionDoc.data();
    const oauth2Client = getOAuthClient();

    if (connection.refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: connection.refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      await connectionDoc.ref.set(
        {
          accessToken: credentials.access_token || '',
          expiryDate: credentials.expiry_date || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } else if (hasUsableAccessToken(connection)) {
      oauth2Client.setCredentials({
        access_token: connection.accessToken
      });
    } else {
      throw new HttpsError('failed-precondition', 'Google Calendar reconnect is required.');
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime'
    });

    return {
      items: response.data.items || []
    };
  }
);

exports.listGoogleCalendarEventsHttp = onRequest(
  {
    secrets: [GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI]
  },
  async (req, res) => {
    if (handleOptions(req, res)) {
      return;
    }

    try {
      applyCors(req, res);
      const uid = await requireHttpAuth(req);
      const connectionDoc = await getConnectionRef(uid).get();

      if (!connectionDoc.exists) {
        res.status(412).json({ error: 'Google Calendar is not connected.' });
        return;
      }

      const connection = connectionDoc.data();
      const oauth2Client = getOAuthClient();

      if (connection.refreshToken) {
        oauth2Client.setCredentials({
          refresh_token: connection.refreshToken
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        await connectionDoc.ref.set(
          {
            accessToken: credentials.access_token || '',
            expiryDate: credentials.expiry_date || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      } else if (hasUsableAccessToken(connection)) {
        oauth2Client.setCredentials({
          access_token: connection.accessToken
        });
      } else {
        res.status(412).json({ error: 'Google Calendar reconnect is required.' });
        return;
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 100,
        orderBy: 'startTime'
      });

      res.status(200).json({ items: response.data.items || [] });
    } catch (error) {
      console.error('listGoogleCalendarEventsHttp failed', error);
      if (error?.errors?.some?.((item) => item?.reason === 'accessNotConfigured')) {
        res.status(403).json({
          error: 'Google Calendar API is not enabled for this Google Cloud project yet.'
        });
        return;
      }

      const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
      res.status(statusCode).json({ error: error.message || 'Failed to load Google Calendar events.' });
    }
  }
);

exports.getGoogleCalendarConnectionStatus = onCall(async (request) => {
  const uid = requireAuth(request);
  const connectionDoc = await getConnectionRef(uid).get();

  if (!connectionDoc.exists) {
    return { connected: false };
  }

  const data = connectionDoc.data();
  console.log('getGoogleCalendarConnectionStatus callable', {
    uid,
    hasRefreshToken: Boolean(data.refreshToken),
    hasAccessToken: Boolean(data.accessToken),
    expiryDate: data.expiryDate || null,
    connected: Boolean(data.refreshToken || hasUsableAccessToken(data))
  });
  return {
    connected: Boolean(data.refreshToken || hasUsableAccessToken(data)),
    updatedAt: data.updatedAt || null
  };
});

exports.getGoogleCalendarConnectionStatusHttp = onRequest(async (req, res) => {
  if (handleOptions(req, res)) {
    return;
  }

  try {
    applyCors(req, res);
    const uid = await requireHttpAuth(req);
    const connectionDoc = await getConnectionRef(uid).get();

    if (!connectionDoc.exists) {
      res.status(200).json({ connected: false });
      return;
    }

    const data = connectionDoc.data();
    console.log('getGoogleCalendarConnectionStatusHttp', {
      uid,
      hasRefreshToken: Boolean(data.refreshToken),
      hasAccessToken: Boolean(data.accessToken),
      expiryDate: data.expiryDate || null,
      connected: Boolean(data.refreshToken || hasUsableAccessToken(data))
    });
    res.status(200).json({
      connected: Boolean(data.refreshToken || hasUsableAccessToken(data)),
      updatedAt: data.updatedAt || null
    });
  } catch (error) {
    console.error('getGoogleCalendarConnectionStatusHttp failed', error);
    const statusCode = error instanceof HttpsError && error.code === 'unauthenticated' ? 401 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to load Calendar connection status.' });
  }
});
