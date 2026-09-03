import { NextResponse } from "next/server"
import { getSourcesList } from "@/actions"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim()

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const reports = await getSourcesList(accessToken)
    return NextResponse.json(reports, { status: 200 })
  } catch (error) {
    console.error("Błąd pobierania listy źródeł:", error)
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera."
    return NextResponse.json({ error: message }, { status: error instanceof Error && error.message === "Not authenticated" ? 401 : 500 })
  }
}
