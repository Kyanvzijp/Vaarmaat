import type { LatLng } from './types';

export interface Place {
  name: string;
  detail: string;
  point: LatLng;
  kind: 'place' | 'waterway' | 'harbour' | 'gps' | 'map';
}

/** Bekende vaarbestemmingen in het kaartgebied, direct beschikbaar zonder internet-zoekopdracht */
export const KNOWN_PLACES: Place[] = [
  { name: 'Kaag (Kaagdorp)', detail: 'Kagerplassen', point: [52.2166, 4.5934], kind: 'place' },
  { name: 'Kagerplassen', detail: 'meer', point: [52.2255, 4.5700], kind: 'waterway' },
  { name: 'Leiden centrum', detail: 'Oude Rijn / Galgewater', point: [52.1601, 4.4867], kind: 'place' },
  { name: 'Leiden Zijlpoort', detail: 'Zijl', point: [52.1633, 4.5010], kind: 'place' },
  { name: 'Alphen aan den Rijn', detail: 'Oude Rijn', point: [52.1305, 4.6580], kind: 'place' },
  { name: 'Braassemermeer', detail: 'meer', point: [52.1930, 4.6390], kind: 'waterway' },
  { name: 'Roelofarendsveen', detail: 'Braassemermeer', point: [52.2030, 4.6330], kind: 'place' },
  { name: 'Oude Wetering', detail: 'Ringvaart', point: [52.2130, 4.6440], kind: 'place' },
  { name: 'Westeinderplassen', detail: 'Aalsmeer', point: [52.2400, 4.7500], kind: 'waterway' },
  { name: 'Aalsmeer', detail: 'Westeinderplassen', point: [52.2620, 4.7590], kind: 'place' },
  { name: 'Warmond', detail: 'Kagerplassen', point: [52.1935, 4.5060], kind: 'place' },
  { name: 'Katwijk aan den Rijn', detail: 'Oude Rijn', point: [52.1880, 4.4260], kind: 'place' },
  { name: 'Woubrugge', detail: 'Woudwetering', point: [52.1700, 4.6350], kind: 'place' },
  { name: 'Ter Aar', detail: 'Aarkanaal', point: [52.1650, 4.7080], kind: 'place' },
  { name: 'Nieuwkoopse Plassen', detail: 'meer', point: [52.1560, 4.8100], kind: 'waterway' },
  { name: 'Nieuwkoop', detail: 'Nieuwkoopse Plassen', point: [52.1510, 4.7760], kind: 'place' },
  { name: 'Bodegraven', detail: 'Oude Rijn', point: [52.0820, 4.7480], kind: 'place' },
  { name: 'Woerden', detail: 'Oude Rijn', point: [52.0850, 4.8830], kind: 'place' },
  { name: 'Gouda', detail: 'Hollandsche IJssel / Gouwe', point: [52.0115, 4.7100], kind: 'place' },
  { name: 'Reeuwijkse Plassen', detail: 'meer', point: [52.0500, 4.7400], kind: 'waterway' },
  { name: 'Boskoop', detail: 'Gouwe', point: [52.0750, 4.6560], kind: 'place' },
  { name: 'Rotterdam Veerhaven', detail: 'Nieuwe Maas', point: [51.9060, 4.4790], kind: 'harbour' },
  { name: 'Delft', detail: 'Rijn-Schiekanaal', point: [52.0115, 4.3570], kind: 'place' },
  { name: 'Den Haag (Laakhaven)', detail: 'Trekvliet', point: [52.0670, 4.3200], kind: 'harbour' },
  { name: 'Leidschendam', detail: 'Vliet', point: [52.0890, 4.3960], kind: 'place' },
  { name: 'Haarlem Spaarne', detail: 'Spaarne', point: [52.3800, 4.6420], kind: 'place' },
  { name: 'Spaarndam', detail: 'Spaarne', point: [52.4090, 4.6820], kind: 'place' },
  { name: 'Amsterdam centrum', detail: 'Amstel', point: [52.3660, 4.8990], kind: 'place' },
  { name: 'Amstel (Ouderkerk)', detail: 'Amstel', point: [52.2960, 4.9070], kind: 'place' },
  { name: 'Uithoorn', detail: 'Amstel', point: [52.2380, 4.8250], kind: 'place' },
  { name: 'Vinkeveense Plassen', detail: 'meer', point: [52.2200, 4.9500], kind: 'waterway' },
  { name: 'Loosdrechtse Plassen', detail: 'meer', point: [52.2000, 5.0800], kind: 'waterway' },
  { name: 'Utrecht (Weerdsluis)', detail: 'Vecht', point: [52.0990, 5.1160], kind: 'place' },
  { name: 'Maarssen', detail: 'Vecht', point: [52.1380, 5.0410], kind: 'place' },
  { name: 'Weesp', detail: 'Vecht', point: [52.3070, 5.0420], kind: 'place' },
  { name: 'Muiden', detail: 'Vecht / IJmeer', point: [52.3300, 5.0690], kind: 'harbour' },
  { name: 'Hillegom', detail: 'Ringvaart Haarlemmermeer', point: [52.2920, 4.5960], kind: 'place' },
  { name: 'Lisse', detail: 'Ringvaart / Greveling', point: [52.2560, 4.5640], kind: 'place' },
  { name: 'Rijpwetering', detail: 'Ade', point: [52.2100, 4.5900], kind: 'place' },
  { name: 'Hazerswoude-Rijndijk', detail: 'Oude Rijn', point: [52.1230, 4.6000], kind: 'place' },
  { name: 'Zoetermeer (Noord Aa)', detail: 'Noord Aa', point: [52.0830, 4.4800], kind: 'waterway' },
  { name: 'Vlietland', detail: 'Vliet', point: [52.1070, 4.4300], kind: 'waterway' },
  { name: 'Nieuwe Meer', detail: 'Amsterdam', point: [52.3290, 4.8200], kind: 'waterway' },
  { name: 'Schiedam', detail: 'Schie', point: [51.9190, 4.3990], kind: 'place' },
  { name: 'Dordrecht', detail: 'Oude Maas', point: [51.8150, 4.6700], kind: 'place' },
];

const VIEWBOX = '4.20,52.52,5.32,51.85';

export async function geocode(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim().toLowerCase();
  const local = KNOWN_PLACES.filter((p) => p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q)).slice(0, 5);
  if (q.length < 3) return local;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=nl&viewbox=${VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`;
    const r = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!r.ok) return local;
    const json = (await r.json()) as { display_name: string; lat: string; lon: string; name?: string; type?: string; class?: string }[];
    const remote: Place[] = json.map((it) => ({
      name: it.name || it.display_name.split(',')[0],
      detail: it.display_name.split(',').slice(1, 3).join(',').trim(),
      point: [parseFloat(it.lat), parseFloat(it.lon)] as LatLng,
      kind: it.class === 'waterway' || it.class === 'natural' ? 'waterway' : 'place',
    }));
    const seen = new Set(local.map((p) => p.name));
    return [...local, ...remote.filter((p) => !seen.has(p.name))].slice(0, 8);
  } catch {
    return local;
  }
}
