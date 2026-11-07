import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { AuthLayout } from "@/components/AuthLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { currentUser } from "@/lib/server/session";
import { guestsOpen } from "@/lib/server/settings";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading" />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  // Already signed in (or a guest): nothing to do here.
  if (await currentUser()) redirect("/");
  const mode = (await searchParams).mode === "signup" ? "signup" : "signin";

  return (
    <AuthLayout>
      <AuthCard initialMode={mode} guestsOpen={await guestsOpen()} />
    </AuthLayout>
  );
}
