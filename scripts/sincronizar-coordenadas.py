#!/usr/bin/env python3
"""
Sincroniza coordenadas dos imóveis da prefeitura de Goiânia.

Varre a API GIS por faixa de OBJECTID, cruza nrinscr com o banco local
e salva latitude/longitude (WGS84) para os imóveis que ainda não têm.

Uso:
  python3 sincronizar-coordenadas.py              # processa tudo
  python3 sincronizar-coordenadas.py --lote 500   # tamanho da faixa de OBJECTID
  python3 sincronizar-coordenadas.py --inicio 100000  # retoma a partir deste OBJECTID
  python3 sincronizar-coordenadas.py --dry-run    # só mostra o que faria

Retomada: o script salva checkpoint em /tmp/sincronizar-coordenadas.checkpoint
Ctrl+C interrompe e retoma de onde parou na próxima execução.
"""

import argparse, json, os, sys, time
import psycopg2, requests
from pyproj import Transformer

DSN        = "postgresql://rancho:767b76a9c501336ad077ff22d0aad53a46a25f20e3e5b85d@localhost:5432/rancho_delivery"
API_URL    = "https://portalmapa.goiania.go.gov.br/servicogyn/rest/services/MapaServer/Feature_BaseTeste/FeatureServer/3/query"
CHECKPOINT = "/tmp/sincronizar-coordenadas.checkpoint"
MAX_OID    = 710000   # OBJECTID máximo da base da prefeitura (~704k imóveis)

PROJ = Transformer.from_crs("EPSG:31982", "EPSG:4326", always_xy=True)

SLEEP_LOTE  = 0.4   # pausa entre lotes (segundos)
SLEEP_RETRY = 15    # pausa após erro
MAX_RETRIES = 5

def salvar_checkpoint(oid):
    with open(CHECKPOINT, "w") as f:
        json.dump({"ultimo_objectid": oid}, f)

def ler_checkpoint():
    if os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            return json.load(f).get("ultimo_objectid", 0)
    return 0

def centroide(rings):
    ring = rings[0] if rings else []
    if len(ring) < 3:
        return None, None
    return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)

def buscar_api(min_oid, max_oid, lote):
    params = {
        "f": "json",
        "where": f"OBJECTID >= {min_oid} AND OBJECTID <= {max_oid}",
        "outFields": "OBJECTID,nrinscr",
        "returnGeometry": "true",
        "resultRecordCount": str(lote),
        "resultOffset": "0",
    }
    for tentativa in range(1, MAX_RETRIES + 1):
        try:
            r = requests.get(API_URL, params=params, timeout=30)
            r.raise_for_status()
            data = r.json()
            if "error" in data:
                raise ValueError(f"API: {data['error']}")
            return data.get("features", [])
        except Exception as e:
            print(f"\n  [tentativa {tentativa}/{MAX_RETRIES}] OID {min_oid}-{max_oid}: {e}", flush=True)
            if tentativa < MAX_RETRIES:
                time.sleep(SLEEP_RETRY)
    print(f"\n  [SKIP] OID {min_oid}-{max_oid} ignorado após {MAX_RETRIES} falhas.", flush=True)
    return []

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lote",    type=int, default=500,  help="Faixa de OBJECTID por requisição (default: 500)")
    parser.add_argument("--inicio",  type=int, default=None, help="OBJECTID inicial (ignora checkpoint)")
    parser.add_argument("--dry-run", action="store_true",    help="Conta sem salvar")
    args = parser.parse_args()

    conn = psycopg2.connect(DSN)
    cur  = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM imoveis_prefeitura WHERE latitude IS NULL")
    sem_coord = cur.fetchone()[0]
    print(f"Imóveis sem coordenada: {sem_coord:,}")

    if args.dry_run or sem_coord == 0:
        conn.close()
        return

    inicio = args.inicio if args.inicio is not None else ler_checkpoint()
    if inicio:
        print(f"Retomando do OBJECTID {inicio:,}")

    lotes_total = (MAX_OID - inicio) // args.lote + 1
    lote_n = 0
    atualizados = sem_geo = invalidos = 0

    print(f"Lote: {args.lote} OBJECTIDs | Estimativa: {lotes_total:,} requisições\n")

    cur_oid = inicio + 1

    try:
        while cur_oid <= MAX_OID:
            fim_oid = min(cur_oid + args.lote - 1, MAX_OID)
            lote_n += 1

            features = buscar_api(cur_oid, fim_oid, args.lote)

            # Filtra só nrinscrs que existem no banco e ainda não têm coordenada
            nrinscrs_api = {}
            for feat in features:
                attrs = feat.get("attributes", {})
                geo   = feat.get("geometry")
                nrinscr = attrs.get("nrinscr")
                if nrinscr and geo and geo.get("rings"):
                    nrinscrs_api[nrinscr] = geo

            if nrinscrs_api:
                cur.execute(
                    "SELECT nrinscr FROM imoveis_prefeitura WHERE nrinscr = ANY(%s) AND latitude IS NULL",
                    (list(nrinscrs_api.keys()),),
                )
                para_atualizar = [r[0] for r in cur.fetchall()]

                updates = []
                for nrinscr in para_atualizar:
                    geo = nrinscrs_api[nrinscr]
                    ex, ey = centroide(geo["rings"])
                    if ex is None:
                        sem_geo += 1
                        continue
                    lng, lat = PROJ.transform(ex, ey)
                    if not (-17.5 < lat < -15.5 and -50.5 < lng < -48.5):
                        invalidos += 1
                        continue
                    updates.append((lat, lng, nrinscr))

                if updates:
                    cur.executemany(
                        "UPDATE imoveis_prefeitura SET latitude=%s, longitude=%s WHERE nrinscr=%s",
                        updates,
                    )
                    conn.commit()
                    atualizados += len(updates)
            else:
                sem_geo += args.lote  # faixa vazia ou sem geometria

            salvar_checkpoint(fim_oid)

            pct = min(100, round(lote_n / lotes_total * 100))
            bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
            print(
                f"\r  [{bar}] {pct:3d}%  OID {cur_oid:>7}-{fim_oid:<7}"
                f"  salvos: {atualizados:,}  restam: {sem_coord - atualizados:,}   ",
                end="", flush=True,
            )

            cur_oid = fim_oid + 1
            time.sleep(SLEEP_LOTE)

    except KeyboardInterrupt:
        print("\n\nInterrompido. Rode novamente para retomar do checkpoint.")
        conn.close()
        sys.exit(0)

    if os.path.exists(CHECKPOINT):
        os.remove(CHECKPOINT)

    cur.close()
    conn.close()

    print(f"\n\n{'='*55}")
    print(f"Concluído!")
    print(f"  Coordenadas salvas:   {atualizados:,}")
    print(f"  Sem geometria na API: {sem_geo:,}")
    print(f"  Fora de Goiânia:      {invalidos:,}")

if __name__ == "__main__":
    main()
