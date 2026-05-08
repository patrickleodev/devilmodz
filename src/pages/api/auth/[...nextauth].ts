import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth";

export default async function handler(req: any, res: any) {
	try {
		// eslint-disable-next-line no-console
		console.log("[NextAuth] Handler called - method:", req.method, "path:", req.url);
		const ret = await NextAuth(req, res, authOptions as any);
		return ret;
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[NextAuth] Handler error:", err);
		throw err;
	}
}
