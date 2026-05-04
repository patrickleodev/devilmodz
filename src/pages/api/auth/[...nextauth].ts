import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import AppDataSource from "../../../lib/data-source";
import { User } from "../../../entities/User";
import bcrypt from "bcryptjs";

const ensureDataSource = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await ensureDataSource();
        const repo = AppDataSource.getRepository(User);
        const user = await repo.findOneBy({ email: credentials.email });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, roles: user.roles } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // when signing in with Discord, ensure user exists in DB
      await ensureDataSource();
      const repo = AppDataSource.getRepository(User);
      try {
        if (account?.provider === "discord") {
          const discordId = (profile as any)?.id as string | undefined;
          const email = (profile as any)?.email as string | undefined;
          let dbUser = email ? await repo.findOneBy({ email }) : undefined;
          if (!dbUser) {
            dbUser = repo.create({
              email: email || `discord:${discordId}`,
              name: (profile as any)?.username || (profile as any)?.name || null,
              discordId: discordId || null,
              roles: [],
            } as Partial<User>);
            await repo.save(dbUser);
          } else if (discordId && !dbUser.discordId) {
            dbUser.discordId = discordId;
            await repo.save(dbUser);
          }
        }
      } catch (e) {
        // ignore DB errors for sign in flow
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id || token.id;
        token.roles = (user as any).roles || token.roles || [];
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user.id = token.id;
      (session as any).user.roles = token.roles || [];
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};

export default NextAuth(authOptions);
