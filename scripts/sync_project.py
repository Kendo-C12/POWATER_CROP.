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
    ('Blue barrel.png', 'assets/Blue barrel.png'),
    ('Orange barrel.png', 'assets/Orange barrel.png'),
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

# Remove WirePainter and text objects from layout objects
objects = [obj for obj in objects if obj.get('name') not in ['WirePainter', 'Water', 'Electricity']]
layout['objects'] = objects

# Remove instances
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

# 3. Read main script from wiring.js
with open(r'c:\Users\user\Desktop\Folder\GDEV_POWATER\scripts\wiring.js', 'r', encoding='utf-8') as f:
    wiring_code = f.read()

main_js_source = """// [MAIN SCRIPT - Real Main Active Script]
// POWATER CORP - Interactive Wiring & House Network

""" + wiring_code + """

if (!runtimeScene._powaterWiringInstance) {
  runtimeScene._powaterWiringInstance = new POWATER.WiringManager();
}
runtimeScene._powaterWiringInstance.update(runtimeScene);
"""

main_code_lines = main_js_source.split('\n')

# 4. Clean Events (No text creation, no text updating)
layout['events'] = [
    {
        'type': 'BuiltinCommonInstructions::Standard',
        'conditions': [
            {
                'type': {'value': 'SceneJustBegins'},
                'parameters': ['']
            }
        ],
        'actions': [
            {'type': {'value': 'ResetTimer'}, 'parameters': ['', '"spawn"']},
            {'type': {'value': 'ResetTimer'}, 'parameters': ['', '"1sec"']},
            # Spawn 3 houses cleanly
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', '240', '260', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', '880', '220', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', '560', '480', '']}
        ]
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
        # THE DUPLICATE SCRIPT (The Real Main File being edited)
        'disabled': False,
        'type': 'BuiltinCommonInstructions::JsCode',
        'inlineCode': main_code_lines,
        'parameterObjects': '',
        'useStrict': True,
        'eventsSheetExpanded': True
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
            {'type': {'value': 'SetNumberObjectVariable'}, 'parameters': ['house', 'Water', '+', '1']},
            {'type': {'value': 'SetNumberObjectVariable'}, 'parameters': ['house', 'Electricity', '+', '1']},
            {'type': {'value': 'SetNumberVariable'}, 'parameters': ['Pollution_total', '+', 'Polltution_per_second']},
            {'type': {'value': 'ResetTimer'}, 'parameters': ['', '"1sec"']}
        ]
    },
    {
        'type': 'BuiltinCommonInstructions::Standard',
        'conditions': [
            {
                'type': {'value': 'CompareTimer'},
                'parameters': ['', '"spawn"', '>', '25']
            }
        ],
        'actions': [
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', 'RandomInRange(80,1100)', 'RandomInRange(80,580)', '']},
            {'type': {'value': 'ResetTimer'}, 'parameters': ['', '"spawn"']}
        ]
    }
]

# Write to project file
with open(project_path, 'w', encoding='utf-8') as f:
    json.dump(project, f, indent=2, ensure_ascii=False)

print('SUCCESS: Project updated cleanly without floating text!')
