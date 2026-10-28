import { useState } from "react";

export default function AssetFilters({ selectedAssets, onAssetToggle, assetTypes, regionalAverages, regionalScores, selectionTitle, selectionStats, selectionScores, selectedRegions, onRemoveRegion }) {
    const selectedAssetCount = Object.values(selectedAssets).filter(Boolean).length;
    const [isExpanded, setIsExpanded] = useState(false);

    const getScoreBg = (scoreVal) => {
        const score = parseFloat(scoreVal);
        if (isNaN(score)) return 'bg-transparent text-gray-900';

        if (score >= 1.0) return 'bg-green-200 text-green-900';
        if (score >= 0.25) return 'bg-green-100 text-green-900';
        if (score > -0.25) return 'bg-gray-50 text-gray-900';
        if (score > -1.0) return 'bg-red-100 text-red-900';
        return 'bg-red-200 text-red-900';
    };

    const getScoreStyle = (scoreVal) => {
        const score = parseFloat(scoreVal);
        if (isNaN(score)) return 'bg-transparent text-gray-900';

        // Category 1: Most access (#00B88A)
        if (score >= 1.0) return 'bg-[#00B88A]/30 text-[#006b50]';
        if (score >= 0.43) return 'bg-[#00B88A]/15 text-[#006b50]';

        // Category 3: Least access (#7378cc)
        if (score <= -1.0) return 'bg-[#7378cc]/30 text-[#404373]';
        if (score <= -0.43) return 'bg-[#7378cc]/15 text-[#404373]';

        // Category 2: Average access (#DE54A0)
        // Scores near zero are strictly average and receive the lightest shade
        if (Math.abs(score) < 0.15) return 'bg-[#DE54A0]/10 text-[#8a3463]';
        return 'bg-[#DE54A0]/25 text-[#8a3463]';
    };

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

                          {/* Conditionally renders headers for individual regions when expanded */}
                          {isExpanded && selectedRegions.length > 1 && selectedRegions.map(region => (
                            <th key={region.id} className="py-3 px-4 font-semibold text-right text-blue-800 text-xs">
                                {region.name}
                            </th>
                          ))}

                          {selectionTitle && (
                            <th className="py-3 px-4 font-semibold text-right text-blue-600">
                                <div className="flex items-center justify-end gap-2">
                                    {selectedRegions.length > 1 && (
                                      <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                                        aria-label="Toggle individual regions"
                                      >
                                          <svg
                                            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M15 19l-7-7 7-7" />
                                          </svg>
                                      </button>
                                    )}
                                    <span>{selectionTitle}</span>
                                </div>
                            </th>
                          )}
                          <th className="py-3 px-4 font-semibold text-right">Region (per 1000)</th>
                      </tr>
                      </thead>
                      <tbody>
                      {assetTypes.map(({ key, label }) => {
                          const isSelected = selectedAssets[key];
                          const isDisabled = selectedAssetCount === 1 && isSelected;

                          return (
                            <tr key={key}
                                className={`border-b border-gray-100 transition-all ${!isSelected ? 'opacity-50 grayscale' : ''}`}>
                                <td className={`py-3 px-4 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                                    <label
                                      className={`flex items-center ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
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
                                {isExpanded && selectedRegions.length > 1 && selectedRegions.map(region => (
                                  <td key={region.id}
                                      className={`py-3 px-4 text-right font-medium transition-colors ${getScoreStyle(region.scores[key])}`}>
                                      {region.stats[key]}
                                  </td>
                                ))}
                                {selectionStats && (
                                  <td
                                    className={`py-3 px-4 text-right font-medium transition-colors ${getScoreStyle(selectionScores[key])}`}>
                                      {selectionStats[key]}
                                  </td>
                                )}
                                <td
                                  className={`py-3 px-4 text-right transition-colors ${getScoreStyle(regionalScores[key])}`}>
                                    {regionalAverages[key]}
                                </td>
                            </tr>
                          );
                      })}
                      </tbody>
                  </table>
              </div>

              {/* Table Legend */}
              <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-600">
                  <div className="font-semibold text-gray-700 mb-2">Access Tiers</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-[#00B88A] inline-block"></span>
                          <span>Most Access</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-[#DE54A0] inline-block"></span>
                          <span>Average Access</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-[#7378cc] inline-block"></span>
                          <span>Least Access</span>
                      </div>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">
                      Deeper shades indicate stronger statistical deviation from the regional average.
                  </p>
              </div>

              {selectedRegions && selectedRegions.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Selected Regions:</h3>
                    <ul className="text-sm text-gray-600 space-y-2 max-h-48 overflow-y-auto pl-1 pr-2">
                        {selectedRegions.map((region) => (
                          <li key={region.id}
                              className="flex items-center justify-between bg-gray-50 border border-gray-100 px-3 py-2 rounded-md">
                              <span className="font-medium">{region.name}</span>
                              <button
                                onClick={() => onRemoveRegion(region.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                aria-label="Remove region"
                              >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                              </button>
                          </li>
                        ))}
                    </ul>
                </div>
              )}
          </div>
      </aside>
    );
}