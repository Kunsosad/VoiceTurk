const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type LoginBody = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  credential?: string;
  role?: string;
};

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function normalizeRole(role: unknown) {
  return role === "Contributor" ? "Contributor" : "Buyer";
}

async function readBody(request: Request): Promise<LoginBody> {
  try {
    return await request.json() as LoginBody;
  } catch {
    return {};
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestPost(context: { request: Request }) {
  const body = await readBody(context.request);
  const accessToken = body.accessToken ?? body.access_token ?? body.token ?? body.credential;

  if (!accessToken) {
    return jsonResponse(400, {
      ok: false,
      error: {
        code: "MISSING_GOOGLE_TOKEN",
        message: "Google access token is required",
      },
    });
  }

  const googleResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!googleResponse.ok) {
    return jsonResponse(401, {
      ok: false,
      error: {
        code: "GOOGLE_AUTH_FAILED",
        message: "Google account verification failed",
      },
    });
  }

  const profile = await googleResponse.json() as GoogleProfile;
  if (!profile.email || !profile.email_verified) {
    return jsonResponse(401, {
      ok: false,
      error: {
        code: "GOOGLE_EMAIL_UNVERIFIED",
        message: "Google email is not verified",
      },
    });
  }

  const fullName = profile.name ?? profile.email;
  const user = {
    id: `google_${profile.sub ?? profile.email}`,
    role: normalizeRole(body.role),
    fullName,
    email: profile.email.toLowerCase(),
    avatarUrl: profile.picture,
    createdAt: new Date().toISOString(),
  };

  return jsonResponse(200, {
    ok: true,
    data: {
      user,
      token: `google:${profile.sub ?? profile.email}:${Date.now()}`,
    },
  });
}
