'use client'
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic'
import Legend from './LeafletMapLegend'
import NeighbourhoodPopup from './NeighbourhoodPopup'
import 'leaflet/dist/leaflet.css'
import { useMap } from 'react-leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

const categories = [
  {
    name: 1,
    color: '#00B88A',
    label: 'Most access'
  },
  {
    name: 2,
    color: '#DE54A0',
    label: 'Average access'
  },
  {
    name: 3,
    color: '#7378cc',
    label: 'Least access'
  }
]

export default function LeafletMap({ geojson, rankings }) {
  const [selectedNeighbourhoods, setSelectedNeighbourhoods] = useState([])
  const [map, setMap] = useState(null)
  const [popupPosition, setPopupPosition] = useState(null)

  const onEachFeature = useMemo(() => (feature, layer) => {
    if (feature.properties) {
      layer.on('click', (e) => {
        setPopupPosition(e.latlng)
        setSelectedNeighbourhoods([feature])
      })
    }
  }, [])

  const style = useMemo(() => (feature) => {
    // GeoJSON takes an immutable data object so in order to get a dynamic style based on rankings we need to refer to data outside of the feature object
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
    setSelectedNeighbourhoods(prev => prev.filter(f => f.properties.DGUID !== dguid))
  }

  return (
    <div className="w-full h-[60vh] md:h-full overflow-hidden">
      <MapContainer
        center={[43.45, -80.5]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        ref={setMap}
      >
        <TileLayer
          attribution= '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geojson && (
          <GeoJSON
            data={geojson}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}

        <LassoSelection
          setSelectedNeighbourhoods={setSelectedNeighbourhoods}
          setPopupPosition={setPopupPosition}
        />

        {selectedNeighbourhoods.length > 0 && popupPosition && (
          <Popup position={popupPosition}>
            <NeighbourhoodPopup
              features={selectedNeighbourhoods}
              onRemoveFeature={handleRemoveFeature}
            />
          </Popup>
        )}

        <Legend categories={categories} />
      </MapContainer>
    </div>
  )
}

function LassoSelection({ setSelectedNeighbourhoods, setPopupPosition }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    let isMounted = true
    let lassoControl

    map.dragging.disable()
    map.getContainer().style.cursor = 'pointer'

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule
      window.L = L

      import('leaflet-lasso').then(() => {
        if (!isMounted || !map) return

        lassoControl = L.lasso(map, { intersect: true })
        lassoControl.enable()

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

          setTimeout(() => {
            if (lassoControl) lassoControl.enable()
          }, 0)
        }

        map.on('lasso.finished', handleLassoFinished)
      })
    })

    return () => {
      isMounted = false
      if (map) {
        map.off('lasso.finished')
        map.dragging.enable()
        map.getContainer().style.cursor = ''
      }
    }
  }, [map, setSelectedNeighbourhoods, setPopupPosition])

  return null
}