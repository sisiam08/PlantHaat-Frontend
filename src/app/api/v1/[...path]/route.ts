import type { NextRequest } from "next/server";

import { handleGatewayRequest } from "@/server/gateway/handle-request";

interface GatewayContext {
  params: Promise<{ path: string[] }>;
}

async function handle(request: NextRequest, context: GatewayContext): Promise<Response> {
  const { path } = await context.params;
  return handleGatewayRequest(request, path);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
