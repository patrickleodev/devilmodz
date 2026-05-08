This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Vercel checklist

1. Create or import the repository in Vercel.
2. Set the project framework to Next.js if Vercel does not detect it automatically.
3. Add the production environment variables:
	- `DATABASE_URL`
	- `NEXTAUTH_URL`
	- `NEXTAUTH_SECRET`
	- `DISCORD_CLIENT_ID`
	- `DISCORD_CLIENT_SECRET`
	- `APP_URL`
	- `MERCADO_PAGO_ACCESS_TOKEN`
	- `DISCORD_BOT_TOKEN`
	- `DISCORD_NOTIFICATION_CHANNEL_ID`
4. Keep `DISCORD_GUILD_ID` and `DISCORD_STAFF_ROLE_ID` only if you want to use guild-scoped commands and staff restriction.
5. Set the production `APP_URL` to the public domain of the Vercel deployment.
6. Configure the Mercado Pago webhook to point to `/api/payments/mercadopago/webhook` on the production domain.
7. Trigger a deploy and confirm the build passes.

### Environment validation

Run this before deploying:

```bash
npm run verify-env
```

## Docker

This project includes a production Docker setup using Next.js standalone output and PostgreSQL.

1. Copy `.env.example` to `.env` and fill in the secrets.
2. Start the stack:

```bash
docker compose up --build
```

3. Open [http://localhost:3000](http://localhost:3000).

The app container expects `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.

## Discord Bot

The project also includes a Discord bot based on `discord.js`.

Run it with:

```bash
npm run bot
```

Required environment variables:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_NOTIFICATION_CHANNEL_ID`
- `DISCORD_TICKET_CHANNEL_ID` (optional, use a dedicated channel for automatic tickets)
- `DISCORD_GUILD_ID` (optional, to register commands in a guild immediately)
- `DISCORD_STAFF_ROLE_ID` (optional, to authorize delivery commands)
