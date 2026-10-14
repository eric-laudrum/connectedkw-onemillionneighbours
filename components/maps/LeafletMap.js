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

function MapController({ selectedNeighbourhoods, setSelectedNeighbourhoods, setPopupPosition, rankings }) {
  const map = useMap()

  useMapEvents({
    click() {
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
          setLassoEnabled(false)
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
  }, [map, setSelectedNeighbourhoods, setPopupPosition, setLassoEnabled])

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

export default function LeafletMap({ geojson, rankings }) {
  const [selectedNeighbourhoods, setSelectedNeighbourhoods] = useState([])
  const [popupPosition, setPopupPosition] = useState(null)
  const [lassoEnabled, setLassoEnabled] = useState(false)

  const onEachFeature = useMemo(() => (feature, layer) => {
    if (feature.properties) {
      layer.on('click', (e) => {
        if (e.originalEvent) e.originalEvent.stopPropagation()
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
        />

        <LassoSelection
          lassoEnabled={lassoEnabled}
          setLassoEnabled={setLassoEnabled}
          setSelectedNeighbourhoods={setSelectedNeighbourhoods}
          setPopupPosition={setPopupPosition}
        />

        {selectedNeighbourhoods.length > 0 && popupPosition && (
          <Popup position={popupPosition} closeButton={false}>
            <NeighbourhoodPopup
              features={selectedNeighbourhoods}
              onRemoveFeature={handleRemoveFeature}
            />
          </Popup>
        )}

        <Legend categories={categories} />
      </MapContainer>

      <button
        onClick={() => setLassoEnabled(!lassoEnabled)}
        className={`absolute top-3 right-35 z-[1000] px-3 py-2 bg-white rounded shadow-md font-bold text-sm border-2 transition-colors ${lassoEnabled ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-700 hover:bg-gray-50'}`}
      >
        {lassoEnabled ? 'Lasso Active' : 'Use Lasso'}
      </button>
    </div>
  )
}