export default function AssetFilters({ selectedAssets, onAssetToggle, assetTypes, regionalAverages, selectionTitle, selectionStats }) {
    const selectedAssetCount = Object.values(selectedAssets).filter(Boolean).length;

    return (
      <aside className="bg-white w-full md:w-96 flex flex-col h-auto md:h-full">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                  <h2 id="assets-heading" className="text-sm font-semibold text-gray-900">
                      Compare Neighbourhoods
                  </h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {selectedAssetCount} of {assetTypes.length}
                    </span>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-900 border-collapse">
                      <thead>
                      <tr className="border-b border-gray-200">
                          <th className="py-3 px-4 font-semibold">Asset Filter</th>
                          {selectionTitle && (
                            <th className="py-3 px-4 font-semibold text-right text-blue-600">{selectionTitle}</th>
                          )}
                          <th className="py-3 px-4 font-semibold text-right">Region (per 1000)</th>
                      </tr>
                      </thead>
                      <tbody>
                      {assetTypes.map(({ key, label }) => {
                          const isSelected = selectedAssets[key];
                          const isDisabled = selectedAssetCount === 1 && isSelected;

                          return (
                            <tr key={key} className={`border-b border-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                                <td className="py-3 px-4">
                                    <label className={`flex items-center ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => onAssetToggle(key)}
                                          disabled={isDisabled}
                                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-3 text-sm font-medium">{label}</span>
                                    </label>
                                </td>
                                {selectionStats && (
                                  <td className="py-3 px-4 text-right font-medium text-blue-700">
                                      {selectionStats[key]}
                                  </td>
                                )}
                                <td className="py-3 px-4 text-right text-gray-600">
                                    {regionalAverages[key]}
                                </td>
                            </tr>
                          );
                      })}
                      </tbody>
                  </table>
              </div>
          </div>
      </aside>
    );
}