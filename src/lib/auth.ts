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
  debug: process.env.NEXTAUTH_DEBUG === "true" || true,
  logger: {
    error(code, ...metadata) {
      // Ensure server-side errors from NextAuth are visible in logs
      // eslint-disable-next-line no-console
      console.error("NextAuth error:", code, ...metadata);
    },
    warn(code) {
      // eslint-disable-next-line no-console
      console.warn("NextAuth warn:", code);
    },
    debug(code, ...metadata) {
      // eslint-disable-next-line no-console
      console.log("NextAuth debug:", code, ...metadata);
    },
  },
  events: ({
    async signIn(message: any) {
      // eslint-disable-next-line no-console
      console.log('NextAuth event signIn', message);
    },
    async session(message: any) {
      // eslint-disable-next-line no-console
      console.log('NextAuth event session', message);
    },
    async error(message: any) {
      // eslint-disable-next-line no-console
      console.error('NextAuth event error', message);
    },
  } as any),
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
            // eslint-disable-next-line no-console
            console.error('NextAuth authorize error:', err);
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
      // eslint-disable-next-line no-console
      console.log('NextAuth signIn callback invoked', { provider: account?.provider, profileId: (profile as any)?.id });
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
        // Log DB errors during sign-in to help debugging
        // eslint-disable-next-line no-console
        console.error('NextAuth signIn callback error:', err);
      }

      // eslint-disable-next-line no-console
      console.log('NextAuth signIn callback success', { provider: account?.provider, profileId: (profile as any)?.id });

      return true;
    },
    async jwt({ token, user }) {
      // eslint-disable-next-line no-console
      console.log('NextAuth jwt callback invoked', { tokenId: token.id, hasUser: !!user });
      try {
        if (user) {
          token.id = (user as any).id || token.id;
          token.roles = (user as any).roles || token.roles || [];
        }
        // eslint-disable-next-line no-console
        console.log('NextAuth jwt callback success', { id: token.id, roles: token.roles });
        return token;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('NextAuth jwt callback error:', err);
        throw err;
      }
    },
    async session({ session, token }) {
      // eslint-disable-next-line no-console
      console.log('NextAuth session callback invoked', { tokenId: token.id });
      try {
        (session as any).user.id = token.id;
        (session as any).user.roles = token.roles || [];
        // eslint-disable-next-line no-console
        console.log('NextAuth session callback success', { userId: (session as any).user.id, roles: (session as any).user.roles });
        return session;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('NextAuth session callback error:', err);
        throw err;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};
