import json
import os

project_path = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\POWATER CROPS..json'

with open(project_path, 'r', encoding='utf-8') as f:
    project = json.load(f)

# 1. Update resources
res_list = project.setdefault('resources', {}).setdefault('resources', [])
res_map = {r.get('name'): r for r in res_list}
assets = [
    ('House.png', 'assets/House.png'),
    ('Power.png', 'assets/Power.png'),
    ('Solar.png', 'assets/Solar.png'),
    ('Blue barrel.png', 'assets/Blue barrel.png'),
    ('Orange barrel.png', 'assets/Orange barrel.png'),
    ('AirFilter.png', 'assets/AirFilter.png'),
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

# 2. Layout & Objects
layout = project['layouts'][0]
objects = layout['objects']
existing_objs = {o['name']: o for o in objects}

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

buildings = [
    ('generator', 'Power.png', 140, 140),
    ('solar', 'Solar.png', 140, 140),
    ('water_pump', 'Blue barrel.png', 140, 140),
    ('waste_filter', 'Orange barrel.png', 140, 140),
    ('air_filter', 'AirFilter.png', 140, 140)
]

for bname, bimg, bw, bh in buildings:
    if bname not in existing_objs:
        objects.append(make_sprite_object(bname, bimg, bw, bh))

# Remove WirePainter and text objects from layout objects
objects = [obj for obj in objects if obj.get('name') not in ['WirePainter', 'Water', 'Electricity']]
layout['objects'] = objects
layout['instances'] = []

for obj in objects:
    if obj.get('name') == 'house':
        obj['adaptCollisionMaskAutomatically'] = True
        obj['animations'] = [
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
                                'image': 'House.png',
                                'points': [
                                    {
                                        'name': 'Point',
                                        'x': 75.0,
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
                                    'x': 75.0,
                                    'y': 50.0
                                },
                                'customCollisionMask': []
                            }
                        ]
                    }
                ]
            }
        ]
        var_names = [v.get('name') for v in obj.get('variables', [])]
        if 'IsPowered' not in var_names:
            obj.setdefault('variables', []).append({
                'name': 'IsPowered',
                'type': 'boolean',
                'value': False
            })

# 3. Concatenate modular scripts
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

# 4. Clean Events (Single master JS execution event)
layout['events'] = [
    {
        'type': 'BuiltinCommonInstructions::Standard',
        'conditions': [
            {
                'type': {'value': 'SceneJustBegins'},
                'parameters': ['']
            }
        ],
        'actions': []
    },
    {
        # THE BACKUP SCRIPT (Disabled)
        'disabled': True,
        'type': 'BuiltinCommonInstructions::JsCode',
        'inlineCode': [
            "// [BACKUP SCRIPT - Original User Script]",
            "// runtimeScene.setBackgroundColor(100,100,240);",
            ""
        ],
        'parameterObjects': '',
        'useStrict': True,
        'eventsSheetExpanded': False
    },
    {
        # THE MAIN SCRIPT
        'disabled': False,
        'type': 'BuiltinCommonInstructions::JsCode',
        'inlineCode': main_code_lines,
        'parameterObjects': '',
        'useStrict': True,
        'eventsSheetExpanded': True
    }
]

# Write to project file
with open(project_path, 'w', encoding='utf-8') as f:
    json.dump(project, f, indent=2, ensure_ascii=False)

print('SUCCESS: POWATER CORP complete project synced and compiled!')
