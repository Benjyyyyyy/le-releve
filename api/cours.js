// Fonction serverless Vercel : cours en direct.
// Valeurs de Paris, ArcelorMittal (Amsterdam) et CAC 40 : Boursorama (temps réel).
// Valeurs américaines, autres indices, devises et matières premières : Yahoo Finance (léger différé).
// Si Boursorama ne répond pas pour un titre, on retombe sur Yahoo.
// GET /api/cours?symbols=^FCHI,MC.PA,AAPL -> { "MC.PA": { "prix": 386.5, "var": 0.92, "source": "Boursorama" }, ... }
const BLOC = 20; // Yahoo limite l'endpoint spark à 20 symboles par appel
const UA = { "User-Agent": "Mozilla/5.0" };
const BOURSORAMA_SPECIAUX = { "^FCHI": "1rPCAC", "MT.AS": "1rAMT", "FGR.PA": "1rPFGRMC" };

function codeBoursorama(ticker) {
  if (BOURSORAMA_SPECIAUX[ticker]) return BOURSORAMA_SPECIAUX[ticker];
  if (ticker.endsWith(".PA")) return "1rP" + ticker.slice(0, -3);
  return null;
}

async function boursorama(ticker) {
  try {
    const r = await fetch(`https://www.boursorama.com/bourse/action/graph/ws/UpdateCharts?symbol=${codeBoursorama(ticker)}&period=-1`, { headers: UA });
    const d = (await r.json())?.d?.[0];
    if (!d || !d.c) return null;
    const prec = d.c - d.var; // "var" est l'écart en devise depuis la clôture précédente
    return [ticker, { prix: d.c, var: prec ? (d.var / prec) * 100 : null, source: "Boursorama" }];
  } catch (e) {
    return null;
  }
}

async function yahoo(symbols) {
  try {
    const url = "https://query1.finance.yahoo.com/v7/finance/spark?range=1d&interval=1d&symbols=" + encodeURIComponent(symbols.join(","));
    const d = await (await fetch(url, { headers: UA })).json();
    return (d?.spark?.result || []).map((r) => {
      const m = r?.response?.[0]?.meta;
      if (!m || m.regularMarketPrice == null) return null;
      const prec = m.chartPreviousClose ?? m.previousClose;
      return [r.symbol, { prix: m.regularMarketPrice,
        var: m.regularMarketChangePercent ?? (prec ? (m.regularMarketPrice / prec - 1) * 100 : null), source: "Yahoo Finance" }];
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  const symbols = String(req.query.symbols || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 120);
  if (!symbols.length) return res.status(400).json({ erreur: "Paramètre symbols manquant" });

  const sortie = Object.fromEntries((await Promise.all(symbols.filter(codeBoursorama).map(boursorama))).filter(Boolean));
  const reste = symbols.filter((s) => !sortie[s]);
  const blocs = [];
  for (let i = 0; i < reste.length; i += BLOC) blocs.push(reste.slice(i, i + BLOC));
  for (const [s, c] of (await Promise.all(blocs.map(yahoo))).flat()) sortie[s] = c;

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  res.status(200).json(sortie);
}
