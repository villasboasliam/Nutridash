// lib/firebase-admin.ts
import * as admin from 'firebase-admin'

function initializeAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  const FIREBASE_PROJECT_ID = process.env.APP_FIREBASE_PROJECT_ID
  const FIREBASE_PRIVATE_KEY = process.env.APP_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const FIREBASE_CLIENT_EMAIL = process.env.APP_FIREBASE_CLIENT_EMAIL
  const FIREBASE_DATABASE_URL = process.env.APP_FIREBASE_DATABASE_URL
  const FIREBASE_STORAGE_BUCKET = process.env.APP_FIREBASE_STORAGE_BUCKET

  if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    throw new Error("Variáveis de ambiente do Firebase Admin ausentes.")
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      privateKey: FIREBASE_PRIVATE_KEY,
      clientEmail: FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: FIREBASE_DATABASE_URL,
    storageBucket: FIREBASE_STORAGE_BUCKET,
  })
}

export function getFirestoreAdmin(): admin.firestore.Firestore {
  return initializeAdminApp().firestore()
}

export function getAuthAdmin(): admin.auth.Auth {
  return initializeAdminApp().auth()
}

export function getStorageAdmin(): admin.storage.Storage {
  return initializeAdminApp().storage()
}

export { admin }
