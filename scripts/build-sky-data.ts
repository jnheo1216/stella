import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type StarRecord = {
  id: number;
  raDeg: number;
  decDeg: number;
  mag: number;
  name?: string;
};

type SegmentRecord = {
  fromStarId: number;
  toStarId: number;
  code: string;
};

type LabelRecord = {
  code: string;
  name: string;
  nameKo?: string;
  raDeg: number;
  decDeg: number;
  rank: number;
};

type GeoFeature<TGeometry, TProps = Record<string, unknown>> = {
  type: 'Feature';
  id: string | number;
  properties: TProps;
  geometry: {
    type: TGeometry;
    coordinates: unknown;
  };
};

type FeatureCollection<TGeometry, TProps = Record<string, unknown>> = {
  type: 'FeatureCollection';
  features: Array<GeoFeature<TGeometry, TProps>>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceDataDir = path.join(projectRoot, 'node_modules', 'd3-celestial', 'data');
const outputDir = path.join(projectRoot, 'public', 'data');
const rawInfoDir = path.join(projectRoot, 'data', 'raw');

const STAR_MAG_LIMIT = 6.5;

function wrapRa(rawRaDeg: number): number {
  if (rawRaDeg < 0) {
    return rawRaDeg + 360;
  }
  return rawRaDeg;
}

function keyForCoord(raDeg: number, decDeg: number): string {
  return `${raDeg.toFixed(4)}:${decDeg.toFixed(4)}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function makeCleanName(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') {
    return undefined;
  }

  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function averageWrappedAnglesDeg(angles: number[]): number {
  const sin = angles.reduce((acc, angle) => acc + Math.sin((angle * Math.PI) / 180), 0);
  const cos = angles.reduce((acc, angle) => acc + Math.cos((angle * Math.PI) / 180), 0);
  const avg = (Math.atan2(sin, cos) * 180) / Math.PI;
  return avg < 0 ? avg + 360 : avg;
}

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function main(): Promise<void> {
  const starsCollection = await loadJson<FeatureCollection<'Point', { mag?: number; bv?: string }>>(
    path.join(sourceDataDir, 'stars.6.json')
  );

  const starNames = await loadJson<
    Record<string, { name?: string; desig?: string; bayer?: string; flam?: string }>
  >(path.join(sourceDataDir, 'starnames.json'));

  const lineCollection = await loadJson<FeatureCollection<'MultiLineString'>>(
    path.join(sourceDataDir, 'constellations.lines.json')
  );

  const constellationCollection = await loadJson<
    FeatureCollection<
      'Point',
      {
        name?: string;
        en?: string;
        ko?: string;
        desig?: string;
        rank?: string | number;
      }
    >
  >(path.join(sourceDataDir, 'constellations.json'));

  const stars: StarRecord[] = [];
  const coordToStarId = new Map<string, number>();

  for (const feature of starsCollection.features) {
    const rawId = Number(feature.id);
    const rawMag = feature.properties.mag;
    const coords = feature.geometry.coordinates as [number, number];

    if (!Number.isInteger(rawId) || !isFiniteNumber(rawMag) || rawMag > STAR_MAG_LIMIT) {
      continue;
    }

    const [rawRa, decDeg] = coords;
    if (!isFiniteNumber(rawRa) || !isFiniteNumber(decDeg)) {
      continue;
    }

    const raDeg = wrapRa(rawRa);
    const nameInfo = starNames[String(rawId)];
    const name =
      makeCleanName(nameInfo?.name) ??
      makeCleanName(nameInfo?.desig) ??
      makeCleanName(nameInfo?.bayer) ??
      makeCleanName(nameInfo?.flam);

    stars.push({
      id: rawId,
      raDeg,
      decDeg,
      mag: rawMag,
      ...(name ? { name } : {})
    });

    coordToStarId.set(keyForCoord(raDeg, decDeg), rawId);
  }

  let syntheticStarId = 100000000;
  const ensureStarId = (rawRaDeg: number, decDeg: number): number => {
    const raDeg = wrapRa(rawRaDeg);
    const key = keyForCoord(raDeg, decDeg);
    const existing = coordToStarId.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const id = syntheticStarId++;
    stars.push({
      id,
      raDeg,
      decDeg,
      mag: STAR_MAG_LIMIT
    });
    coordToStarId.set(key, id);
    return id;
  };

  const segments: SegmentRecord[] = [];
  for (const feature of lineCollection.features) {
    const code = String(feature.id);
    const multi = feature.geometry.coordinates as number[][][];

    for (const line of multi) {
      for (let i = 0; i < line.length - 1; i += 1) {
        const [fromRawRa, fromDec] = line[i];
        const [toRawRa, toDec] = line[i + 1];

        if (
          !isFiniteNumber(fromRawRa) ||
          !isFiniteNumber(fromDec) ||
          !isFiniteNumber(toRawRa) ||
          !isFiniteNumber(toDec)
        ) {
          continue;
        }

        const fromStarId = ensureStarId(fromRawRa, fromDec);
        const toStarId = ensureStarId(toRawRa, toDec);

        segments.push({
          fromStarId,
          toStarId,
          code
        });
      }
    }
  }

  const labelsByCode = new Map<
    string,
    {
      name: string;
      nameKo?: string;
      rank: number;
      ra: number[];
      dec: number[];
    }
  >();

  for (const feature of constellationCollection.features) {
    const code = String(feature.properties.desig ?? feature.id);
    const name =
      makeCleanName(feature.properties.en) ??
      makeCleanName(feature.properties.name) ??
      code;
    const nameKo = makeCleanName(feature.properties.ko);

    const rawRank = Number(feature.properties.rank ?? 3);
    const rank = Number.isFinite(rawRank) ? rawRank : 3;

    const [rawRa, rawDec] = feature.geometry.coordinates as [number, number];
    if (!isFiniteNumber(rawRa) || !isFiniteNumber(rawDec)) {
      continue;
    }

    const raDeg = wrapRa(rawRa);
    const decDeg = rawDec;

    const existing = labelsByCode.get(code);
    if (!existing) {
      labelsByCode.set(code, {
        name,
        ...(nameKo ? { nameKo } : {}),
        rank,
        ra: [raDeg],
        dec: [decDeg]
      });
      continue;
    }

    existing.ra.push(raDeg);
    existing.dec.push(decDeg);
    existing.rank = Math.min(existing.rank, rank);
  }

  const labels: LabelRecord[] = Array.from(labelsByCode.entries())
    .map(([code, value]) => ({
      code,
      name: value.name,
      ...(value.nameKo ? { nameKo: value.nameKo } : {}),
      rank: value.rank,
      raDeg: averageWrappedAnglesDeg(value.ra),
      decDeg: value.dec.reduce((acc, dec) => acc + dec, 0) / value.dec.length
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  stars.sort((a, b) => a.id - b.id);

  await mkdir(outputDir, { recursive: true });
  await mkdir(rawInfoDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(outputDir, 'stars.min.json'), JSON.stringify(stars)),
    writeFile(path.join(outputDir, 'constellations.min.json'), JSON.stringify(segments)),
    writeFile(path.join(outputDir, 'constellation-labels.json'), JSON.stringify(labels)),
    writeFile(
      path.join(rawInfoDir, 'sources.json'),
      JSON.stringify(
        {
          sourcePackage: 'd3-celestial',
          generatedAt: new Date().toISOString(),
          files: ['stars.6.json', 'starnames.json', 'constellations.lines.json', 'constellations.json'],
          magnitudeLimit: STAR_MAG_LIMIT
        },
        null,
        2
      )
    )
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `Generated stars=${stars.length}, segments=${segments.length}, labels=${labels.length} into public/data`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
