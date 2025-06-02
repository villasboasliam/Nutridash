import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { FirestoreAdapter } from "@next-auth/firebase-adapter"

import { db as adminDb } from "@/lib/firebase-admin"  // <=== aqui o admin firestore
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" // client SDK, usado para leitura no frontend

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
        if (!email || !password) return null

        const ref = doc(db, "nutricionistas", email)
        const snap = await getDoc(ref)
        if (!snap.exists()) return null

        const user = snap.data()
        if (user?.senha !== password) return null

        return { id: email, name: user.nome ?? email, email }
      },
    }),
  ],

  adapter: FirestoreAdapter({ firestore: adminDb }),

  session: { strategy: "jwt" },

  pages: { signIn: "/login" },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email
        if (!email) return false
        const snap = await getDoc(doc(db, "nutricionistas", email))
        return snap.exists()
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...(session.user || {}),
        uid: typeof token.uid === "string" ? token.uid : undefined,
        email: typeof token.email === "string" ? token.email : undefined,
      }
      return session
    },
  },
}
