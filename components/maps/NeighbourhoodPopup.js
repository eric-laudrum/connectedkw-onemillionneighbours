import { useState } from 'react';

const NeighbourhoodPopup = ({ features, onRemoveFeature, isCompareMode }) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');

  if (!features || features.length === 0) return null

  const totalPopulation = features.reduce((sum, f) => sum + (f.properties.population_2021 || 0), 0)

  const getCount = (prop) => features.reduce((sum, f) => sum + (f.properties[prop] || 0), 0)

  const getWeightedAvg = (prop) => {
    if (totalPopulation === 0) return 0
    const sum = features.reduce((acc, f) => acc + ((f.properties[prop] || 0) * (f.properties.population_2021 || 0)), 0)
    return sum / totalPopulation
  }

  const getPer1000 = (val) => {
    if (totalPopulation === 0) return "0.0"
    return ((val / totalPopulation) * 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }

  const parks = getCount('assets_parks_count')
  const schools = getCount('assets_schools_count')
  const libraries = getCount('assets_libraries_count')
  const health = getCount('assets_health_count')
  const transit = getCount('assets_transit_count')
  const community = getCount('assets_community_spaces_count')

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedFeatures = [...features].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a.properties[sortKey] || 0;
    const valB = b.properties[sortKey] || 0;
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  if (isCompareMode) {
    const ASSET_STATS = [
      { key: 'assets_parks_count', label: 'Green Space' },
      { key: 'assets_schools_count', label: 'Schools' },
      { key: 'assets_libraries_count', label: 'Libraries' },
      { key: 'assets_health_count', label: 'Healthcare' },
      { key: 'assets_transit_count', label: 'Transit Stops' },
      { key: 'assets_community_spaces_count', label: 'Community Spaces' }
    ];

    const PROFILE_STATS = [
      { key: 'single_detached_house', label: 'Single-detached housing' },
      { key: 'crowded', label: 'Overcrowded housing' },
      { key: 'shelter_costs_over_30_percent', label: 'Unaffordable housing' },
      { key: 'commute_transit', label: 'Transit commuters' },
      { key: 'children', label: 'Households with children' },
      { key: 'low_income', label: 'Low-income households' },
      { key: 'non_official_language', label: 'Non-official language speakers' },
      { key: 'visible_minority', label: 'Visible minorities' }
    ];

    return (
      <div className="max-h-96 w-max max-w-[800px] overflow-auto p-1 pr-2">
        <table className="w-max text-sm text-left border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
          <tr>
            <th className="p-2 font-bold text-gray-700 border-b align-bottom w-32 min-w-[128px]">Metric</th>
            {sortedFeatures.map(f => (
              <th key={f.properties.DGUID} className="p-2 font-bold text-blue-600 border-b align-bottom w-40 min-w-[160px] max-w-[160px]">
                <div className="flex justify-between items-center gap-1 min-w-0">
                  <span className="truncate flex-1" title={f.properties.GEO_NAME}>{f.properties.GEO_NAME}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFeature(f.properties.DGUID);
                    }}
                    className="text-gray-400 hover:text-red-500 font-normal px-1 rounded hover:bg-gray-100 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs font-normal text-gray-500 mt-1 truncate">
                  Pop: {(f.properties.population_2021 || 0).toLocaleString()}
                </div>
              </th>
            ))}
          </tr>
          </thead>
          <tbody>

          {ASSET_STATS.map(stat => (
            <tr key={stat.key} className="border-b border-gray-100 hover:bg-gray-50">
              <td
                className="p-2 font-semibold text-gray-600 cursor-pointer hover:text-blue-500 flex items-center gap-1 select-none"
                onClick={() => handleSort(stat.key)}
              >
                {stat.label}
                {sortKey === stat.key && (
                  <span className="text-xs ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </td>
              {sortedFeatures.map(f => (
                <td key={`${f.properties.DGUID}-${stat.key}`} className="p-2 text-gray-800">
                  {(f.properties[stat.key] || 0).toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td colSpan={sortedFeatures.length + 1} className="p-2 font-bold bg-gray-50 mt-4">Neighbourhood Profile
              (%)
            </td>
          </tr>
          {PROFILE_STATS.map(stat => (
            <tr key={stat.key} className="border-b border-gray-100 hover:bg-gray-50">
              <td
                className="p-2 font-semibold text-gray-600 cursor-pointer hover:text-blue-500 flex items-center gap-1 select-none"
                onClick={() => handleSort(stat.key)}
              >
                {stat.label}
                {sortKey === stat.key && (
                  <span className="text-xs ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </td>
              {sortedFeatures.map(f => (
                <td key={`${f.properties.DGUID}-${stat.key}`} className="p-2 text-gray-800">
                  {(f.properties[stat.key] || 0).toFixed(0)}%
                </td>
              ))}
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-auto pr-2">
      <div className="mb-4">
        {features.map(f => (
          <div key={f.properties.DGUID}
               className="flex justify-between items-center text-blue font-bold py-1 border-b border-gray-100 last:border-0">
            <span>{f.properties.GEO_NAME}</span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFeature(f.properties.DGUID);
              }}
              className="ml-4 text-gray-400 hover:text-red-500 font-normal px-2 rounded hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="text-sm">
        <div>Population {totalPopulation.toLocaleString()}</div>

        <h3 className="mt-4 font-bold">Neighbourhood assets</h3>
        <table className="text-right w-full">
          <thead>
          <tr>
            <th className="py-1"></th>
            <th className="py-1 px-2 border-l border-gray-300">Count</th>
            <th className="py-1 px-2 border-l border-gray-300">Per 1,000</th>
          </tr>
          </thead>
          <tbody>
          <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Green Space</td>
              <td className="py-1 px-2 border-l border-gray-300">{parks}</td>
              <td className="py-1 px-2 border-l border-gray-300">{getPer1000(parks)}</td>
            </tr>

            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Schools</td>
              <td className="py-1 px-2 border-l border-gray-300">{schools}</td>
              <td className="py-1 px-2 border-l border-gray-300">{getPer1000(schools)}</td>
            </tr>

            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Libraries</td>
              <td className="py-1 px-2 border-l border-gray-300">{libraries}</td>
              <td className="py-1 px-2 border-l border-gray-300">{getPer1000(libraries)}</td>
            </tr>

            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Healthcare</td>
              <td className="py-1 px-2 border-l border-gray-300">{health}</td>
              <td className="py-1 px-2 border-l border-gray-300">{getPer1000(health)}</td>
            </tr>

            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Transit Stops</td>
              <td className="py-1 px-2 border-l border-gray-300">{transit}</td>
              <td className="py-1 px-2 border-l border-gray-300">{getPer1000(transit)}</td>
            </tr>

            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Community Spaces</td>
              <td className="py-1 px-2 border-l border-gray-300">{community}</td>
              <td className="py-1 px-2 border-l border-gray-300">{getPer1000(community)}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-6 font-bold">Neighbourhood profile</h3>
        <table className="text-right w-full">
          <tbody>
            <tr>
              <td className="py-1 pr-2 text-left">Single-detached housing</td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('single_detached_house').toFixed(0)}%
              </td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Overcrowded housing <br /><small>more than one person per room</small>
              </td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('crowded').toFixed(0)}%</td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Unaffordable housing <br /><small>30% or more of income</small></td>
              <td
                className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('shelter_costs_over_30_percent').toFixed(0)}%
              </td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Transit commuters</td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('commute_transit').toFixed(0)}%</td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Households with children</td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('children').toFixed(0)}%</td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Low-income households</td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('low_income').toFixed(0)}%</td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Non-official language speakers</td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('non_official_language').toFixed(0)}%
              </td>
            </tr>
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-left">Visible minorities</td>
              <td className="py-1 px-2 border-l border-gray-300">{getWeightedAvg('visible_minority').toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}


export default NeighbourhoodPopup