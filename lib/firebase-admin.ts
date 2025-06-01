import { readFileSync } from "fs";
import { resolve } from "path";
import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Carrega o JSON da chave de serviço
const serviceAccount = JSON.parse(
  readFileSync(resolve(process.cwd(), "nutriapp-42e7f-firebase-adminsdk-fbsvc-617497dbbd.json"), "utf-8")
);

// Inicializa app se ainda não estiver iniciado
const adminApp: App = !getApps().length
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

// Exporte Firestore e Auth prontos para uso
const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

export { adminApp, db, auth };
