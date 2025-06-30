import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { FirestoreAdapter } from "@next-auth/firebase-adapter"
import { getFirestoreAdmin } from "@/lib/firebase-admin"

const firestoreAdmin = getFirestoreAdmin()
console.log("🔐 NEXTAUTH_SECRET usado:", process.env.NEXTAUTH_SECRET)
console.log("🚀 GOOGLE_CLIENT_ID dentro do container:", process.env.GOOGLE_CLIENT_ID)
console.log("🚀 GOOGLE_CLIENT_SECRET dentro do container:", process.env.GOOGLE_CLIENT_SECRET)

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
        console.log("✅ AUTH: Dados recebidos para login ->", { email, password })

        if (!email || !password) {
          console.warn("❌ AUTH: Email ou senha ausentes.")
          return null
        }

        if (!firestoreAdmin) {
          console.error("❌ AUTH: Firestore Admin não disponível.")
          return null
        }

        const ref = firestoreAdmin!.collection("nutricionistas").doc(email)
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
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  adapter: FirestoreAdapter({ firestore: firestoreAdmin! }),

  session: { strategy: "jwt" },

cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true, // FORCE TRUE EM PROD
    },
  },
},

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("📥 CALLBACK: signIn chamado ->", { user, account, profile })
      return true
    },
     trustHost: true, // 🔥 coloque aqui
    async jwt({ token, user }) {
      console.log("📥 CALLBACK: jwt antes ->", token)
      if (user) {
        token.uid = user.id
        token.email = user.email
        token.name = user.name
        token.picture = (user as any).picture
        console.log("📥 CALLBACK: jwt atualizado com user ->", token)
      }
      return token
    },

    async session({ session, token }) {
      console.log("📥 CALLBACK: session antes ->", session)
      if (session.user) {
        session.user.uid = token.uid as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string | undefined
      }
      console.log("📥 CALLBACK: session preenchida ->", session)
      return session
    },
  },
}
