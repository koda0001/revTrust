"use client"

import React, { useEffect, useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase"

type SentimentBreakdown = {
  positive_percent: number
  neutral_percent: number
  negative_percent: number
}

type CategoryAnalysis = {
  category: string
  sentiment: string
  mention_count: number
}

export type WeeklyReport = {
  id: string
  location_id: string
  week_number: number
  year: number
  review_count: number
  sentiment_score: number
  avg_rating: number
  sentiment_breakdown: SentimentBreakdown
  summary_text: string
  top_pros: string[]
  top_cons: string[]
  category_analysis: CategoryAnalysis[]
  critical_alerts?: string[]
  locations?: {
    name: string
  }
}

export default function Analysis() {
  const [reports, setReports] = useState<WeeklyReport[] | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchReports() {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        if (!accessToken) {
          throw new Error("Not authenticated")
        }

        const res = await fetch("/api/weekly-reports", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        if (!mounted) return
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const data: WeeklyReport[] = await res.json()
        
        if (!data || data.length === 0) {
          setReports([])
          setSelectedLocation(null)
          setSelectedId(null)
        } else {
          setReports(data)
          const firstLoc = data[0].location_id
          setSelectedLocation(firstLoc)
          setSelectedId(String(data[0].id))
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchReports()
    return () => {
      mounted = false
    }
  }, [])

  const locationsList = useMemo(() => {
    if (!reports) return []
    const map = new Map<string, string>()
    reports.forEach((r) => {
      const locName = r.locations?.name || `Lokalizacja (${r.location_id.slice(0, 8)}...)`
      map.set(r.location_id, locName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [reports])

  const availableWeeks = useMemo(() => {
    if (!reports || !selectedLocation) return []
    return reports.filter((r) => r.location_id === selectedLocation)
  }, [reports, selectedLocation])

  const handleLocationChange = (locId: string | null) => {
    setSelectedLocation(locId)
    if (!locId || !reports) {
      setSelectedId(null)
      return
    }
    const firstReportForLoc = reports.find((r) => r.location_id === locId)
    setSelectedId(firstReportForLoc ? String(firstReportForLoc.id) : null)
  }

  const selected = useMemo(() => {
    if (!reports || !selectedId) return null
    return reports.find((r) => String(r.id) === selectedId) ?? null
  }, [reports, selectedId])

  function formatOption(r: WeeklyReport) {
    return `Tydzień ${r.week_number} (${r.year})`
  }

  function sentimentColor(score: number) {
    if (score >= 70) return "bg-emerald-500"
    if (score >= 40) return "bg-amber-400"
    return "bg-rose-500"
  }

  return (
    <div className="p-6">
      {error ? (
        <div className="mb-4 p-3 rounded-2xl bg-rose-900/30 border border-rose-800 text-rose-300">
          Błąd podczas pobierania raportów: {error}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Analityka Tygodniowa</h2>
          <div className="mt-2 text-sm text-slate-400">
            {loading ? (
              <span>Ładowanie raportów…</span>
            ) : reports && reports.length > 0 ? (
              <span>Wybrano: {selected ? formatOption(selected) : "-"}</span>
            ) : (
              <span>Brak dostępnych raportów</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selected ? (
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-slate-800 text-sm text-amber-300 border border-slate-700">
              Przeanalizowano {selected.review_count} opinii
            </span>
          ) : null}

          <select
            className="rounded-md border border-slate-800 px-3 py-2 bg-slate-950 text-white focus:outline-none focus:border-slate-600"
            value={selectedLocation ?? ""}
            onChange={(e) => handleLocationChange(e.target.value || null)}
          >
            <option value="">Wybierz lokalizację…</option>
            {locationsList.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-800 px-3 py-2 bg-slate-950 text-white focus:outline-none focus:border-slate-600 disabled:opacity-50"
            value={selectedId ?? ""}
            disabled={!selectedLocation || availableWeeks.length === 0}
            onChange={(e) => setSelectedId(e.target.value || null)}
          >
            <option value="">Wybierz tydzień…</option>
            {availableWeeks.map((r) => (
              <option key={r.id} value={r.id}>
                {formatOption(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Sentyment Ogólny</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {selected ? `${selected.sentiment_score}%` : "-"}
              </div>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${selected ? sentimentColor(selected.sentiment_score) : 'bg-gray-600'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Średnia Ocena</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {selected ? `${selected.avg_rating ? selected.avg_rating.toFixed(2) : '0.00'} / 5.0` : "-"}
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="white" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-sm text-slate-400">Rozkład Sentymentu</div>
          <div className="mt-3 h-6 w-full bg-slate-800/40 rounded overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: selected?.sentiment_breakdown ? `${selected.sentiment_breakdown.positive_percent}%` : "0%" }}
            />
            <div
              className="h-full bg-slate-600 transition-all duration-300"
              style={{ width: selected?.sentiment_breakdown ? `${selected.sentiment_breakdown.neutral_percent}%` : "0%" }}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: selected?.sentiment_breakdown ? `${selected.sentiment_breakdown.negative_percent}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {selected && Array.isArray(selected.critical_alerts) && selected.critical_alerts.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-rose-800 bg-rose-900/20 p-4">
          <div className="flex items-center gap-3 mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="#FB923C" />
              <path d="M12 9v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-semibold text-rose-200">Krytyczne ostrzeżenia</div>
          </div>
          <ul className="list-disc pl-5 text-sm text-rose-200 space-y-1">
            {selected.critical_alerts.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-lg font-medium mb-2 text-white">Podsumowanie biznesowe</h3>
          <p className="text-sm text-slate-200 leading-relaxed">
            {selected ? selected.summary_text : "Brak podsumowania"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-lg font-medium mb-3 text-white">Analiza kategorii</h3>
          {selected && Array.isArray(selected.category_analysis) && selected.category_analysis.length > 0 ? (
            <div className="space-y-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selected.category_analysis.map((c) => ({ name: c.category, mention_count: c.mention_count }))}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }} />
                    <Bar dataKey="mention_count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {selected.category_analysis.map((c) => (
                  <div key={c.category} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                    <div>
                      <div className="font-medium text-white text-sm">{c.category}</div>
                      <div className="text-xs text-slate-400">Wzmianki: {c.mention_count}</div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.sentiment.includes('pozy') ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'bg-rose-900/40 text-rose-300 border border-rose-800'}`}>
                        {c.sentiment}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Brak danych kategorii</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h4 className="font-medium mb-3 text-white">Top Zalety</h4>
          {selected && Array.isArray(selected.top_pros) && selected.top_pros.length > 0 ? (
            <ul className="space-y-2">
              {selected.top_pros.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11l3 3L22 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm text-slate-200">{p}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400">Brak zalet</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h4 className="font-medium mb-3 text-white">Top Wady</h4>
          {selected && Array.isArray(selected.top_cons) && selected.top_cons.length > 0 ? (
            <ul className="space-y-2">
              {selected.top_cons.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#FB7185" strokeWidth="2" />
                    <path d="M12 8v5" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 15h.01" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <div className="text-sm text-slate-200">{c}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400">Brak wad</div>
          )}
        </div>
      </div>
    </div>
  )
}