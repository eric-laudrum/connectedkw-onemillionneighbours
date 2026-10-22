'use client'

import { useState, useCallback } from "react";

import LeafletMap from "components/maps/LeafletMap";
import OneMillionNeighboursLayout from "components/one-million-neighbours/OneMillionNeighboursLayout";
import calculateCombinedAssetRanks from "components/one-million-neighbours/utils/calculateCombinedAssetRanks";
import AssetFilters from "components/one-million-neighbours/AssetFilters";

const ASSET_TYPES = [
    { key: 'parks', label: 'Green Space', dataKey: 'assets_parks_count', scoreKey: 'assets_parks_score' },
    { key: 'schools', label: 'Schools', dataKey: 'assets_schools_count', scoreKey: 'assets_schools_score' },
    { key: 'libraries', label: 'Libraries', dataKey: 'assets_libraries_count', scoreKey: 'assets_libraries_score' },
    { key: 'health', label: 'Healthcare', dataKey: 'assets_health_count', scoreKey: 'assets_health_score' },
    { key: 'transit', label: 'Transit', dataKey: 'assets_transit_count', scoreKey: 'assets_transit_score' },
    { key: 'community_spaces', label: 'Community Spaces', dataKey: 'assets_community_spaces_count', scoreKey: 'assets_community_spaces_score' },
];

const defaultGeoJSON = {
    "type": "FeatureCollection",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "name": "fsa_2021_reprojected",
    "features": []
}

export default function OneMillionNeighboursComponent({ neighbourhoodData, neighbourhoodGeography }) {
    const [selectedAssets, setSelectedAssets] = useState({
        parks: true,
        schools: true,
        libraries: true,
        health: true,
        transit: true,
        community_spaces: true,
    });

    const [activeNeighbourhoodIds, setActiveNeighbourhoodIds] = useState([]);

    const handleAssetToggle = (key) => {
        setSelectedAssets({
            ...selectedAssets,
            [key]: !selectedAssets[key]
        });
    };



    let features = []
    let totalNeighbourhoods = neighbourhoodData.length;

    try {
        features = neighbourhoodGeography.map(neighbourhood => {
            const properties = neighbourhoodData.find(f => f.DGUID === neighbourhood.DGUID)
            return {
                "type": "Feature",
                "properties": {
                    "CSDNAME": neighbourhood.CSDNAME,
                    "GEO_NAME": neighbourhood.GEO_NAME,
                    "DGUID": neighbourhood.DGUID,
                    "id": neighbourhood.id,
                    "PRNAME": "Ontario",
                    "LANDAREA": neighbourhood.landarea,
                    ...properties,
                },
                geometry: JSON.parse(neighbourhood.geometry)
            }
        })
    } catch (error) {
        console.error(error)
    }


    const rankedNeighbourhoodData = calculateCombinedAssetRanks(selectedAssets, neighbourhoodData);

    let selectionTitle = null;
    let selectionStats = null;
    let selectionScores = null;

    if (activeNeighbourhoodIds.length > 0) {
        if (activeNeighbourhoodIds.length === 1) {
            const geo = neighbourhoodGeography.find(g => g.DGUID === activeNeighbourhoodIds[0]);
            selectionTitle = geo?.GEO_NAME || 'Selected Region';
        } else {
            selectionTitle = 'Custom Selection';
        }

        const activeData = neighbourhoodData.filter(n => activeNeighbourhoodIds.includes(n.DGUID));

        selectionStats = ASSET_TYPES.reduce((acc, asset) => {
            const totalAssets = activeData.reduce((sum, n) => sum + (Number(n[asset.dataKey]) || 0), 0);
            const totalPopulation = activeData.reduce((sum, n) => sum + (Number(n.population_2021) || 0), 0);
            acc[asset.key] = totalPopulation > 0 ? ((totalAssets / totalPopulation) * 1000).toFixed(2) : '-';
            return acc;
        }, {});

        selectionScores = ASSET_TYPES.reduce((acc, asset) => {
            const totalScore = activeData.reduce((sum, n) => sum + (Number(n[asset.scoreKey]) || 0), 0);
            acc[asset.key] = activeData.length > 0 ? (totalScore / activeData.length) : 0;
            return acc;
        }, {});
    }

    const activeNeighbourhoods = rankedNeighbourhoodData.filter(n => activeNeighbourhoodIds.includes(n.DGUID));

    const handleRegionSelect = useCallback((selectedIds) => {
        setActiveNeighbourhoodIds(prev => {
            // Evaluate prev state against incoming state to prevent infinite render loop
            if (prev.length === selectedIds.length && prev.every(id => selectedIds.includes(id))) {
                return prev;
            }
            return selectedIds;
        });
    }, []);

    const regionalAverages = ASSET_TYPES.reduce((acc, asset) => {
        const totalAssets = neighbourhoodData.reduce((sum, n) => sum + (Number(n[asset.dataKey]) || 0), 0);
        const totalPopulation = neighbourhoodData.reduce((sum, n) => sum + (Number(n.population_2021) || 0), 0);
        acc[asset.key] = totalPopulation > 0 ? ((totalAssets / totalPopulation) * 1000).toFixed(2) : '0.00';
        return acc;
    }, {});

    const regionalScores = ASSET_TYPES.reduce((acc, asset) => {
        const totalScore = neighbourhoodData.reduce((sum, n) => sum + (Number(n[asset.scoreKey]) || 0), 0);
        acc[asset.key] = totalNeighbourhoods > 0 ? (totalScore / totalNeighbourhoods) : 0;
        return acc;
    }, {});

    // Create a map of DGUIDs to their rank groups (1, 2, or 3)
    const rankings = rankedNeighbourhoodData.reduce((acc, neighbourhood) => {
        acc[neighbourhood.DGUID] = neighbourhood.combined_rank;
        return acc
    }, {})

    const neighbourhoodGeoJSON = {
        ...defaultGeoJSON,
        features: features
    }

    const sideBar = <AssetFilters
      selectedAssets={selectedAssets}
      onAssetToggle={handleAssetToggle}
      assetTypes={ASSET_TYPES}
      regionalAverages={regionalAverages}
      regionalScores={regionalScores}
      selectionTitle={selectionTitle}
      selectionStats={selectionStats}
      selectionScores={selectionScores}
    />

    return (
      <OneMillionNeighboursLayout sidebar={sideBar}>
          <LeafletMap
            geojson={neighbourhoodGeoJSON}
            rankings={rankings}
            onRegionSelect={handleRegionSelect}
          />
      </OneMillionNeighboursLayout>
    );

}