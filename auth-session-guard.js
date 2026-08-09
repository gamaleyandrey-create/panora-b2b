/* Panora v326: centralized Supabase session refresh guard. */
(function(){
  const REFRESH_SKEW_MS = 60 * 1000;

  async function ensureFreshSession(options = {}) {
    const client = window.panoraSupabase || window.supabaseClient || window.supabase;
    if (!client?.auth?.getSession) {
      const err = new Error("Supabase auth client is unavailable");
      err.code = "PANORA_AUTH_CLIENT_MISSING";
      throw err;
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      const e = new Error("Сессия истекла — войдите снова");
      e.code = "PANORA_SESSION_EXPIRED";
      e.cause = error;
      throw e;
    }

    let session = data?.session || null;
    if (!session) {
      const e = new Error("Сессия истекла — войдите снова");
      e.code = "PANORA_SESSION_EXPIRED";
      throw e;
    }

    const expiresAtMs = Number(session.expires_at || 0) * 1000;
    const needsRefresh = !expiresAtMs || (expiresAtMs - Date.now()) < REFRESH_SKEW_MS;

    if (needsRefresh && client.auth.refreshSession) {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error || !refreshed.data?.session) {
        const e = new Error("Сессия истекла — войдите снова");
        e.code = "PANORA_SESSION_EXPIRED";
        e.cause = refreshed.error || null;
        throw e;
      }
      session = refreshed.data.session;
    }

    return session;
  }

  async function withFreshSession(fn, options = {}) {
    await ensureFreshSession(options);
    try {
      return await fn();
    } catch (error) {
      const msg = String(error?.message || error || "");
      const status = Number(error?.status || error?.statusCode || 0);
      const invalidToken = /invalid.?token|jwt|token.*expired|expired.*token/i.test(msg) || status === 401;
      if (!invalidToken) throw error;

      // One forced refresh + retry for stale browser tokens.
      const client = window.panoraSupabase || window.supabaseClient || window.supabase;
      if (!client?.auth?.refreshSession) throw error;
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error || !refreshed.data?.session) {
        const e = new Error("Сессия истекла — войдите снова");
        e.code = "PANORA_SESSION_EXPIRED";
        e.cause = refreshed.error || error;
        throw e;
      }
      return await fn();
    }
  }

  function handleSessionError(error) {
    if (error?.code === "PANORA_SESSION_EXPIRED") {
      alert("Сессия истекла. Войдите в Panora снова.");
      return true;
    }
    return false;
  }

  window.panoraEnsureFreshSession = ensureFreshSession;
  window.panoraWithFreshSession = withFreshSession;
  window.panoraHandleSessionError = handleSessionError;
})();