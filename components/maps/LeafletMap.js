'use client'
import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic'
import Legend from './LeafletMapLegend'
import NeighbourhoodPopup from './NeighbourhoodPopup'
import 'leaflet/dist/leaflet.css'
import { useMap, useMapEvents } from 'react-leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

const categories = [
  { name: 1, color: '#00B88A', label: 'Most access' },
  { name: 2, color: '#DE54A0', label: 'Average access' },
  { name: 3, color: '#7378cc', label: 'Least access' }
]

function MapController({ selectedNeighbourhoods, setSelectedNeighbourhoods, setPopupPosition, rankings, featureClickedRef }) {
  const map = useMap()

  useMapEvents({
    click() {
      if (featureClickedRef.current) return
      setSelectedNeighbourhoods([])
      setPopupPosition(null)
    }
  })

  useEffect(() => {
    if (!map) return

    const updateStyle = (layer) => {
      if (layer.feature && layer.feature.properties && layer.setStyle) {
        const categoryNumber = rankings[layer.feature.properties.DGUID]
        const category = categories.find(c => c.name === categoryNumber)
        const isSelected = selectedNeighbourhoods.some(f => f.properties.DGUID === layer.feature.properties.DGUID)

        layer.setStyle({
          fillColor: category.color,
          weight: isSelected ? 4 : 2,
          opacity: 1,
          color: category.color,
          fillOpacity: isSelected ? 0.5 : 0.2
        })

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
  }, [map, selectedNeighbourhoods, rankings])

  return null
}

function LassoSelection({ lassoEnabled, setLassoEnabled, setSelectedNeighbourhoods, setPopupPosition }) {
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
          event.layers.forEach(layer => {
            if (layer.feature) {
              toggledFeatures.push(layer.feature)
            } else if (layer.eachLayer) {
              layer.eachLayer(subLayer => {
                if (subLayer.feature) toggledFeatures.push(subLayer.feature)
              })
            }
          })

          if (toggledFeatures.length > 0) {
            setSelectedNeighbourhoods(toggledFeatures)
            if (event.latLngs && event.latLngs.length > 0) {
              setPopupPosition(event.latLngs[0])
            }
          }
        }

        map.on('lasso.finished', handleLassoFinished)
      })
    })

    return () => {
      isMounted = false
      if (map) {
        map.off('lasso.finished')
      }
    }
  }, [map, setSelectedNeighbourhoods, setPopupPosition])

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

export default function LeafletMap({ geojson, rankings, onRegionSelect, regionalProfileAverages }) {
  const [selectedNeighbourhoods, setSelectedNeighbourhoods] = useState([])
  const [popupPosition, setPopupPosition] = useState(null)
  const [lassoEnabled, setLassoEnabled] = useState(false)
  const [compareEnabled, setCompareEnabled] = useState(false)

  const featureClickedRef = useRef(false)
  const lassoEnabledRef = useRef(lassoEnabled)
  const compareEnabledRef = useRef(compareEnabled)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (onRegionSelect) {
      onRegionSelect(selectedNeighbourhoods.map(f => f.properties.DGUID));
    }
  }, [selectedNeighbourhoods, onRegionSelect]);
  useEffect(() => {
    lassoEnabledRef.current = lassoEnabled
    if (lassoEnabled) setCompareEnabled(false)
  }, [lassoEnabled])

  useEffect(() => {
    compareEnabledRef.current = compareEnabled
    if (compareEnabled) setLassoEnabled(false)
  }, [compareEnabled])

  const onEachFeature = useMemo(() => (feature, layer) => {
    if (feature.properties) {
      layer.on('click', (e) => {
        if (e.originalEvent) e.originalEvent.stopPropagation()
        featureClickedRef.current = true
        setTimeout(() => { featureClickedRef.current = false }, 50)

        if (lassoEnabledRef.current) return

        if (compareEnabledRef.current) {
          setSelectedNeighbourhoods(prev => {
            const isSelected = prev.some(f => f.properties.DGUID === feature.properties.DGUID)
            if (isSelected) {
              const newSelection = prev.filter(f => f.properties.DGUID !== feature.properties.DGUID)
              if (newSelection.length === 0) setPopupPosition(null)
              return newSelection
            }
            setPopupPosition(e.latlng)
            return [...prev, feature]
          })
          return
        }

        setPopupPosition(e.latlng)
        setSelectedNeighbourhoods([feature])
      })
    }
  }, [])

  const style = useMemo(() => (feature) => {
    const categoryNumber = rankings[feature.properties.DGUID]
    const category = categories.find(c => c.name === categoryNumber)
    return {
      fillColor: category.color,
      weight: 2,
      opacity: 1,
      color: category.color,
      fillOpacity: 0.2
    }
  }, [rankings])

  const handleRemoveFeature = (dguid) => {
    setSelectedNeighbourhoods(prev => {
      const newArray = prev.filter(f => f.properties.DGUID !== dguid)
      if (newArray.length === 0) setPopupPosition(null)
      return newArray
    })
  }

  if (!isMounted) {
    return <div className="w-full h-[60vh] md:h-full bg-gray-50 flex items-center justify-center text-gray-400">Loading map...</div>
  }

  return (
    <div className="w-full h-[60vh] md:h-full overflow-hidden relative">


      <MapContainer
        center={[43.45, -80.5]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geojson && (
          <GeoJSON
            data={geojson}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}

        <MapController
          selectedNeighbourhoods={selectedNeighbourhoods}
          setSelectedNeighbourhoods={setSelectedNeighbourhoods}
          setPopupPosition={setPopupPosition}
          rankings={rankings}
          featureClickedRef={featureClickedRef}
        />

        <LassoSelection
          lassoEnabled={lassoEnabled}
          setLassoEnabled={setLassoEnabled}
          setSelectedNeighbourhoods={setSelectedNeighbourhoods}
          setPopupPosition={setPopupPosition}
        />

        {selectedNeighbourhoods.length > 0 && popupPosition && (
          <Popup
            key={`popup-${compareEnabled}-${selectedNeighbourhoods.length}`}
            position={popupPosition}
            closeButton={false}
            maxWidth={800}
            minWidth={50}
          >
            <NeighbourhoodPopup
              features={selectedNeighbourhoods}
              onRemoveFeature={handleRemoveFeature}
              isCompareMode={compareEnabled}
              regionalProfileAverages={regionalProfileAverages}
            />
          </Popup>
        )}

        <Legend categories={categories} />
      </MapContainer>

      <div className="absolute top-4 left-14 flex flex-row gap-2" style={{ zIndex: 1000 }}>
        <button
          onClick={() => setLassoEnabled(!lassoEnabled)}
          title="Toggle Lasso"
          className={`p-2 flex items-center justify-center bg-white rounded shadow-md border-2 transition-colors ${lassoEnabled ? 'border-blue-500 text-blue-500 bg-blue-50' : 'border-transparent text-gray-700 hover:bg-gray-50'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 22a5 5 0 0 1-2-4" />
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        </button>
        <button
          onClick={() => setCompareEnabled(!compareEnabled)}
          title="Select multiple"
          className={`p-2 flex items-center justify-center bg-white rounded shadow-md border-2 transition-colors ${compareEnabled ? 'border-blue-500 text-blue-500 bg-blue-50' : 'border-transparent text-gray-700 hover:bg-gray-50'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Multi-select icon*/}
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          </svg>
        </button>
      </div>
    </div>
  )
}