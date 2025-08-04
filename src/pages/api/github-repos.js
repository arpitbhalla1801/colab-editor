import { getSession } from "next-auth/react";
import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const octokit = new Octokit({ auth: session.accessToken });
  try {
    let allRepos = [];
    let page = 1;
    let per_page = 100; // max allowed by GitHub
    let hasMore = true;
    while (hasMore) {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({ page, per_page });
      allRepos = allRepos.concat(data);
      hasMore = data.length === per_page;
      page++;
    }
    res.status(200).json(allRepos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
