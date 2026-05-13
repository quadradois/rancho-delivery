#!/usr/bin/env python3
import gzip, csv, sys
import psycopg2
from pyproj import Transformer

DSN = "postgresql://rancho:767b76a9c501336ad077ff22d0aad53a46a25f20e3e5b85d@localhost:5432/rancho_delivery"
CSV = "/root/rancho-delivery/docs/banco/base_imobiliaria_goiania_elyon_20260504.csv.gz"
BATCH = 500

# SIRGAS 2000 UTM Zone 22S → WGS84
transformer = Transformer.from_crs("EPSG:31982", "EPSG:4326", always_xy=True)

conn = psycopg2.connect(DSN)
cur = conn.cursor()

batch = []
total = atualizados = sem_coord = invalidos = 0

with gzip.open(CSV, 'rt', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';', quotechar='"')
    for row in reader:
        total += 1
        nrinscr = row.get('nrinscr', '').strip()
        lat_raw = row.get('latitude', '').strip()
        lng_raw = row.get('longitude', '').strip()

        if not nrinscr or not lat_raw or not lng_raw:
            sem_coord += 1
            continue

        try:
            northing = float(lat_raw)  # Y (UTM)
            easting  = float(lng_raw)  # X (UTM)
        except ValueError:
            sem_coord += 1
            continue

        # always_xy=True: (x=easting, y=northing) → (lng, lat)
        lng, lat = transformer.transform(easting, northing)

        # Sanity check: Goiânia deve estar entre -17.5 e -15.5 lat, -50.5 e -48.5 lng
        if not (-17.5 < lat < -15.5 and -50.5 < lng < -48.5):
            invalidos += 1
            continue

        batch.append((lat, lng, nrinscr))
        atualizados += 1

        if len(batch) >= BATCH:
            cur.executemany(
                "UPDATE imoveis_prefeitura SET latitude=%s, longitude=%s WHERE nrinscr=%s",
                batch
            )
            conn.commit()
            batch = []
            print(f"\r  {atualizados} coordenadas importadas...", end='', flush=True)

if batch:
    cur.executemany(
        "UPDATE imoveis_prefeitura SET latitude=%s, longitude=%s WHERE nrinscr=%s",
        batch
    )
    conn.commit()

cur.close()
conn.close()

print(f"\n\nConcluído:")
print(f"  Total de linhas:              {total:,}")
print(f"  Coordenadas importadas:       {atualizados:,}")
print(f"  Sem coordenadas (ignorados):  {sem_coord:,}")
print(f"  Fora de Goiânia (inválidos):  {invalidos:,}")
