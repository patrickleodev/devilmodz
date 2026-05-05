import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth";

export default async function handler(req: any, res: any) {
	try {
		// Log incoming request to trace auth flow
		// eslint-disable-next-line no-console
		console.log('NextAuth handler invoked', { method: req.method, url: req.url, query: req.query });
		// NextAuth internally handles the request; catch any top-level errors to log them.
		const ret = await NextAuth(req, res, authOptions as any);
		// eslint-disable-next-line no-console
		console.log('NextAuth handler completed');
		return ret;
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('NextAuth top-level error:', err);
		res.status(500).json({ error: 'Internal auth error' });
	}
}
