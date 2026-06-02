#!/usr/bin/env python3
"""
Restaura imoveis_prefeitura a partir do CSV completo exportado em 2026-05-04.
Faz INSERT/upsert de todos os campos (objeto_id, nrinscr, endereço, coordenadas WGS84).

Uso:
  python3 restaurar-imoveis-prefeitura.py
  python3 restaurar-imoveis-prefeitura.py --dry-run   # conta sem salvar
  python3 restaurar-imoveis-prefeitura.py --batch 1000
"""
import argparse, gzip, csv, sys, time
from datetime import datetime, timezone
import psycopg2
from pyproj import Transformer

DSN  = "postgresql://rancho:767b76a9c501336ad077ff22d0aad53a46a25f20e3e5b85d@localhost:5432/rancho_delivery"
CSV  = "/root/rancho-delivery/docs/banco/base_imobiliaria_goiania_elyon_20260504.csv.gz"

# SIRGAS 2000 UTM Zone 22S (EPSG:31982) → WGS84
PROJ = Transformer.from_crs("EPSG:31982", "EPSG:4326", always_xy=True)

def to_int(v):
    try:
        return int(v) if v and v.strip() else None
    except ValueError:
        return None

def to_float(v):
    try:
        return float(v) if v and v.strip() else None
    except ValueError:
        return None

def utm_to_wgs84(lat_raw, lng_raw):
    northing = to_float(lat_raw)
    easting  = to_float(lng_raw)
    if northing is None or easting is None:
        return None, None
    lng, lat = PROJ.transform(easting, northing)
    # Sanidade: Goiânia deve estar entre -17.5/-15.5 lat, -50.5/-48.5 lng
    if not (-17.5 < lat < -15.5 and -50.5 < lng < -48.5):
        return None, None
    return round(lat, 7), round(lng, 7)

UPSERT_SQL = """
INSERT INTO imoveis_prefeitura
  (id, object_id, nrinscr, instatus, inposfisc, cdlogradou, tplogradou, nmlogradou,
   nrimovel, incompl, nrquadra, nrlote, cdbairro, nmbairro, cdedificio, nmedificio,
   raw, latitude, longitude, criado_em, atualizado_em)
VALUES
  (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s,
   %s, %s, %s, %s, %s, %s, %s, %s,
   '{}', %s, %s, now(), now())
ON CONFLICT (nrinscr) DO UPDATE SET
  object_id   = EXCLUDED.object_id,
  instatus    = EXCLUDED.instatus,
  inposfisc   = EXCLUDED.inposfisc,
  cdlogradou  = EXCLUDED.cdlogradou,
  tplogradou  = EXCLUDED.tplogradou,
  nmlogradou  = EXCLUDED.nmlogradou,
  nrimovel    = EXCLUDED.nrimovel,
  incompl     = EXCLUDED.incompl,
  nrquadra    = EXCLUDED.nrquadra,
  nrlote      = EXCLUDED.nrlote,
  cdbairro    = EXCLUDED.cdbairro,
  nmbairro    = EXCLUDED.nmbairro,
  cdedificio  = EXCLUDED.cdedificio,
  nmedificio  = EXCLUDED.nmedificio,
  latitude    = COALESCE(EXCLUDED.latitude, imoveis_prefeitura.latitude),
  longitude   = COALESCE(EXCLUDED.longitude, imoveis_prefeitura.longitude),
  atualizado_em = now()
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch",   type=int, default=500)
    args = parser.parse_args()

    conn = psycopg2.connect(DSN) if not args.dry_run else None
    cur  = conn.cursor() if conn else None

    total = inseridos = sem_nrinscr = sem_coord = 0
    batch = []
    t0 = time.time()

    with gzip.open(CSV, 'rt', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';', quotechar='"')
        for row in reader:
            total += 1
            nrinscr = (row.get('nrinscr') or '').strip()
            if not nrinscr:
                sem_nrinscr += 1
                continue

            lat, lng = utm_to_wgs84(row.get('latitude'), row.get('longitude'))
            if lat is None:
                sem_coord += 1

            batch.append((
                to_int(row.get('object_id')),
                nrinscr,
                to_int(row.get('instatus')),
                to_int(row.get('inposfisc')),
                to_int(row.get('cdlogradou')),
                (row.get('tplogradou') or '').strip() or None,
                (row.get('nmlogradou') or '').strip() or None,
                (row.get('nrimovel')   or '').strip() or None,
                (row.get('incompl')    or '').strip() or None,
                (row.get('nrquadra')   or '').strip() or None,
                (row.get('nrlote')     or '').strip() or None,
                to_int(row.get('cdbairro')),
                (row.get('nmbairro')   or '').strip() or None,
                to_int(row.get('cdedificio')),
                (row.get('nmedificio') or '').strip() or None,
                lat,
                lng,
            ))
            inseridos += 1

            if len(batch) >= args.batch:
                if cur:
                    cur.executemany(UPSERT_SQL, batch)
                    conn.commit()
                batch = []
                elapsed = time.time() - t0
                rate = inseridos / elapsed if elapsed > 0 else 0
                eta = (total - inseridos) / rate if rate > 0 else 0
                print(f"\r  {inseridos:,} processados | {rate:.0f}/s | ETA {eta/60:.1f}min   ", end='', flush=True)

    if batch and cur:
        cur.executemany(UPSERT_SQL, batch)
        conn.commit()

    if conn:
        cur.close()
        conn.close()

    elapsed = time.time() - t0
    print(f"\n\nConcluído em {elapsed/60:.1f} minutos:")
    print(f"  Total de linhas CSV:       {total:,}")
    print(f"  Registros inseridos/atualizados: {inseridos:,}")
    print(f"  Sem nrinscr (ignorados):   {sem_nrinscr:,}")
    print(f"  Sem coordenada válida:     {sem_coord:,}")
    if args.dry_run:
        print("\n  [DRY RUN — nenhum dado foi salvo]")

if __name__ == "__main__":
    main()
