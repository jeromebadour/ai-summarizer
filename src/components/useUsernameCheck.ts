"use client";

import { useEffect, useState } from "react";
import { usernameFree } from "@/app/actions/auth";
import { checkUsernameFormat, normalizeUsername, type UsernameCheck } from "@/lib/username";

/**
 * A username field's live status: format first (in the browser), then the server says whether a well-formed name is
 * free, a moment after typing stops. `own` is the user's current username: keeping it is not "taken".
 */
export function useUsernameCheck(own = "") {
  const [username, setUsername] = useState(own);
  const [status, setStatus] = useState<UsernameCheck>({ status: "empty" });

  useEffect(() => {
    if (status.status !== "checking") return;
    let live = true;
    const timer = setTimeout(async () => {
      const free = await usernameFree(username);
      if (live && free !== null) setStatus({ status: free ? "available" : "taken" });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [username, status.status]);

  function change(value: string) {
    setUsername(value);
    setStatus(own && normalizeUsername(value) === own ? { status: "empty" } : checkUsernameFormat(value));
  }

  return { username, status, change };
}
