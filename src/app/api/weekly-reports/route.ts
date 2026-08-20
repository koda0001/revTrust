import { NextResponse } from "next/server"
import { getWeeklyReports } from "@/actions"

export async function GET() {
  try {
    const reports = await getWeeklyReports()
    return NextResponse.json(reports, { status: 200 })
  } catch (error) {
    console.error("Błąd pobierania raportów:", error)
    const message = error instanceof Error ? error.message : "Wystąpił błąd serwera."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
