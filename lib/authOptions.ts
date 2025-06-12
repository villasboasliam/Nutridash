import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { FirestoreAdapter } from "@next-auth/firebase-adapter"
import { getFirestoreAdmin } from "@/lib/firebase-admin"

const firestoreAdmin = getFirestoreAdmin()

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
        const { email, password } = credentials ?? {}
        console.log("✅ AUTH: Dados recebidos para login ->", email)

        if (!email || !password) {
          console.warn("❌ AUTH: Email ou senha ausentes.")
          return null
        }

        if (!firestoreAdmin) {
          console.error("❌ AUTH: Firestore Admin não disponível.")
          return null
        }

        try {
          const ref = firestoreAdmin.collection("nutricionistas").doc(email)
          const snap = await ref.get()

          if (!snap.exists) {
            console.warn("❌ AUTH: Usuário não encontrado ->", email)
            return null
          }

          const user = snap.data()
          console.log("✅ AUTH: Usuário encontrado no Firestore ->", user)

          if (user?.senha !== password) {
            console.warn("❌ AUTH: Senha incorreta para ->", email)
            return null
          }

          console.log("✅ AUTH: Login bem-sucedido para ->", email)
          return {
            id: email,
            email,
            name: user?.nome || email,
          }
        } catch (error: any) {
          console.error("❌ AUTH: Erro na authorize ->", error.message)
          return null
        }
      },
    }),
  ],

  adapter: FirestoreAdapter({ firestore: firestoreAdmin! }),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("📥 CALLBACK: signIn ->", { user, account, profile })

      if (account?.provider === "google") {
        const email = profile?.email
        if (!email || !firestoreAdmin) {
          console.warn("❌ CALLBACK: Google login sem email ou firestore.")
          return false
        }

        try {
          const snap = await firestoreAdmin.collection("nutricionistas").doc(email).get()
          const exists = snap.exists
          console.log("✅ CALLBACK: Google user existe no Firestore?", exists)
          return exists
        } catch (error: any) {
          console.error("❌ CALLBACK: Erro ao verificar Google:", error.message)
          return false
        }
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.email = user.email
        console.log("📥 CALLBACK: jwt atualizado com user ->", token)
      } else {
        console.log("📥 CALLBACK: jwt sem user, mantendo token ->", token)
      }
      return token
    },

    async session({ session, token }) {
      session.user = {
        ...(session.user || {}),
        uid: typeof token.uid === "string" ? token.uid : undefined,
        email: typeof token.email === "string" ? token.email : undefined,
      }
      console.log("📥 CALLBACK: session preenchida ->", session)
      return session
    },
  },
}
