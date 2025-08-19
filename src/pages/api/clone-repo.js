import { getSession } from "next-auth/react";
import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { owner, repo } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "Missing owner or repo" });
  }

  const octokit = new Octokit({ auth: session.accessToken });
  try {
    // Get the default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const branch = repoData.default_branch;
    // Get the tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: true,
    });
    // Get file contents for each blob
    const files = await Promise.all(
      treeData.tree
        .filter((item) => item.type === "blob")
        .map(async (item) => {
          const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: item.path,
            ref: branch,
          });
          return {
            path: item.path,
            content: fileData.content,
            encoding: fileData.encoding,
          };
        })
    );
    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
