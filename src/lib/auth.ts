import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { User } from "../entities/User";
import AppDataSource from "./data-source";
import { resolveDbUser } from "./session";

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
      httpOptions: {
        timeout: 15000, // 15 seconds for Discord OAuth token/profile requests
      },
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
      try {
        // eslint-disable-next-line no-console
        console.log("signIn callback - account provider:", account?.provider);
        // eslint-disable-next-line no-console
        console.log("signIn callback - profile:", profile);

        if (account?.provider === "discord") {
          await ensureDataSource();
          const repo = AppDataSource.getRepository(User);
          const discordId = (profile as any)?.id as string | undefined;
          const email = (profile as any)?.email as string | undefined;
          // eslint-disable-next-line no-console
          console.log("Discord login - discordId:", discordId, "email:", email);

          let dbUser = email ? await repo.findOneBy({ email }) : undefined;
          // eslint-disable-next-line no-console
          console.log("Found existing user:", !!dbUser);

          if (!dbUser) {
            dbUser = repo.create({
              email: email || `discord:${discordId}`,
              name: (profile as any)?.username || (profile as any)?.name || null,
              discordId: discordId || null,
              roles: [],
            } as Partial<User>);
            // eslint-disable-next-line no-console
            console.log("Creating new user:", dbUser);
            await repo.save(dbUser);
            // eslint-disable-next-line no-console
            console.log("User saved successfully");
          } else if (discordId && !dbUser.discordId) {
            dbUser.discordId = discordId;
            await repo.save(dbUser);
            // eslint-disable-next-line no-console
            console.log("Updated user with discordId");
          }
        }
        // eslint-disable-next-line no-console
        console.log("signIn callback - SUCCESS");
        return true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Auth signIn error - full error object:", err);
        // eslint-disable-next-line no-console
        console.error("Auth signIn error - message:", err instanceof Error ? err.message : String(err));
        // eslint-disable-next-line no-console
        console.error("Auth signIn error - stack:", err instanceof Error ? err.stack : "no stack");
        return true;
      }
    },
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = (user as any).id || token.id;
          token.roles = (user as any).roles || token.roles || [];
        }

        if ((!token.roles || token.roles.length === 0) && (token.id || token.email)) {
          try {
            const dbUser = await resolveDbUser({
              id: typeof token.id === "string" ? token.id : undefined,
              email: typeof token.email === "string" ? token.email : undefined,
            });

            if (dbUser?.roles?.length) {
              token.roles = dbUser.roles;
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Auth jwt callback - could not resolve roles from DB:", err);
          }
        }

        token.roles = token.roles || [];
        return token;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Auth jwt callback error:", err);
        token.roles = token.roles || [];
        return token;
      }
    },
    async session({ session, token }) {
      try {
        (session as any).user.id = token.id;
        (session as any).user.roles = token.roles || [];
        return session;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Auth session callback error:", err);
        return session;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};
