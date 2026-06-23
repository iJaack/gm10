const MISSING_REF_RE = /^(missing|blocked|rate-limited):\/\//;

function hasEnv(env, name) {
  return typeof env?.[name] === 'string' && env[name].trim().length > 0;
}

function classifyObservation(observation = {}) {
  const rawPayloadRef = String(observation.rawPayloadRef ?? '');
  const valueUsdc6 = String(observation.valueUsdc6 ?? '');
  const confidence = Number(observation.confidence);
  if (rawPayloadRef.startsWith('rate-limited://')) {
    return 'rate_limited';
  }
  if (MISSING_REF_RE.test(rawPayloadRef) || (valueUsdc6 === '0' && confidence === 0)) {
    return 'missing';
  }
  return 'live';
}

function summarizeSourceObservations(pack) {
  const summaries = new Map();

  for (const card of pack?.cards ?? []) {
    for (const observation of card.observations ?? []) {
      const sourceId = String(observation.sourceId ?? 'unknown');
      const status = classifyObservation(observation);
      const current = summaries.get(sourceId) ?? {
        sourceId,
        live: 0,
        missing: 0,
        rateLimited: 0,
        examples: [],
      };

      if (status === 'live') current.live += 1;
      if (status === 'missing') current.missing += 1;
      if (status === 'rate_limited') current.rateLimited += 1;
      if (status !== 'live' && current.examples.length < 3) {
        current.examples.push({
          positionId: card.positionId,
          sourceName: observation.sourceName,
          reason: observation.matchReason,
        });
      }

      summaries.set(sourceId, current);
    }
  }

  return [...summaries.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export function buildValuationSourceReadiness({
  env = process.env,
  pack,
} = {}) {
  return {
    providers: [
      {
        sourceId: 'primary',
        providerId: 'pokemon-price-tracker',
        sourceName: 'PokemonPriceTracker',
        status: hasEnv(env, 'POKEMON_PRICE_TRACKER_API_KEY') ? 'configured' : 'missing_auth',
        detail: hasEnv(env, 'POKEMON_PRICE_TRACKER_API_KEY')
          ? 'API key configured; card identity is still required per card.'
          : 'Set POKEMON_PRICE_TRACKER_API_KEY to enable live primary FMV observations.',
      },
      {
        sourceId: 'benchmark',
        providerId: 'registry-current-mark',
        sourceName: 'Current registry mark',
        status: 'configured',
        detail: 'Continuity benchmark uses the current onchain registry mark; it is not independent market evidence.',
      },
      {
        sourceId: 'benchmark',
        providerId: 'independent-benchmark',
        sourceName: 'Independent benchmark vendor',
        status: 'missing_provider',
        detail: 'No independent benchmark vendor is configured yet.',
      },
      {
        sourceId: 'evidence',
        providerId: 'courtyard',
        sourceName: 'Courtyard',
        status: 'available_with_identity',
        detail: 'No API key is required; live evidence needs a Courtyard asset id from token metadata or a runtime override.',
      },
      {
        sourceId: 'evidence',
        providerId: 'phygitals',
        sourceName: 'Phygitals',
        status: 'available_with_identity',
        detail: 'No API key is required; live evidence needs a Phygitals slug from identity metadata or a runtime override.',
      },
    ],
    sourceQuality: summarizeSourceObservations(pack),
  };
}
