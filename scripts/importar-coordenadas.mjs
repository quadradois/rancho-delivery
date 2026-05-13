import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import pg from 'pg';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const proj4 = require('/var/www/rancho-delivery/node_modules/.pnpm/proj4@2.20.8/node_modules/proj4/dist/proj4.js');

const PROJ_SIRGAS22S = '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const PROJ_WGS84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

const pool = new pg.Pool({
  connectionString: 'postgresql://rancho:767b76a9c501336ad077ff22d0aad53a46a25f20e3e5b85d@localhost:5432/rancho_delivery',
});

const CSV = '/root/rancho-delivery/docs/banco/base_imobiliaria_goiania_elyon_20260504.csv.gz';
const BATCH = 500;

function parseRow(line) {
  // CSV usa ; como separador e aspas duplas opcionais
  return line.split(';').map(v => v.replace(/^"|"$/g, '').trim());
}

async function flushBatch(batch) {
  if (batch.length === 0) return;
  const values = batch.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(',');
  const params = batch.flatMap(r => [r.nrinscr, r.lat, r.lng]);
  await pool.query(
    `UPDATE imoveis_prefeitura AS t SET latitude = v.lat::float, longitude = v.lng::float
     FROM (VALUES ${values}) AS v(nrinscr, lat, lng)
     WHERE t.nrinscr = v.nrinscr`,
    params,
  );
}

async function main() {
  const rl = createInterface({
    input: createReadStream(CSV).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let headers = null;
  let idxNrinscr, idxLat, idxLng;
  let batch = [];
  let total = 0, atualizados = 0, semCoord = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = parseRow(line);
      idxNrinscr = headers.indexOf('nrinscr');
      idxLat = headers.indexOf('latitude');
      idxLng = headers.indexOf('longitude');
      console.log(`Colunas: nrinscr=${idxNrinscr} latitude=${idxLat} longitude=${idxLng}`);
      continue;
    }

    total++;
    const cols = parseRow(line);
    const nrinscr = cols[idxNrinscr];
    const latRaw = cols[idxLat];   // UTM Northing (Y)
    const lngRaw = cols[idxLng];   // UTM Easting (X)

    if (!nrinscr || !latRaw || !lngRaw) { semCoord++; continue; }

    const northing = parseFloat(latRaw);
    const easting = parseFloat(lngRaw);
    if (!isFinite(northing) || !isFinite(easting)) { semCoord++; continue; }

    // Conversão UTM → WGS84: proj4([easting, northing]) → [lng, lat]
    const [lng, lat] = proj4(PROJ_SIRGAS22S, PROJ_WGS84, [easting, northing]);

    // Sanity check: Goiânia deve estar entre -17 e -16 lat, -50 e -49 lng
    if (lat < -18 || lat > -15 || lng < -51 || lng > -48) { semCoord++; continue; }

    batch.push({ nrinscr, lat, lng });
    atualizados++;

    if (batch.length >= BATCH) {
      await flushBatch(batch);
      batch = [];
      process.stdout.write(`\r  ${atualizados} coordenadas importadas...`);
    }
  }

  await flushBatch(batch);
  await pool.end();

  console.log(`\n\nConcluído:`);
  console.log(`  Total de linhas: ${total}`);
  console.log(`  Coordenadas importadas: ${atualizados}`);
  console.log(`  Sem coordenadas (ignorados): ${semCoord}`);
}

main().catch(err => { console.error(err); process.exit(1); });
