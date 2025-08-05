"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/github-repos")
        .then((res) => res.json())
        .then((data) => setRepos(data));
    } else if (status === "unauthenticated") {
      // Only redirect with error if not coming from explicit logout
      if (!window.location.search.includes("callbackUrl=/signup")) {
        router.replace("/signup?error=signin_failed");
      } else {
        router.replace("/signup");
      }
    }
  }, [status, router]);

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated")
    return <button onClick={() => signIn("github")}>Sign in with GitHub</button>;

  return (
    <div>
      <h1>Your GitHub Repositories</h1>
      <button
        style={{ marginBottom: "1rem" }}
        onClick={() => {
          import("next-auth/react").then(({ signOut }) => signOut({ callbackUrl: "/signup" }));
        }}
      >
        Logout
      </button>
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
