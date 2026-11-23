'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Legend from './LeafletMapLegend'
import NeighbourhoodPopup from './NeighbourhoodPopup'
import findContainingFeature from 'components/one-million-neighbours/utils/findContainingFeature'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Pane = dynamic(() => import('react-leaflet').then(mod => mod.Pane), { ssr: false })

const MapControllerWrapper = dynamic(() => Promise.resolve(({ children }) => <>{children}</>), { ssr: false })

const WATERLOO_REGION_BOUNDS = [
  [43.2, -80.8],
  [43.7, -80.2]
]

const categories = [
  { name: 1, color: '#00B88A', label: 'Most access' },
  { name: 2, color: '#DE54A0', label: 'Average access' },
  { name: 3, color: '#7378cc', label: 'Least access' }
]

// DA outlines sit on top of the ranked ADAs, so they have no visible fill by default
const baseStyle = {
  fillColor: '#4B5563',
  fillOpacity: 0,
  color: '#4B5563',
  weight: 1,
  opacity: 0.6,
}

const highlightStyle = {
  fillOpacity: 0.25,
  weight: 2,
  opacity: 1,
}

const PARK_GREEN = '#166534'
const PARK_LIGHT_GREEN = '#bbf7d0'
const PARK_PATTERN_ID = 'park-trees-pattern'

const treePath = (x, y) => `M${x} ${y - 3}l2.5 4.5h-5zM${x - 0.5} ${y + 1.5}h1v1.5h-1z`

const parkStyle = {
  fillColor: `url(#${PARK_PATTERN_ID})`,
  fillOpacity: 0.9,
  color: PARK_GREEN,
  weight: 1,
  opacity: 1,
}

const treeIconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6.5" fill="${PARK_LIGHT_GREEN}" stroke="${PARK_GREEN}"/><path d="${treePath(7, 7)}" fill="${PARK_GREEN}"/></svg>`

const parksLayerName = `<span style="display:inline-flex;align-items:center;gap:4px">${treeIconSvg(14)}Parks</span>`

const parkPointToLayer = (feature, latlng) => {
  const L = require('leaflet')
  return L.marker(latlng, {
    icon: L.divIcon({ html: treeIconSvg(14), className: '', iconSize: [14, 14] }),
    interactive: false,
    keyboard: false,
    pane: 'parks',
  })
}

const ParkPatternDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs>
      <pattern id={PARK_PATTERN_ID} width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill={PARK_LIGHT_GREEN} />
        <path d={`${treePath(4, 4)}${treePath(12, 7)}${treePath(6, 12)}`} fill={PARK_GREEN} />
      </pattern>
    </defs>
  </svg>
)

const DisseminationAreaDetails = ({ feature }) => {
  const { DAUID, city, LANDAREA, population_2021, population_2025_estimate } = feature.properties
  return (
    <div className="mb-4">
      <h3 className="text-blue">Dissemination area {DAUID}</h3>
      <table className="text-sm text-right">
        <tbody>
        <tr>
          <td className="py-1 pr-2 text-left">City</td>
          <td className="py-1 px-2 border-l border-gray-300">{city}</td>
        </tr>
        <tr className="border-t border-gray-300">
          <td className="py-1 pr-2 text-left">Population (2021)</td>
          <td className="py-1 px-2 border-l border-gray-300">{Number(population_2021).toLocaleString()}</td>
        </tr>
        {population_2025_estimate != null && (
          <tr className="border-t border-gray-300">
            <td className="py-1 pr-2 text-left">Population (2025 est.)</td>
            <td className="py-1 px-2 border-l border-gray-300">{Number(population_2025_estimate).toLocaleString()}</td>
          </tr>
        )}
        <tr className="border-t border-gray-300">
          <td className="py-1 pr-2 text-left">Land area</td>
          <td className="py-1 px-2 border-l border-gray-300">{Number(LANDAREA).toLocaleString(undefined, { maximumFractionDigits: 2 })} km²</td>
        </tr>
        </tbody>
      </table>
    </div>
  )
}

// Map Controller to manage active highlight states for selected Neighbourhoods
function MapController({ selectedNeighbourhoods, setSelectedNeighbourhoods, setPopupPosition, setClickedDA, rankings, featureClickedRef, onBoundaryChange, isDA }) {
  const { useMap, useMapEvents } = require('react-leaflet')
  const map = useMap()

  useMapEvents({
    click() {
      if (featureClickedRef.current) return
      setSelectedNeighbourhoods([])
      setPopupPosition(null)
      setClickedDA(null)
    },
    baselayerchange(e) {
      if (e.name === 'Dissemination areas') {
        onBoundaryChange('da')
      } else if (e.name === 'Aggregate dissemination areas (access ranking)') {
        onBoundaryChange('ada')
      }
    }
  })

  useEffect(() => {
    if (!map) return
    const idKey = isDA ? 'DAUID' : 'DGUID'

    const updateStyle = (layer) => {
      // Only apply selected styling to Neighbourhoods (which have DGUID) or DAs (which have DAUID)
      if (layer.feature && layer.feature.properties && layer.feature.properties[idKey] && layer.setStyle) {
        const featureId = layer.feature.properties[idKey]
        const isSelected = selectedNeighbourhoods.some(f => f.properties[idKey] === featureId)

        if (isDA) {
          layer.setStyle({
            ...baseStyle,
            weight: isSelected ? 4 : baseStyle.weight,
            opacity: isSelected ? 1 : baseStyle.opacity,
            fillOpacity: isSelected ? 0.35 : 0
          })
        } else {
          const categoryNumber = rankings[featureId]
          const category = categories.find(c => c.name === categoryNumber)
          layer.setStyle({
            fillColor: category ? category.color : '#ccc',
            weight: isSelected ? 4 : 2,
            opacity: 1,
            color: category ? category.color : '#ccc',
            fillOpacity: isSelected ? 0.5 : 0.2
          })
        }

        if (isSelected && layer.bringToFront) {
          layer.bringToFront()
        }
      }
    }

    map.eachLayer((layer) => {
      updateStyle(layer)
      if (layer.eachLayer) {
        layer.eachLayer(subLayer => updateStyle(subLayer))
      }
    })
  }, [map, selectedNeighbourhoods, rankings, isDA])

  return null
}

function LassoSelection({ lassoEnabled, setLassoEnabled, setSelectedNeighbourhoods, setPopupPosition, setClickedDA, isDA }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  const lassoRef = useRef(null)

  useEffect(() => {
    if (!map) return
    let isMounted = true

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule
      window.L = L

      import('leaflet-lasso').then(() => {
        if (!isMounted || !map) return

        if (!lassoRef.current) {
          lassoRef.current = L.lasso(map, { intersect: true })
        }

        const handleLassoFinished = (event) => {
          const toggledFeatures = []
          const idKey = isDA ? 'DAUID' : 'DGUID'

          event.layers.forEach(layer => {
            const processFeature = (feat) => {
              if (feat && feat.properties && feat.properties[idKey]) {
                if (!toggledFeatures.some(f => f.properties[idKey] === feat.properties[idKey])) {
                  toggledFeatures.push(feat)
                }
              }
            }

            if (layer.feature) {
              processFeature(layer.feature)
            } else if (layer.eachLayer) {
              layer.eachLayer(subLayer => processFeature(subLayer.feature))
            }
          })

          if (toggledFeatures.length > 0) {
            setSelectedNeighbourhoods(toggledFeatures)
            setClickedDA(null) // clear DA selection on lasso
            if (event.latLngs && event.latLngs.length > 0) {
              setPopupPosition(event.latLngs[0])
            }
          }
          setLassoEnabled(false)
        }

        map.off('lasso.finished')
        map.on('lasso.finished', handleLassoFinished)
      })
    })

    return () => {
      isMounted = false
      if (map) {
        map.off('lasso.finished')
      }
    }
  }, [map, setLassoEnabled, setSelectedNeighbourhoods, setPopupPosition, setClickedDA, isDA])

  useEffect(() => {
    if (!map || !lassoRef.current) return

    if (lassoEnabled) {
      map.dragging.disable()
      map.getContainer().style.cursor = 'crosshair'
      lassoRef.current.enable()
    } else {
      map.dragging.enable()
      map.getContainer().style.cursor = ''
      lassoRef.current.disable()
    }
  }, [lassoEnabled, map])

  return null
}

function CustomZoomControl() {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const boundsMinZoom = map.getBoundsZoom(WATERLOO_REGION_BOUNDS)
    map.setMinZoom(boundsMinZoom)
    if (map.getZoom() < boundsMinZoom) {
      map.fitBounds(WATERLOO_REGION_BOUNDS)
    }
  }, [map])

  return (
    <div
      className="absolute top-4 left-4 flex flex-col bg-white rounded shadow-md overflow-hidden"
      style={{ zIndex: 1000 }}
      // Prevent map dragging or zooming when clicking these buttons
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.preventDefault()
          map.zoomIn()
        }}
        title="Zoom in"
        className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 border-b border-gray-200 font-bold text-xl"
      >
        +
      </button>
      <button
        onClick={(e) => {
          e.preventDefault()
          map.fitBounds(WATERLOO_REGION_BOUNDS)
        }}
        title="Reset map view"
        className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 border-b border-gray-200"
      >
        {/* Home Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.preventDefault()
          if (map.getZoom() > map.getMinZoom()) {
            map.zoomOut()
          }
        }}
        title="Zoom out"
        className="w-8 h-8 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 font-bold text-xl"
      >
        &minus;
      </button>
    </div>
  )
}

export default function DisseminationAreaMap({
                                               geojson,
                                               neighbourhoodGeojson,
                                               parksGeojson,
                                               rankings,
                                               boundaryType = 'ada',
                                               onBoundaryTypeChange,
                                               onRegionSelect,
                                               regionalProfileAverages
                                             }) {
  const [selectedNeighbourhoods, setSelectedNeighbourhoods] = useState([])
  const [popupPosition, setPopupPosition] = useState(null)
  const [clickedDA, setClickedDA] = useState(null)
  const [lassoEnabled, setLassoEnabled] = useState(false)
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [activeBoundaryType, setActiveBoundaryType] = useState(boundaryType)
  const [isMounted, setIsMounted] = useState(false)

  const featureClickedRef = useRef(false)
  const lassoEnabledRef = useRef(lassoEnabled)
  const compareEnabledRef = useRef(compareEnabled)
  const boundaryTypeRef = useRef(activeBoundaryType)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setActiveBoundaryType(boundaryType)
  }, [boundaryType])

  const handleBoundaryChange = (nextType) => {
    setActiveBoundaryType(nextType)
    if (onBoundaryTypeChange) onBoundaryTypeChange(nextType)
  }

  const isDA = activeBoundaryType === 'da'
  const idKey = isDA ? 'DAUID' : 'DGUID'

  useEffect(() => {
    boundaryTypeRef.current = activeBoundaryType
    setSelectedNeighbourhoods([])
    setPopupPosition(null)
    setClickedDA(null)
  }, [activeBoundaryType])

  useEffect(() => {
    if (onRegionSelect) {
      onRegionSelect(selectedNeighbourhoods.map(f => String(f.properties[idKey])))
    }
  }, [selectedNeighbourhoods, idKey, onRegionSelect])

  useEffect(() => {
    lassoEnabledRef.current = lassoEnabled
    if (lassoEnabled) setCompareEnabled(false)
  }, [lassoEnabled])

  useEffect(() => {
    compareEnabledRef.current = compareEnabled
    if (compareEnabled) setLassoEnabled(false)
  }, [compareEnabled])

  const handleNeighbourhoodSelection = (targetFeature, latlng, daFeature) => {
    if (!targetFeature) return
    const activeIdKey = boundaryTypeRef.current === 'da' ? 'DAUID' : 'DGUID'

    if (compareEnabledRef.current) {
      setSelectedNeighbourhoods(prev => {
        const isSelected = prev.some(f => f.properties[activeIdKey] === targetFeature.properties[activeIdKey])
        if (isSelected) {
          const newSelection = prev.filter(f => f.properties[activeIdKey] !== targetFeature.properties[activeIdKey])
          if (newSelection.length === 0) {
            setPopupPosition(null)
            setClickedDA(null)
          }
          return newSelection
        }
        setPopupPosition(latlng)
        setClickedDA(daFeature)
        return [...prev, targetFeature]
      })
      return
    }

    setPopupPosition(latlng)
    setClickedDA(daFeature)
    setSelectedNeighbourhoods([targetFeature])
  }

  const handleRemoveFeature = (featureId) => {
    setSelectedNeighbourhoods(prev => {
      const newArray = prev.filter(f => f.properties[idKey] !== featureId)
      if (newArray.length === 0) {
        setPopupPosition(null)
        setClickedDA(null)
      }
      return newArray
    })
  }

  // Handle clicks on the top-layer DAs
  const onEachFeature = useMemo(() => (feature, layer) => {
    layer.on({
      click: (e) => {
        if (e.originalEvent) e.originalEvent.stopPropagation()
        featureClickedRef.current = true
        setTimeout(() => { featureClickedRef.current = false }, 50)

        if (lassoEnabledRef.current) return

        if (boundaryTypeRef.current === 'da') {
          handleNeighbourhoodSelection(feature, e.latlng, null)
          return
        }

        const neighbourhood = findContainingFeature(e.latlng, neighbourhoodGeojson?.features || [])
        handleNeighbourhoodSelection(neighbourhood, e.latlng, feature)
      },
      mouseover: (e) => {
        e.target.setStyle(highlightStyle)
        e.target.bringToFront()
      },
      mouseout: (e) => {
        if (boundaryTypeRef.current === 'da') {
          const isSelected = selectedNeighbourhoods.some(f => f.properties.DAUID === feature.properties.DAUID)
          e.target.setStyle({
            ...baseStyle,
            weight: isSelected ? 4 : baseStyle.weight,
            opacity: isSelected ? 1 : baseStyle.opacity,
            fillOpacity: isSelected ? 0.35 : 0
          })
          return
        }
        e.target.setStyle(baseStyle)
      },
    })
  }, [neighbourhoodGeojson, selectedNeighbourhoods])

  // Handle clicks if the DA layer is turned off and they click ADAs directly
  const onEachNeighbourhood = useMemo(() => (feature, layer) => {
    layer.on('click', (e) => {
      if (e.originalEvent) e.originalEvent.stopPropagation()
      featureClickedRef.current = true
      setTimeout(() => { featureClickedRef.current = false }, 50)

      if (lassoEnabledRef.current) return

      handleNeighbourhoodSelection(feature, e.latlng, null)
    })
  }, [])

  const neighbourhoodStyle = useMemo(() => (feature) => {
    const categoryNumber = rankings[feature.properties.DGUID]
    const category = categories.find(c => c.name === categoryNumber)
    return {
      fillColor: category ? category.color : '#ccc',
      weight: 2,
      opacity: 1,
      color: category ? category.color : '#ccc',
      fillOpacity: 0.2
    }
  }, [rankings])

  if (!isMounted) {
    return <div className="w-full h-[60vh] md:h-full bg-gray-50 flex items-center justify-center text-gray-400">Loading map...</div>
  }

  const { LayersControl } = require('react-leaflet')

  return (
    <div className="w-full h-[60vh] md:h-full overflow-hidden relative">
      <ParkPatternDefs />
      <style>{'.leaflet-top.leaflet-left { margin-left: 150px; margin-top: 4px; }'}</style>
      <MapContainer
        center={[43.45, -80.5]}
        zoom={11}
        minZoom={10}
        maxBounds={WATERLOO_REGION_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Pane name="neighbourhoods" style={{ zIndex: 410 }} />
        <Pane name="disseminationAreas" style={{ zIndex: 420 }} />
        <Pane name="parks" style={{ zIndex: 430 }} />

        <LayersControl position="topleft">
          {neighbourhoodGeojson && (
            <LayersControl.BaseLayer checked={!isDA} name="Aggregate dissemination areas (access ranking)">
              <GeoJSON
                key="ada-layer"
                data={neighbourhoodGeojson}
                style={neighbourhoodStyle}
                onEachFeature={onEachNeighbourhood}
                pane="neighbourhoods"
              />
            </LayersControl.BaseLayer>
          )}
          {geojson && (
            <LayersControl.BaseLayer checked={isDA} name="Dissemination areas">
              <GeoJSON
                key="da-layer"
                data={geojson}
                style={baseStyle}
                onEachFeature={onEachFeature}
                pane="disseminationAreas"
              />
            </LayersControl.BaseLayer>
          )}
          {parksGeojson && (
            <LayersControl.Overlay name={parksLayerName}>
              <GeoJSON
                data={parksGeojson}
                style={parkStyle}
                pointToLayer={parkPointToLayer}
                interactive={false}
                pane="parks"
              />
            </LayersControl.Overlay>
          )}
        </LayersControl>

        <MapControllerWrapper>
          <CustomZoomControl />
          <MapController
            selectedNeighbourhoods={selectedNeighbourhoods}
            setSelectedNeighbourhoods={setSelectedNeighbourhoods}
            setPopupPosition={setPopupPosition}
            setClickedDA={setClickedDA}
            rankings={rankings}
            featureClickedRef={featureClickedRef}
            onBoundaryChange={handleBoundaryChange}
            isDA={isDA}
          />
          <LassoSelection
            lassoEnabled={lassoEnabled}
            setLassoEnabled={setLassoEnabled}
            setSelectedNeighbourhoods={setSelectedNeighbourhoods}
            setPopupPosition={setPopupPosition}
            setClickedDA={setClickedDA}
            isDA={isDA}
          />
        </MapControllerWrapper>

        {selectedNeighbourhoods.length > 0 && popupPosition && (
          <Popup
            key={`popup-${isDA}-${compareEnabled}-${selectedNeighbourhoods.length}`}
            position={popupPosition}
            closeButton={false}
            maxWidth={800}
            minWidth={50}
          >
            {isDA ? (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {selectedNeighbourhoods.map((daFeature) => (
                  <div key={daFeature.properties.DAUID} className="relative">
                    {compareEnabled && (
                      <button
                        onClick={() => handleRemoveFeature(daFeature.properties.DAUID)}
                        className="float-right text-xs text-gray-400 hover:text-gray-700"
                      >
                        &times;
                      </button>
                    )}
                    <DisseminationAreaDetails feature={daFeature} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {clickedDA && <DisseminationAreaDetails feature={clickedDA} />}
                {clickedDA && selectedNeighbourhoods.length > 0 && <hr className="border-gray-300" />}

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Aggregate dissemination
                    area(s)</p>
                  <NeighbourhoodPopup
                    features={selectedNeighbourhoods}
                    onRemoveFeature={handleRemoveFeature}
                    isCompareMode={compareEnabled}
                    regionalProfileAverages={regionalProfileAverages}
                  />
                </div>
              </div>
            )}
          </Popup>
        )}

        <Legend categories={categories} />
      </MapContainer>

      {/* Action Buttons Overlay */}
      <div
        className="absolute top-4 left-16 flex flex-row items-center bg-white rounded shadow-md border border-gray-200 divide-x divide-gray-200 overflow-hidden"
        style={{ zIndex: 1000 }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setLassoEnabled(!lassoEnabled)}
          title="Draw a freehand lasso to select areas"
          aria-pressed={lassoEnabled}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${lassoEnabled ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 22a5 5 0 0 1-2-4" />
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        </button>
        <button
          onClick={() => setCompareEnabled(!compareEnabled)}
          title="Click multiple areas to compare"
          aria-pressed={compareEnabled}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${compareEnabled ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          </svg>
        </button>
      </div>
    </div>
  )
}