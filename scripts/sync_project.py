import json
import os
import copy

project_path = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\POWATER CROPS..json'

with open(project_path, 'r', encoding='utf-8') as f:
    project = json.load(f)

# 1. Update Project Properties (Strictly lock to 1280x720 resolution - No white bars or viewport expansion)
props = project.setdefault('properties', {})
props['adaptGameResolutionAtRuntime'] = False
props['sizeOnStartupMode'] = ""
props['windowWidth'] = 1280
props['windowHeight'] = 720

# 2. Update Resources
res_list = project.setdefault('resources', {}).setdefault('resources', [])
res_map = {r.get('name'): r for r in res_list}
assets = [
    ('House.png', 'assets/House.png'),
    ('Power.png', 'assets/Power.png'),
    ('Solar.png', 'assets/Solar.png'),
    ('Blue barrel.png', 'assets/Blue barrel.png'),
    ('Orange barrel.png', 'assets/Orange barrel.png'),
    ('AirFilter.png', 'assets/AirFilter.png'),
    ('river.png', 'assets/river.png'),
    ('river_venice.png', 'assets/river_venice.png'),
    ('river_tokyo.png', 'assets/river_tokyo.png'),
    ('toolbar_dock.png', 'assets/toolbar_dock.png'),
    ('hud_bar.png', 'assets/hud_bar.png'),
    ('grid_bg.png', 'assets/grid_bg.png'),
    ('badge_power.png', 'assets/badge_power.png'),
    ('badge_water.png', 'assets/badge_water.png'),
    ('badge_drain.png', 'assets/badge_drain.png'),
    ('btn_power.png', 'assets/btn_power.png'),
    ('btn_water.png', 'assets/btn_water.png'),
    ('btn_drain.png', 'assets/btn_drain.png'),
    ('btn_solar.png', 'assets/btn_solar.png'),
    ('btn_filter.png', 'assets/btn_filter.png'),
    ('btn_pause.png', 'assets/btn_pause.png'),
    ('btn_speed.png', 'assets/btn_speed.png'),
    ('btn_upgrade.png', 'assets/btn_upgrade.png'),
    ('btn_sdgs.png', 'assets/btn_sdgs.png'),
    ('btn_guide.png', 'assets/btn_guide.png')
]

for name, file_path in assets:
    if name not in res_map:
        res_list.append({
            'file': file_path,
            'kind': 'image',
            'metadata': '',
            'name': name,
            'smoothed': True,
            'userAdded': True
        })

# Clean out any old missing resource references
project['resources']['resources'] = [r for r in project['resources']['resources'] if 'Red house' not in r['name']]
res_items = [{'name': r['name']} for r in project['resources']['resources']]
project['usedResources'] = res_items

# 3. Concatenate Modular Scripts for In-Game Simulation Engine
scripts_order = [
    'config.js',
    'audio.js',
    'map.js',
    'entities.js',
    'engine.js',
    'ui.js',
    'main.js'
]

combined_source = """// POWATER CORP. - Singleplayer Infrastructure & Environmental Strategy Game
// Auto-compiled bundle of modular scripts
"""

for sname in scripts_order:
    spath = os.path.join(r'c:\Users\user\Desktop\Folder\GDEV_POWATER\scripts', sname)
    with open(spath, 'r', encoding='utf-8') as sf:
        combined_source += f"\n\n// ===== MODULE: {sname} =====\n"
        combined_source += sf.read()

combined_source += """

// Main Game Controller invocation
if (typeof POWATER !== 'undefined' && POWATER.GameController) {
  if (!globalThis._powaterControllerInstance) {
    globalThis._powaterControllerInstance = new POWATER.GameController();
  }
  globalThis._powaterControllerInstance.update(runtimeScene);
}
"""

main_code_lines = combined_source.split('\n')

# 4. Standard Event Sheet (Structured Visual Events + POWATER Engine Bridge)
def create_event_sheet(level_title):
    return [
        {
            'type': 'BuiltinCommonInstructions::Group',
            'name': f'🎬 1. Scene Initialization & Setup ({level_title})',
            'backgroundColor': '#2980b9',
            'color': {'r': 41, 'g': 128, 'b': 185},
            'folded': False,
            'events': [
                {
                    'type': 'BuiltinCommonInstructions::Comment',
                    'color': {'b': 230, 'g': 200, 'r': 180, 'textB': 0, 'textG': 0, 'textR': 0},
                    'comment': f'Runs once when {level_title} scene begins. Resets timers and city variables.'
                },
                {
                    'type': 'BuiltinCommonInstructions::Standard',
                    'conditions': [
                        {
                            'type': {'value': 'SceneJustBegins'},
                            'parameters': ['']
                        }
                    ],
                    'actions': [
                        {
                            'type': {'value': 'ResetTimer'},
                            'parameters': ['', '"spawn"']
                        },
                        {
                            'type': {'value': 'ResetTimer'},
                            'parameters': ['', '"1sec"']
                        },
                        {
                            'type': {'value': 'SetNumberVariable'},
                            'parameters': ['Pollution_total', '=', '0']
                        },
                        {
                            'type': {'value': 'SetNumberVariable'},
                            'parameters': ['Polltution_per_second', '=', '1']
                        }
                    ]
                }
            ]
        },
        {
            'type': 'BuiltinCommonInstructions::Group',
            'name': '⏱️ 2. Timers & Resource Loop (Visual GDevelop Events)',
            'backgroundColor': '#27ae60',
            'color': {'r': 39, 'g': 174, 'b': 96},
            'folded': False,
            'events': [
                {
                    'type': 'BuiltinCommonInstructions::Comment',
                    'color': {'b': 200, 'g': 240, 'r': 190, 'textB': 0, 'textG': 0, 'textR': 0},
                    'comment': 'Every 1 second: increments citizen resource counters and tracks pollution.'
                },
                {
                    'type': 'BuiltinCommonInstructions::Standard',
                    'conditions': [
                        {
                            'type': {'value': 'CompareTimer'},
                            'parameters': ['', '"1sec"', '>=', '1']
                        }
                    ],
                    'actions': [
                        {
                            'type': {'value': 'SetNumberObjectVariable'},
                            'parameters': ['house', 'Water', '+', '1']
                        },
                        {
                            'type': {'value': 'SetNumberObjectVariable'},
                            'parameters': ['house', 'Electricity', '+', '1']
                        },
                        {
                            'type': {'value': 'SetNumberVariable'},
                            'parameters': ['Pollution_total', '+', 'Polltution_per_second']
                        },
                        {
                            'type': {'value': 'ResetTimer'},
                            'parameters': ['', '"1sec"']
                        }
                    ]
                }
            ]
        },
        {
            'type': 'BuiltinCommonInstructions::Group',
            'name': '🏡 3. Procedural Citizen Spawner (Visual GDevelop Events)',
            'backgroundColor': '#d35400',
            'color': {'r': 211, 'g': 84, 'b': 0},
            'folded': False,
            'events': [
                {
                    'type': 'BuiltinCommonInstructions::Comment',
                    'color': {'b': 180, 'g': 210, 'r': 255, 'textB': 0, 'textG': 0, 'textR': 0},
                    'comment': 'Spawns new citizen houses at intervals.'
                },
                {
                    'type': 'BuiltinCommonInstructions::Standard',
                    'conditions': [
                        {
                            'type': {'value': 'CompareTimer'},
                            'parameters': ['', '"spawn"', '>', '28']
                        }
                    ],
                    'actions': [
                        {
                            'type': {'value': 'Create'},
                            'parameters': ['', 'house', 'RandomInRange(100,1080)', 'RandomInRange(100,560)', '']
                        },
                        {
                            'type': {'value': 'ResetTimer'},
                            'parameters': ['', '"spawn"']
                        }
                    ]
                }
            ]
        },
        {
            'type': 'BuiltinCommonInstructions::Group',
            'name': '⚡ 4. POWATER CORP. Core Simulation Engine (Wiring, River & Utilities)',
            'backgroundColor': '#8e44ad',
            'color': {'r': 142, 'g': 68, 'b': 173},
            'folded': False,
            'events': [
                {
                    'type': 'BuiltinCommonInstructions::Comment',
                    'color': {'b': 255, 'g': 215, 'r': 230, 'textB': 0, 'textG': 0, 'textR': 0},
                    'comment': 'POWATER CORP. Engine Bridge: Coordinates interactive multi-utility wiring (Power, Clean Water, Wastewater), dual-layer PixiJS rendering, river flow simulation, sound effects, and HUD overlay.'
                },
                {
                    'disabled': False,
                    'type': 'BuiltinCommonInstructions::JsCode',
                    'inlineCode': main_code_lines,
                    'parameterObjects': '',
                    'useStrict': True,
                    'eventsSheetExpanded': False
                }
            ]
        }
    ]

# 5. Object Generator Helpers
def make_sprite_object(name, image_file, w, h):
    return {
        'adaptCollisionMaskAutomatically': True,
        'assetStoreId': '',
        'name': name,
        'persistentUuid': f'uuid-{name}',
        'type': 'Sprite',
        'updateIfNotVisible': False,
        'variables': [],
        'effects': [],
        'behaviors': [],
        'animations': [
            {
                'name': '',
                'useMultipleDirections': False,
                'directions': [
                    {
                        'looping': True,
                        'timeBetweenFrames': 0.025,
                        'sprites': [
                            {
                                'hasCustomCollisionMask': False,
                                'image': image_file,
                                'points': [
                                    {
                                        'name': 'Point',
                                        'x': w / 2.0,
                                        'y': -10.0
                                    }
                                ],
                                'originPoint': {
                                    'name': 'origine',
                                    'x': 0.0,
                                    'y': 0.0
                                },
                                'centerPoint': {
                                    'automatic': True,
                                    'name': 'centre',
                                    'x': w / 2.0,
                                    'y': h / 2.0
                                },
                                'customCollisionMask': []
                            }
                        ]
                    }
                ]
            }
        ]
    }

def make_house_object():
    obj = make_sprite_object('house', 'House.png', 84, 56)
    obj['variables'] = [
        {'name': 'IsPowered', 'type': 'boolean', 'value': False},
        {'name': 'Water', 'type': 'number', 'value': 0},
        {'name': 'Electricity', 'type': 'number', 'value': 0}
    ]
    return obj

def build_layout_objects(river_image='river.png', river_w=280, river_h=720):
    objs = [make_house_object()]
    base_buildings = [
        ('generator', 'Power.png', 140, 140),
        ('solar', 'Solar.png', 140, 140),
        ('water_pump', 'Blue barrel.png', 140, 140),
        ('waste_filter', 'Orange barrel.png', 140, 140),
        ('air_filter', 'AirFilter.png', 140, 140),
        ('river', river_image, river_w, river_h),
        ('btn_power', 'btn_power.png', 128, 96),
        ('btn_water', 'btn_water.png', 128, 96),
        ('btn_drain', 'btn_drain.png', 128, 96),
        ('btn_solar', 'btn_solar.png', 128, 96),
        ('btn_filter', 'btn_filter.png', 128, 96),
        ('btn_pause', 'btn_pause.png', 128, 96),
        ('btn_speed', 'btn_speed.png', 128, 96),
        ('btn_upgrade', 'btn_upgrade.png', 128, 96),
        ('btn_sdgs', 'btn_sdgs.png', 128, 96),
        ('btn_guide', 'btn_guide.png', 128, 96),
        ('grid_bg', 'grid_bg.png', 1280, 720),
        ('hud_bar', 'hud_bar.png', 1280, 44),
        ('toolbar_dock', 'toolbar_dock.png', 740, 56),
        ('badge_power', 'badge_power.png', 48, 48),
        ('badge_water', 'badge_water.png', 48, 48),
        ('badge_drain', 'badge_drain.png', 48, 48)
    ]
    for bname, bimg, bw, bh in base_buildings:
        objs.append(make_sprite_object(bname, bimg, bw, bh))
    return objs

def make_base_instances():
    """Generates standard background, top HUD, toolbar dock tray, and 10 bottom button PNGs."""
    return [
        # 0. Urban Grid Blueprint Background (Exact 1280x720 canvas frame)
        {
            'angle': 0, 'customSize': True, 'height': 720, 'layer': '', 'locked': False,
            'name': 'grid_bg', 'persistentUuid': 'inst-grid-bg', 'width': 1280, 'x': 0, 'y': 0, 'zOrder': 0,
            'numberProperties': [], 'stringProperties': [], 'initialVariables': []
        },
        # Top HUD Bar Banner (Exact 1280x44)
        {
            'angle': 0, 'customSize': True, 'height': 44, 'layer': '', 'locked': False,
            'name': 'hud_bar', 'persistentUuid': 'inst-hud-bar', 'width': 1280, 'x': 0, 'y': 0, 'zOrder': 8,
            'numberProperties': [], 'stringProperties': [], 'initialVariables': []
        },
        # Sleek Rounded Toolbar Dock Tray behind buttons (740x56)
        {
            'angle': 0, 'customSize': True, 'height': 56, 'layer': '', 'locked': False,
            'name': 'toolbar_dock', 'persistentUuid': 'inst-toolbar-dock', 'width': 740, 'x': 270, 'y': 654, 'zOrder': 8,
            'numberProperties': [], 'stringProperties': [], 'initialVariables': []
        },
        # 10 Toolbar Button PNG Sprites (Centrally aligned along bottom)
        { 'name': 'btn_power', 'x': 276, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-power', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_water', 'x': 346, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-water', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_drain', 'x': 416, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-drain', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_solar', 'x': 494, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-solar', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_filter', 'x': 564, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-filter', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_pause', 'x': 642, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-pause', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_speed', 'x': 712, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-speed', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_upgrade', 'x': 790, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-upgrade', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_sdgs', 'x': 860, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-sdgs', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
        { 'name': 'btn_guide', 'x': 930, 'y': 658, 'width': 64, 'height': 48, 'zOrder': 10, 'persistentUuid': 'inst-btn-guide', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
    ]

# 6. Build the 4 Dedicated Layout Screens
def create_layout(name, title, river_image, river_w, river_h, river_inst, level_buildings, level_houses):
    insts = make_base_instances()
    insts.append(river_inst)
    insts.extend(level_buildings)
    insts.extend(level_houses)

    return {
        'b': 255,
        'disableInputWhenNotFocused': True,
        'mangledName': name,
        'name': name,
        'r': 247,
        'renderer3DWorldScale': 100,
        'standardSortMethod': True,
        'stopSoundsOnStartup': False,
        'title': title,
        'v': 249,
        'uiSettings': {
            'grid': False,
            'gridType': 'rectangular',
            'gridWidth': 32,
            'gridHeight': 32,
            'gridDepth': 32,
            'gridOffsetX': 0,
            'gridOffsetY': 0,
            'gridOffsetZ': 0,
            'gridColor': 10401023,
            'gridAlpha': 0.8,
            'snap': False,
            'zoomFactor': 0.737,
            'windowMask': False,
            'selectedLayer': '',
            'gameEditorMode': 'instances-editor'
        },
        'objectsGroups': [],
        'variables': [],
        'instances': insts,
        'objects': build_layout_objects(river_image, river_w, river_h),
        'objectsFolderStructure': {'folderName': '__ROOT__'},
        'events': create_event_sheet(title),
        'layers': [
            {
                'ambientLightColorB': 255,
                'ambientLightColorG': 255,
                'ambientLightColorR': 255,
                'camera3DFarPlaneDistance': 10000,
                'camera3DFieldOfView': 45,
                'camera3DNearPlaneDistance': 1,
                'cameraType': '',
                'effects': [],
                'followBaseLayerCamera': False,
                'isDefault2DCamera': True,
                'isLightingLayer': False,
                'name': '',
                'renderingType': '',
                'visibility': True,
                'cameras': [{'bottom': 720, 'left': 0, 'right': 1280, 'top': 0}]
            }
        ],
        'behaviorsSharedData': [],
        'usedResources': res_items
    }

# 1. Main / Bangkok Screen
main_river = {
    'angle': 0, 'customSize': True, 'height': 720, 'layer': '', 'locked': False,
    'name': 'river', 'persistentUuid': 'inst-river-bkk', 'width': 280, 'x': 490, 'y': 0, 'zOrder': 1,
    'numberProperties': [], 'stringProperties': [], 'initialVariables': []
}
main_buildings = [
    { 'name': 'generator', 'x': 832, 'y': 242, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-bkk-gen', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'water_pump', 'x': 652, 'y': 242, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-bkk-pump', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'waste_filter', 'x': 712, 'y': 442, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-bkk-filter', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
main_houses = [
    { 'name': 'house', 'x': 818, 'y': 82, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-bkk-h1', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 878, 'y': 432, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-bkk-h2', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 308, 'y': 292, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-bkk-h3', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
layout_main = create_layout('Main', 'Bangkok, Thailand', 'river.png', 280, 720, main_river, main_buildings, main_houses)

# 2. Venice Screen (Venice Grand Canal, Solar clean power, pristine eco water)
venice_river = {
    'angle': 0, 'customSize': True, 'height': 720, 'layer': '', 'locked': False,
    'name': 'river', 'persistentUuid': 'inst-river-venice', 'width': 400, 'x': 420, 'y': 0, 'zOrder': 1,
    'numberProperties': [], 'stringProperties': [], 'initialVariables': []
}
venice_buildings = [
    { 'name': 'solar', 'x': 832, 'y': 220, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-venice-solar', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'water_pump', 'x': 590, 'y': 220, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-venice-pump', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'waste_filter', 'x': 440, 'y': 580, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-venice-filter', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
venice_houses = [
    { 'name': 'house', 'x': 880, 'y': 120, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-venice-h1', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 860, 'y': 460, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-venice-h2', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 280, 'y': 320, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-venice-h3', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
layout_venice = create_layout('Venice', 'Venice, Italy', 'river_venice.png', 400, 720, venice_river, venice_buildings, venice_houses)

# 3. Tokyo Screen (Tokyo Sumida River, Generator & Water pump, fast urban pace)
tokyo_river = {
    'angle': 0, 'customSize': True, 'height': 720, 'layer': '', 'locked': False,
    'name': 'river', 'persistentUuid': 'inst-river-tokyo', 'width': 240, 'x': 460, 'y': 0, 'zOrder': 1,
    'numberProperties': [], 'stringProperties': [], 'initialVariables': []
}
tokyo_buildings = [
    { 'name': 'generator', 'x': 780, 'y': 240, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-tokyo-gen', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'water_pump', 'x': 600, 'y': 240, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-tokyo-pump', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'waste_filter', 'x': 630, 'y': 480, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-tokyo-filter', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
tokyo_houses = [
    { 'name': 'house', 'x': 840, 'y': 100, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-tokyo-h1', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 860, 'y': 420, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-tokyo-h2', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 320, 'y': 280, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-tokyo-h3', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
layout_tokyo = create_layout('Tokyo', 'Tokyo, Japan', 'river_tokyo.png', 240, 720, tokyo_river, tokyo_buildings, tokyo_houses)

# 4. Endless Screen (Global Metropolis, Endless Sandbox Mode)
endless_river = {
    'angle': 0, 'customSize': True, 'height': 720, 'layer': '', 'locked': False,
    'name': 'river', 'persistentUuid': 'inst-river-endless', 'width': 280, 'x': 490, 'y': 0, 'zOrder': 1,
    'numberProperties': [], 'stringProperties': [], 'initialVariables': []
}
endless_buildings = [
    { 'name': 'generator', 'x': 800, 'y': 200, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-endless-gen', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'solar', 'x': 880, 'y': 200, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-endless-solar', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'water_pump', 'x': 640, 'y': 250, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-endless-pump', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'waste_filter', 'x': 680, 'y': 450, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-endless-filter', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'air_filter', 'x': 840, 'y': 320, 'width': 56, 'height': 56, 'zOrder': 4, 'persistentUuid': 'inst-endless-air', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
endless_houses = [
    { 'name': 'house', 'x': 880, 'y': 100, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-endless-h1', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 860, 'y': 450, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-endless-h2', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 280, 'y': 250, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-endless-h3', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] },
    { 'name': 'house', 'x': 300, 'y': 420, 'width': 84, 'height': 56, 'zOrder': 3, 'persistentUuid': 'inst-endless-h4', 'angle': 0, 'customSize': True, 'layer': '', 'locked': False, 'numberProperties': [], 'stringProperties': [], 'initialVariables': [] }
]
layout_endless = create_layout('Endless', 'Global Metropolis (Endless)', 'river.png', 280, 720, endless_river, endless_buildings, endless_houses)

# Set all 4 layouts in project
project['layouts'] = [layout_main, layout_venice, layout_tokyo, layout_endless]

# Write back to POWATER CROPS..json
with open(project_path, 'w', encoding='utf-8') as f:
    json.dump(project, f, indent=2, ensure_ascii=False)

print('SUCCESS: POWATER CROPS complete multi-scene project synced and compiled!')
print(f'Total Layouts: {len(project["layouts"])} -> {[l["name"] for l in project["layouts"]]}')
