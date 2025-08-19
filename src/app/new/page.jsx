"use client";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Provider from "../SessionProvider";
import dynamic from "next/dynamic";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export default function NewPage() {
  return (
    <Provider>
      <ReposList />
    </Provider>
  );
}

const MultiStepLoaderScreen = dynamic(() => import("./MultiStepLoaderScreen"), { ssr: false });

function ReposList() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextUrl, setNextUrl] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedUsername, setSelectedUsername] = useState(null);
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

  if (loading && selectedRepo && selectedUsername) {
    return <MultiStepLoaderScreen username={selectedUsername} repo={selectedRepo} onComplete={() => {
      router.push(nextUrl);
    }} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 24,
        position: "relative",
      }}
    >
      {/* Logout button in top left */}
      <button
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          background: "#22223b",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 20px",
          fontWeight: 500,
          fontSize: 16,
          cursor: "pointer",
          transition: "background 0.2s",
          zIndex: 10,
        }}
        onClick={() => {
          import("next-auth/react").then(({ signOut }) => signOut({ callbackUrl: "/signup" }));
        }}
      >
        Logout
      </button>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)",
          padding: 40,
          minWidth: 340,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: "#22223b" }}>
          Your GitHub Repositories
        </h1>
        <Select
          onValueChange={(repoName) => {
            if (repoName && session?.user?.login) {
              const username = encodeURIComponent(session.user.login);
              const uuid = uuidv4();
              setNextUrl(`/editor/${username}/${encodeURIComponent(repoName)}/${uuid}`);
              setSelectedRepo(repoName);
              setSelectedUsername(username);
              setLoading(true);
            }
          }}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a repository" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Repositories</SelectLabel>
              {repos.map((repo) => (
                <SelectItem key={repo.id} value={repo.name}>
                  {repo.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
