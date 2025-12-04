// GeoJSON boundaries for Swiss Romande regions (simplified polygons)
export interface RegionFeature {
  type: 'Feature';
  properties: {
    name: string;
    aliases: string[];
    color: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface RegionsGeoJSON {
  type: 'FeatureCollection';
  features: RegionFeature[];
}

// Simplified polygon boundaries for Swiss Romande cantons and regions
export const swissRegionsBoundaries: RegionsGeoJSON = {
  type: 'FeatureCollection',
  features: [
    // Canton de Genève
    {
      type: 'Feature',
      properties: {
        name: 'Genève',
        aliases: ['geneve', 'geneva', 'canton de genève', 'ge'],
        color: '#e74c3c'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [5.956, 46.372], [6.012, 46.389], [6.078, 46.402], [6.143, 46.389],
          [6.189, 46.356], [6.234, 46.312], [6.256, 46.256], [6.234, 46.189],
          [6.189, 46.145], [6.123, 46.134], [6.056, 46.145], [5.989, 46.178],
          [5.945, 46.223], [5.923, 46.278], [5.934, 46.334], [5.956, 46.372]
        ]]
      }
    },
    // Canton de Vaud
    {
      type: 'Feature',
      properties: {
        name: 'Vaud',
        aliases: ['canton de vaud', 'vd'],
        color: '#27ae60'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.123, 46.867], [6.234, 46.889], [6.389, 46.901], [6.534, 46.889],
          [6.678, 46.856], [6.823, 46.801], [6.934, 46.734], [7.012, 46.656],
          [7.045, 46.567], [7.023, 46.489], [6.956, 46.423], [6.867, 46.378],
          [6.756, 46.356], [6.623, 46.356], [6.489, 46.378], [6.356, 46.412],
          [6.234, 46.456], [6.145, 46.512], [6.078, 46.578], [6.034, 46.656],
          [6.023, 46.734], [6.045, 46.801], [6.123, 46.867]
        ]]
      }
    },
    // Canton du Valais
    {
      type: 'Feature',
      properties: {
        name: 'Valais',
        aliases: ['wallis', 'canton du valais', 'vs'],
        color: '#e67e22'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.778, 46.489], [6.923, 46.467], [7.123, 46.445], [7.345, 46.423],
          [7.567, 46.389], [7.789, 46.345], [8.012, 46.289], [8.156, 46.234],
          [8.234, 46.167], [8.212, 46.089], [8.123, 46.023], [7.989, 45.978],
          [7.823, 45.956], [7.634, 45.967], [7.445, 46.001], [7.256, 46.045],
          [7.089, 46.101], [6.934, 46.167], [6.823, 46.245], [6.756, 46.334],
          [6.734, 46.412], [6.778, 46.489]
        ]]
      }
    },
    // Canton de Fribourg
    {
      type: 'Feature',
      properties: {
        name: 'Fribourg',
        aliases: ['freiburg', 'canton de fribourg', 'fr'],
        color: '#9b59b6'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.834, 46.912], [6.956, 46.934], [7.089, 46.945], [7.212, 46.934],
          [7.312, 46.901], [7.389, 46.845], [7.423, 46.778], [7.412, 46.701],
          [7.356, 46.634], [7.267, 46.589], [7.156, 46.567], [7.034, 46.567],
          [6.923, 46.589], [6.834, 46.634], [6.778, 46.701], [6.756, 46.778],
          [6.778, 46.856], [6.834, 46.912]
        ]]
      }
    },
    // Canton de Neuchâtel
    {
      type: 'Feature',
      properties: {
        name: 'Neuchâtel',
        aliases: ['neuchatel', 'canton de neuchâtel', 'ne'],
        color: '#3498db'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.623, 47.089], [6.734, 47.112], [6.856, 47.123], [6.967, 47.112],
          [7.056, 47.078], [7.112, 47.023], [7.134, 46.956], [7.112, 46.889],
          [7.056, 46.834], [6.967, 46.801], [6.856, 46.789], [6.745, 46.801],
          [6.656, 46.845], [6.601, 46.901], [6.578, 46.967], [6.589, 47.034],
          [6.623, 47.089]
        ]]
      }
    },
    // Canton du Jura
    {
      type: 'Feature',
      properties: {
        name: 'Jura',
        aliases: ['canton du jura', 'ju'],
        color: '#1abc9c'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.934, 47.389], [7.056, 47.412], [7.189, 47.423], [7.312, 47.412],
          [7.412, 47.378], [7.478, 47.323], [7.501, 47.256], [7.478, 47.189],
          [7.412, 47.134], [7.312, 47.101], [7.189, 47.089], [7.067, 47.101],
          [6.967, 47.145], [6.901, 47.201], [6.867, 47.267], [6.878, 47.334],
          [6.934, 47.389]
        ]]
      }
    },
    // Lausanne et région
    {
      type: 'Feature',
      properties: {
        name: 'Lausanne et région',
        aliases: ['lausanne', 'district de lausanne', 'lausanne region'],
        color: '#2ecc71'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.534, 46.567], [6.589, 46.589], [6.656, 46.601], [6.723, 46.589],
          [6.778, 46.556], [6.812, 46.512], [6.823, 46.456], [6.801, 46.401],
          [6.745, 46.367], [6.678, 46.356], [6.601, 46.367], [6.534, 46.401],
          [6.489, 46.445], [6.467, 46.501], [6.489, 46.545], [6.534, 46.567]
        ]]
      }
    },
    // Nyon
    {
      type: 'Feature',
      properties: {
        name: 'Nyon',
        aliases: ['district de nyon', 'nyon region'],
        color: '#16a085'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.123, 46.456], [6.189, 46.478], [6.267, 46.489], [6.345, 46.478],
          [6.412, 46.445], [6.456, 46.401], [6.467, 46.345], [6.445, 46.289],
          [6.389, 46.245], [6.312, 46.223], [6.223, 46.234], [6.145, 46.267],
          [6.089, 46.312], [6.067, 46.367], [6.078, 46.423], [6.123, 46.456]
        ]]
      }
    },
    // Morges
    {
      type: 'Feature',
      properties: {
        name: 'Morges',
        aliases: ['district de morges', 'morges region'],
        color: '#27ae60'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.389, 46.567], [6.445, 46.589], [6.512, 46.601], [6.578, 46.589],
          [6.634, 46.556], [6.667, 46.512], [6.678, 46.456], [6.656, 46.401],
          [6.601, 46.367], [6.534, 46.356], [6.456, 46.367], [6.389, 46.401],
          [6.345, 46.445], [6.323, 46.501], [6.345, 46.545], [6.389, 46.567]
        ]]
      }
    },
    // La Côte
    {
      type: 'Feature',
      properties: {
        name: 'La Côte',
        aliases: ['la cote', 'district de la côte'],
        color: '#2980b9'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.178, 46.534], [6.245, 46.556], [6.323, 46.567], [6.401, 46.556],
          [6.467, 46.523], [6.512, 46.478], [6.523, 46.423], [6.501, 46.367],
          [6.445, 46.323], [6.367, 46.301], [6.278, 46.312], [6.201, 46.345],
          [6.145, 46.389], [6.123, 46.445], [6.134, 46.501], [6.178, 46.534]
        ]]
      }
    },
    // Riviera
    {
      type: 'Feature',
      properties: {
        name: 'Riviera',
        aliases: ['riviera-pays-d\'enhaut', 'district de la riviera'],
        color: '#8e44ad'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.834, 46.512], [6.901, 46.534], [6.978, 46.545], [7.056, 46.534],
          [7.123, 46.501], [7.167, 46.456], [7.178, 46.401], [7.156, 46.345],
          [7.101, 46.301], [7.023, 46.278], [6.934, 46.289], [6.856, 46.323],
          [6.801, 46.367], [6.778, 46.423], [6.789, 46.478], [6.834, 46.512]
        ]]
      }
    },
    // Lavaux
    {
      type: 'Feature',
      properties: {
        name: 'Lavaux',
        aliases: ['lavaux-oron', 'district de lavaux'],
        color: '#d35400'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.678, 46.534], [6.734, 46.556], [6.801, 46.567], [6.867, 46.556],
          [6.923, 46.523], [6.956, 46.478], [6.967, 46.423], [6.945, 46.367],
          [6.889, 46.334], [6.812, 46.323], [6.734, 46.334], [6.667, 46.367],
          [6.623, 46.412], [6.612, 46.467], [6.634, 46.512], [6.678, 46.534]
        ]]
      }
    },
    // Montreux
    {
      type: 'Feature',
      properties: {
        name: 'Montreux',
        aliases: ['montreux-vevey', 'vevey'],
        color: '#c0392b'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.856, 46.478], [6.912, 46.501], [6.978, 46.512], [7.045, 46.501],
          [7.101, 46.467], [7.134, 46.423], [7.145, 46.367], [7.123, 46.312],
          [7.067, 46.278], [6.989, 46.267], [6.901, 46.278], [6.834, 46.312],
          [6.789, 46.356], [6.778, 46.412], [6.801, 46.456], [6.856, 46.478]
        ]]
      }
    },
    // Yverdon
    {
      type: 'Feature',
      properties: {
        name: 'Yverdon',
        aliases: ['yverdon-les-bains', 'district jura-nord vaudois'],
        color: '#f39c12'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.534, 46.812], [6.601, 46.834], [6.678, 46.845], [6.756, 46.834],
          [6.823, 46.801], [6.867, 46.756], [6.878, 46.701], [6.856, 46.645],
          [6.801, 46.601], [6.723, 46.578], [6.634, 46.589], [6.556, 46.623],
          [6.501, 46.667], [6.478, 46.723], [6.489, 46.778], [6.534, 46.812]
        ]]
      }
    },
    // Aigle
    {
      type: 'Feature',
      properties: {
        name: 'Aigle',
        aliases: ['district d\'aigle', 'chablais vaudois'],
        color: '#e91e63'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.912, 46.378], [6.978, 46.401], [7.056, 46.412], [7.134, 46.401],
          [7.201, 46.367], [7.245, 46.323], [7.256, 46.267], [7.234, 46.212],
          [7.178, 46.167], [7.101, 46.145], [7.012, 46.156], [6.934, 46.189],
          [6.878, 46.234], [6.856, 46.289], [6.867, 46.345], [6.912, 46.378]
        ]]
      }
    },
    // Sion
    {
      type: 'Feature',
      properties: {
        name: 'Sion',
        aliases: ['sitten', 'district de sion'],
        color: '#ff5722'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [7.289, 46.289], [7.356, 46.312], [7.434, 46.323], [7.512, 46.312],
          [7.578, 46.278], [7.623, 46.234], [7.634, 46.178], [7.612, 46.123],
          [7.556, 46.078], [7.478, 46.056], [7.389, 46.067], [7.312, 46.101],
          [7.256, 46.145], [7.234, 46.201], [7.245, 46.256], [7.289, 46.289]
        ]]
      }
    },
    // Martigny
    {
      type: 'Feature',
      properties: {
        name: 'Martigny',
        aliases: ['district de martigny'],
        color: '#795548'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.989, 46.178], [7.056, 46.201], [7.134, 46.212], [7.212, 46.201],
          [7.278, 46.167], [7.323, 46.123], [7.334, 46.067], [7.312, 46.012],
          [7.256, 45.967], [7.178, 45.945], [7.089, 45.956], [7.012, 45.989],
          [6.956, 46.034], [6.934, 46.089], [6.945, 46.145], [6.989, 46.178]
        ]]
      }
    },
    // Monthey
    {
      type: 'Feature',
      properties: {
        name: 'Monthey',
        aliases: ['district de monthey', 'chablais valaisan'],
        color: '#607d8b'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.878, 46.289], [6.945, 46.312], [7.023, 46.323], [7.101, 46.312],
          [7.167, 46.278], [7.212, 46.234], [7.223, 46.178], [7.201, 46.123],
          [7.145, 46.078], [7.067, 46.056], [6.978, 46.067], [6.901, 46.101],
          [6.845, 46.145], [6.823, 46.201], [6.834, 46.256], [6.878, 46.289]
        ]]
      }
    },
    // Sierre
    {
      type: 'Feature',
      properties: {
        name: 'Sierre',
        aliases: ['siders', 'district de sierre'],
        color: '#009688'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [7.489, 46.334], [7.556, 46.356], [7.634, 46.367], [7.712, 46.356],
          [7.778, 46.323], [7.823, 46.278], [7.834, 46.223], [7.812, 46.167],
          [7.756, 46.123], [7.678, 46.101], [7.589, 46.112], [7.512, 46.145],
          [7.456, 46.189], [7.434, 46.245], [7.445, 46.301], [7.489, 46.334]
        ]]
      }
    },
    // Brig
    {
      type: 'Feature',
      properties: {
        name: 'Brig',
        aliases: ['brigue', 'brig-glis', 'district de brigue'],
        color: '#673ab7'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [7.934, 46.356], [8.001, 46.378], [8.078, 46.389], [8.156, 46.378],
          [8.223, 46.345], [8.267, 46.301], [8.278, 46.245], [8.256, 46.189],
          [8.201, 46.145], [8.123, 46.123], [8.034, 46.134], [7.956, 46.167],
          [7.901, 46.212], [7.878, 46.267], [7.889, 46.323], [7.934, 46.356]
        ]]
      }
    },
    // Bulle
    {
      type: 'Feature',
      properties: {
        name: 'Bulle',
        aliases: ['district de la gruyère', 'gruyère'],
        color: '#ff9800'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.989, 46.678], [7.056, 46.701], [7.134, 46.712], [7.212, 46.701],
          [7.278, 46.667], [7.323, 46.623], [7.334, 46.567], [7.312, 46.512],
          [7.256, 46.467], [7.178, 46.445], [7.089, 46.456], [7.012, 46.489],
          [6.956, 46.534], [6.934, 46.589], [6.945, 46.645], [6.989, 46.678]
        ]]
      }
    },
    // La Chaux-de-Fonds
    {
      type: 'Feature',
      properties: {
        name: 'La Chaux-de-Fonds',
        aliases: ['chaux-de-fonds', 'district de la chaux-de-fonds'],
        color: '#00bcd4'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [6.778, 47.134], [6.845, 47.156], [6.923, 47.167], [7.001, 47.156],
          [7.067, 47.123], [7.112, 47.078], [7.123, 47.023], [7.101, 46.967],
          [7.045, 46.923], [6.967, 46.901], [6.878, 46.912], [6.801, 46.945],
          [6.745, 46.989], [6.723, 47.045], [6.734, 47.101], [6.778, 47.134]
        ]]
      }
    },
    // Delémont
    {
      type: 'Feature',
      properties: {
        name: 'Delémont',
        aliases: ['district de delémont'],
        color: '#4caf50'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [7.234, 47.389], [7.301, 47.412], [7.378, 47.423], [7.456, 47.412],
          [7.523, 47.378], [7.567, 47.334], [7.578, 47.278], [7.556, 47.223],
          [7.501, 47.178], [7.423, 47.156], [7.334, 47.167], [7.256, 47.201],
          [7.201, 47.245], [7.178, 47.301], [7.189, 47.356], [7.234, 47.389]
        ]]
      }
    }
  ]
};

// Function to find region boundary by name
export const findRegionBoundary = (regionName: string): RegionFeature | null => {
  const normalized = regionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const feature of swissRegionsBoundaries.features) {
    const featureNameNormalized = feature.properties.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (featureNameNormalized === normalized) {
      return feature;
    }
    
    for (const alias of feature.properties.aliases) {
      const aliasNormalized = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (aliasNormalized === normalized || normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized)) {
        return feature;
      }
    }
  }
  
  return null;
};

// Get all matching boundaries for an array of region names
export const getRegionBoundaries = (regionNames: string[]): RegionFeature[] => {
  const boundaries: RegionFeature[] = [];
  
  for (const name of regionNames) {
    const boundary = findRegionBoundary(name.trim());
    if (boundary) {
      boundaries.push(boundary);
    }
  }
  
  return boundaries;
};
