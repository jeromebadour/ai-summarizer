import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ForgotPassword } from "@/components/AccountSteps";
import { AuthLayout } from "@/components/AuthLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RESET_EMAIL } from "@/lib/server/reset-cookie";
import { currentUser } from "@/lib/server/session";

export default function ForgotPage({ searchParams }: PageProps<"/forgot">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading" />}>
      <Forgot searchParams={searchParams} />
    </Suspense>
  );
}

async function Forgot({ searchParams }: Pick<PageProps<"/forgot">, "searchParams">) {
  if (await currentUser()) redirect("/");
  // The code step only once this browser has asked (the email it asked for is in a 30-minute cookie).
  const sent = (await searchParams).sent === "1" && Boolean((await cookies()).get(RESET_EMAIL)?.value);
  return (
    <AuthLayout>
      <ForgotPassword sent={sent} />
    </AuthLayout>
  );
}
