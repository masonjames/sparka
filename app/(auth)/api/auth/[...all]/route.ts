import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

import { authCookieDomain } from "@/lib/app-url";

const handlers = toNextJsHandler(auth);

function normalizeResponseCookies(response: Response, request: NextRequest) {
    const apexHost = authCookieDomain?.replace(/^\./, "");
    if (!authCookieDomain || !apexHost) {
        return response;
    }
    const hostname = request.nextUrl.hostname;
    if (!hostname) {
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
        if (!response) {
            return undefined;
        }
        return normalizeResponseCookies(response, request);
    };
}

export const GET = wrap(handlers.GET);
export const POST = wrap(handlers.POST);
