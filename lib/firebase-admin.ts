// lib/firebase-admin.ts
import * as admin from 'firebase-admin'

let _adminApp: admin.app.App | null = null
let _firestoreAdminInstance: admin.firestore.Firestore | null = null
let _authAdminInstance: admin.auth.Auth | null = null
let _storageAdminInstance: admin.storage.Storage | null = null

function initializeAdminApp(): admin.app.App | null {
  if (_adminApp) return _adminApp

  const FIREBASE_PROJECT_ID = process.env.APP_FIREBASE_PROJECT_ID
  const FIREBASE_PRIVATE_KEY = process.env.APP_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const FIREBASE_CLIENT_EMAIL = process.env.APP_FIREBASE_CLIENT_EMAIL
  const FIREBASE_DATABASE_URL = process.env.APP_FIREBASE_DATABASE_URL
  const FIREBASE_STORAGE_BUCKET = process.env.APP_FIREBASE_STORAGE_BUCKET

  if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL) {
    try {
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          privateKey: FIREBASE_PRIVATE_KEY,
          clientEmail: FIREBASE_CLIENT_EMAIL,
        }),
        databaseURL: FIREBASE_DATABASE_URL,
        storageBucket: FIREBASE_STORAGE_BUCKET,
      })
      console.log("Firebase Admin SDK inicializado com sucesso.")
    } catch (error: any) {
      console.error("Erro na inicialização do Firebase Admin:", error.message)
      _adminApp = null
    }
  } else {
    console.warn("Firebase Admin: Variáveis de ambiente essenciais ausentes.")
    _adminApp = null
  }

  return _adminApp
}

export function getFirestoreAdmin(): admin.firestore.Firestore | null {
  if (!_firestoreAdminInstance) {
    const app = initializeAdminApp()
    if (app) _firestoreAdminInstance = app.firestore()
  }
  return _firestoreAdminInstance
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!_authAdminInstance) {
    const app = initializeAdminApp()
    if (app) _authAdminInstance = app.auth()
  }
  return _authAdminInstance
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!_storageAdminInstance) {
    const app = initializeAdminApp()
    if (app) _storageAdminInstance = app.storage()
  }
  return _storageAdminInstance
}

export { admin }
