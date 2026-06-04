import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const firebaseConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

let adminApp: admin.app.App;

try {
  if (!admin.apps.length) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as any),
    });
  } else {
    adminApp = admin.app();
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export async function sendNotification(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      topic,
    };

    const response = await admin.messaging().send(message as any);
    console.log('Notification sent:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
