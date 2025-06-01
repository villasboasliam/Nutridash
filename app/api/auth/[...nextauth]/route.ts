import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { cert } from "firebase-admin/app";
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const serviceAccount = {
  type: "service_account",
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com",
};

// 🔧 authOptions separado e exportado
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("CredentialsProvider - Email ou senha ausentes.");
          return null;
        }

        const { email, password } = credentials;
        console.log("CredentialsProvider - Tentativa de login para o email:", email);
        try {
          const ref = doc(db, "nutricionistas", email);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            console.log("CredentialsProvider - Usuário não encontrado:", email);
            return null;
          }

          const user = snap.data();
          if (!user?.senha || user.senha !== password) {
            console.log("CredentialsProvider - Senha incorreta para:", email);
            return null;
          }

          return { id: email, name: user.nome || email, email };
        } catch (error: any) {
          console.error("CredentialsProvider - Erro:", error.message);
          return null;
        }
      },
    }),
  ],

  adapter: FirestoreAdapter({
    credential: cert(serviceAccount as any),
  }),

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const userEmail = profile?.email;
        if (!userEmail) return false;

        try {
          const docRef = doc(db, "nutricionistas", userEmail);
          const docSnap = await getDoc(docRef);
          return docSnap.exists();
        } catch (err) {
          console.error("Callback signIn - Erro ao acessar Firestore:", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.uid = token.uid;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

// 🔁 handler separado
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
