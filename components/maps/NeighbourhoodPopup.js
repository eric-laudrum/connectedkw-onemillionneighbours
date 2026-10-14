const NeighbourhoodPopup = ({ features, onRemoveFeature }) => {
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