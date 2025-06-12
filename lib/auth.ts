import { NextAuthOptions } from "next-auth"; // Importe NextAuthOptions
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = { // Adicione a tipagem NextAuthOptions
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile [https://www.googleapis.com/auth/calendar.readonly](https://www.googleapis.com/auth/calendar.readonly)"
        },
      },
    }),
  ],
  callbacks: {
    // CORRIGIDO: Adicionando tipagem explícita para 'token' e 'account'
    async jwt({ token, account }: { token: any; account: any }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // CORRIGIDO: Adicionando tipagem explícita para 'session' e 'token'
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};
