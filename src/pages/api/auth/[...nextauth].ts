import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth";

export default async function handler(req: any, res: any) {
	try {
		const ret = await NextAuth(req, res, authOptions as any);
		return ret;
	} catch (err) {
		res.status(500).json({ error: 'Internal auth error' });
	}
}
