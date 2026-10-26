// Fonction serverless Vercel : cours en direct (Yahoo Finance, différé de quelques minutes selon la place).
// GET /api/cours?symbols=^FCHI,MC.PA,AAPL -> { "MC.PA": { "prix": 386.5, "var": 0.92, "heure": 1793019284 }, ... }
const BLOC = 20; // Yahoo limite l'endpoint spark à 20 symboles par appel

async function spark(symbols) {
  const url = "https://query1.finance.yahoo.com/v7/finance/spark?range=1d&interval=1d&symbols=" + encodeURIComponent(symbols.join(","));
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return [];
  const d = await r.json();
  return d?.spark?.result || [];
}

export default async function handler(req, res) {
  const symbols = String(req.query.symbols || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 120);
  if (!symbols.length) return res.status(400).json({ erreur: "Paramètre symbols manquant" });
  const blocs = [];
  for (let i = 0; i < symbols.length; i += BLOC) blocs.push(symbols.slice(i, i + BLOC));
  const resultats = (await Promise.all(blocs.map(spark))).flat();
  const sortie = {};
  for (const r of resultats) {
    const m = r?.response?.[0]?.meta;
    if (!m || m.regularMarketPrice == null) continue;
    const prec = m.chartPreviousClose ?? m.previousClose;
    sortie[r.symbol] = {
      prix: m.regularMarketPrice,
      var: m.regularMarketChangePercent ?? (prec ? (m.regularMarketPrice / prec - 1) * 100 : null),
      heure: m.regularMarketTime,
    };
  }
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  res.status(200).json(sortie);
}
