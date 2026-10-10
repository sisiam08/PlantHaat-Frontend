import { NextResponse } from "next/server";

import type { ErrorEnvelope } from "@/lib/api/common";

export function gatewayError(
  code: string,
  message: string,
  status: number,
  path: string,
): NextResponse<ErrorEnvelope> {
  return NextResponse.json(
    {
      success: false,
      statusCode: status,
      error: { code, message },
      path,
      timestamp: new Date().toISOString(),
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
