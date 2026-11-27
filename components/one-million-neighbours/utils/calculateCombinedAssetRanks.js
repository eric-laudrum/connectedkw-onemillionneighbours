const ASSET_SCORE_FIELDS = {
    parks: 'assets_parks_score_2025',
    schools: 'assets_schools_score_2025',
    libraries: 'assets_libraries_score_2025',
    health: 'assets_health_score_2025',
    transit: 'assets_transit_score_2025',
    community_spaces: 'assets_community_spaces_score_2025',
    childcare: 'assets_childcare_score_2025',
};

const getCombinedMetric = (assetFilters, area) => {
    const selectedScoreTotal = Object.entries(ASSET_SCORE_FIELDS).reduce((total, [asset, scoreField]) => {
        if (!assetFilters[asset]) return total;
        return total + (Number(area[scoreField]) || 0);
    }, 0);

    // Unselected assets contribute zero, matching the existing filtering behaviour.
    const combinedMetric = selectedScoreTotal / Object.keys(ASSET_SCORE_FIELDS).length;
    return Math.round(combinedMetric * 1000000) / 1000000;
};

const getRankTier = (index, areaCount) => {
    if (index < areaCount / 3) return 1;
    if (index < areaCount * 2 / 3) return 2;
    return 3;
};

// Rank pre-defined boundaries using the standardized scores calculated during data preprocessing.
export default function calculateCombinedAssetRanks(assetFilters, areaData) {
    const scoredAreas = areaData.map(area => ({
        ...area,
        combined_metric: getCombinedMetric(assetFilters, area),
    }));

    const sortedAreas = scoredAreas.sort((a, b) => b.combined_metric - a.combined_metric);

    return sortedAreas.map((area, index) => ({
        ...area,
        combined_rank: getRankTier(index, sortedAreas.length),
    }));
}

// Combine a manual selection of DAs, weighting every asset score by estimated 2025 population.
export function calculateClusterScores(selectedAreas) {
    const totalPopulation = selectedAreas.reduce((total, area) => {
        return total + (Number(area.population_2025_estimate) || 0);
    }, 0);

    return Object.values(ASSET_SCORE_FIELDS).reduce((clusterScores, scoreField) => {
        const weightedScoreTotal = selectedAreas.reduce((total, area) => {
            const population = Number(area.population_2025_estimate) || 0;
            const score = Number(area[scoreField]) || 0;
            return total + score * population;
        }, 0);

        clusterScores[scoreField] = totalPopulation > 0 ? weightedScoreTotal / totalPopulation : 0;
        return clusterScores;
    }, {});
}

// Locate a manually-selected DA cluster within the thirds established by the ADA boundaries.
export function getClusterRankTier(clusterScores, assetFilters, rankedAdaData) {
    if (rankedAdaData.length === 0) return null;

    const clusterMetric = getCombinedMetric(assetFilters, clusterScores);
    const higherScoreCount = rankedAdaData.filter(area => area.combined_metric > clusterMetric).length;

    return getRankTier(higherScoreCount, rankedAdaData.length);
}
