import { getSession } from "next-auth/react";
import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const octokit = new Octokit({ auth: session.accessToken });
  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
