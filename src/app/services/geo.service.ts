import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import ZoomToExtent from 'ol/control/ZoomToExtent';
import FullScreen from 'ol/control/FullScreen';
import Attribution from 'ol/control/Attribution';
import OsmSource from 'ol/source/OSM';
import StamenSource from 'ol/source/Stamen';
import VectorSource from 'ol/source/Vector';
import DragAndDrop from 'ol/interaction/DragAndDrop';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, transform } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions, PinchZoom } from 'ol/interaction';
import { Injectable } from '@angular/core';
import { Collection, Feature } from 'ol';
import { Geometry } from 'ol/geom';
import Point from 'ol/geom/Point';
import Geo from 'ol/geom/Geometry';
import { Vector } from '../models/vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import {Cluster, OSM} from 'ol/source.js';
import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Text,
} from 'ol/style.js';
import antenas from '../../../antenasMoviles250323, 20-33-39.json';


@Injectable()
export class GeoService {

  tileSources = [
    { name: 'None', source: null },
    { name: 'OSM', source: new OsmSource() },
    { name: 'Stamen', source: new StamenSource({ layer: 'toner' }) }
  ];

  selectedTileSource = this.tileSources[1];
  vectorSources: Vector[] = [];
  markers:any = [];

  private readonly map: Map;
  private readonly tileLayer: TileLayer<OsmSource>;
  private readonly vectorLayer: VectorLayer<any>;
  private readonly extent = [813079.7791264898, 5929220.284081122, 848966.9639063801, 5936863.986909639];

  constructor() {

    this.tileLayer = new TileLayer();
    this.vectorLayer = new VectorLayer<any>();

    var features = this.addMarker(antenas);
    const source = new VectorSource({
      features: features,
    });
    
    const clusterSource = new Cluster({
      distance: 10,
      minDistance: 10,
      source: source,
    });
    
    const styleCache:any = {};
    const clusters = new VectorLayer({
      source: clusterSource,
      style: function (feature) {
        const size = feature.get('features').length;
        let style = styleCache[size];
        if (!style) {
          style = new Style({
            image: new CircleStyle({
              radius: 10,
              stroke: new Stroke({
                color: '#fff',
              }),
              fill: new Fill({
                color: '#3399CC',
              }),
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({
                color: '#fff',
              }),
            }),
          });
          styleCache[size] = style;
        }
        return style;
      },
    });
    
    const raster = new TileLayer({
      source: new OSM(),
    });

    this.map = new Map({
      interactions: defaultInteractions().extend([
        new PinchZoom()
      ]),
      layers: [raster, clusters],
      view: new View({
        constrainResolution: true
      }),
      controls: defaultControls().extend([
        new Attribution(),
        new ZoomToExtent({ extent: this.extent }),
        new FullScreen()
      ])
    });

    const dragAndDropInteraction = new DragAndDrop({ formatConstructors: [GeoJSON] });

    dragAndDropInteraction.on('addfeatures', (event) => {

      const features = (event.features ?? []) as Feature<Geometry>[] | Collection<Feature<Geometry>> | undefined;
      const vectorSource = new VectorSource({ features });
      const vector: Vector = { name: event.file.name, source: vectorSource };

      this.vectorSources.push(vector);
      this.setVectorSource(vector);
    });

    this.map.addInteraction(dragAndDropInteraction);
  }

  //MÉTODOS
  addMarker(antenas:any) {
    const features = new Array(antenas.length);
    for (let i=0; i<antenas.length; i++){
      const coordinates=new Point(transform([Number(antenas[i].Gis_Longitud), Number(antenas[i].Gis_Latitud)], 'EPSG:4326','EPSG:3857'));
      features[i] = new Feature({
                  geometry:coordinates
              });
    }
    return features;   
  }
  /**
   * Updates zoom and center of the view.
   * @param zoom Zoom.
   * @param center Center in long/lat.
   */
  updateView(zoom = 2, center: [number, number] = [0, 0]): void {
    this.map.getView().setZoom(zoom);
    this.map.getView().setCenter(fromLonLat(center));
  }

  /**
   * Updates target and size of the map.
   * @param target HTML container.
   */
  updateSize(target = 'map'): void {
    this.map.setTarget(target);
    this.map.updateSize();
  }

  /**
   * Sets the source of the tile layer.
   * @param source Source.
   */
  setTileSource(source = this.selectedTileSource): void {
    this.selectedTileSource = source;
    this.tileLayer.setSource(source.source);
  }

  /**
   * Sets the source of the vector layer.
   * @param source Source.
   */
  setVectorSource(source: Vector): void {
    this.vectorLayer.setSource(source.source);
    this.map.getView().fit(this.vectorLayer.getSource().getExtent());
  }

}
