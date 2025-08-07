import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ✅ Certifique-se de que TODAS essas variáveis estão no .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ✅ Inicializa o app só se ainda não estiver criado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Inicializa os serviços
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ Teste temporário de depuração (remover depois)
console.log("📦 Firebase App Name:", app.name); // Deve mostrar "[DEFAULT]"
console.log("🔥 Firestore instance:", db); // Deve ser um objeto

export { db, auth, storage, app };
