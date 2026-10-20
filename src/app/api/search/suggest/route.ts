import type { NextRequest } from "next/server";
import { getSearchSuggestions } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  if (query.length < 2) {
    return Response.json({ products: [], categories: [], brands: [] });
  }
  const suggestions = await getSearchSuggestions(query);
  return Response.json(suggestions, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
  });
}
