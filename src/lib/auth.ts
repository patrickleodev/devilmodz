import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { User } from "../entities/User";
import AppDataSource from "./data-source";

const ensureDataSource = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
};

export const authOptions: NextAuthOptions = {
  debug: process.env.NEXTAUTH_DEBUG === "true",
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
          try {
            if (!credentials?.email || !credentials?.password) return null;
            await ensureDataSource();
            const repo = AppDataSource.getRepository(User);
            const user = await repo.findOneBy({ email: credentials.email });
            if (!user || !user.passwordHash) return null;
            const valid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (!valid) return null;
            return { id: user.id, email: user.email, name: user.name, roles: user.roles } as any;
          } catch (err) {
            return null;
          }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile }) {
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
      } catch (err) {
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = (user as any).id || token.id;
          token.roles = (user as any).roles || token.roles || [];
        }
        return token;
      } catch (err) {
        throw err;
      }
    },
    async session({ session, token }) {
      try {
        (session as any).user.id = token.id;
        (session as any).user.roles = token.roles || [];
        return session;
      } catch (err) {
        throw err;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};
