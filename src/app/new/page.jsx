"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Provider from "../SessionProvider";

export default function NewPage() {
  return (
    <Provider>
      <ReposList />
    </Provider>
  );
}

function ReposList() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/github-repos")
        .then((res) => res.json())
        .then((data) => setRepos(data));
    }
  }, [status]);

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated")
    return <button onClick={() => signIn("github")}>Sign in with GitHub</button>;

  return (
    <div>
      <h1>Your GitHub Repositories</h1>
      <ul>
        {repos.map((repo) => (
          <li key={repo.id}>
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
              {repo.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
