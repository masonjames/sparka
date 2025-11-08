import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

import { authCookieDomain } from "@/lib/app-url";

const handlers = toNextJsHandler(auth);

function normalizeResponseCookies(response: Response | null | undefined, request: NextRequest) {
  if (!authCookieDomain || !response) {
    return response;
  }

  const hostname = request.nextUrl.hostname;
  if (!hostname) {
    return response;
  }

  const apexHost = authCookieDomain.replace(/^\./, "");
  if (!apexHost) {
    return response;
  }

  if (hostname === apexHost || !hostname.endsWith(`.${apexHost}`)) {
    return response;
  }

  const deletionCookie = `__Secure-better-auth.session_token=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=${hostname}; HttpOnly; Secure; SameSite=Lax`;

  response.headers.append("Set-Cookie", deletionCookie);
  return response;
}

type RouteHandler = (request: NextRequest, context: unknown) => Promise<Response> | Response;

function wrap(handler?: RouteHandler) {
  if (!handler) {
    return undefined;
  }

  return async (request: NextRequest, context: unknown) => {
    const response = await handler(request, context);
    return normalizeResponseCookies(response, request);
  };
}

export const GET = wrap(handlers.GET);
export const POST = wrap(handlers.POST);
