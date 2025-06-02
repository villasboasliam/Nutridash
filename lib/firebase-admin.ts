import { readFileSync } from "fs";
import { resolve } from "path";
import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Lê o arquivo da chave do Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(resolve(process.cwd(), "nutriapp-42e7f-firebase-adminsdk-fbsvc-617497dbbd.json"), "utf-8")
);

// Inicializa o app do Firebase Admin uma única vez
const adminApp: App = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

// Exporta o objeto admin para manter compatibilidade com outros arquivos
const admin = {
  app: adminApp,
  firestore: getFirestore(adminApp),
  auth: getAuth(adminApp),
};

// Exporta também separadamente caso queira importar por destruturação
const db = admin.firestore;
const auth = admin.auth;

export { admin, db, auth };
