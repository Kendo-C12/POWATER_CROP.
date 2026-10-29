import json
import os

project_path = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\POWATER CROPS..json'

with open(project_path, 'r', encoding='utf-8') as f:
    project = json.load(f)

# 1. Resources
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

# 2. Layout & Objects
layout = project['layouts'][0]
objects = layout['objects']
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

# 3. WirePainter object
if not any(obj.get('name') == 'WirePainter' for obj in objects):
    objects.append({
        'name': 'WirePainter',
        'type': 'PrimitiveDrawing::ShapePainterObject',
        'tags': '',
        'variables': [],
        'behaviors': [],
        'effects': [],
        'absoluteCoordinates': True,
        'antialiasing': 'high',
        'clearBetweenFrames': True,
        'fillColor': '255;255;255',
        'fillOpacity': 255,
        'outlineColor': '0;0;0',
        'outlineOpacity': 255,
        'outlineSize': 1
    })

# 4. WirePainter instance
instances = layout.setdefault('instances', [])
if not any(inst.get('name') == 'WirePainter' for inst in instances):
    instances.append({
        'angle': 0,
        'customSize': False,
        'height': 0,
        'layer': '',
        'locked': False,
        'name': 'WirePainter',
        'persistentUuid': 'b472093e-2b5e-4c07-b3c9-02685781a533',
        'width': 0,
        'x': 0,
        'y': 0,
        'zOrder': 5,
        'numberProperties': [],
        'stringProperties': [],
        'initialVariables': []
    })

# 5. Read JS code from wiring.js + spawner.js + main.js
scripts_dir = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\scripts'
with open(os.path.join(scripts_dir, 'wiring.js'), 'r', encoding='utf-8') as f:
    wiring_code = f.read()

with open(os.path.join(scripts_dir, 'spawner.js'), 'r', encoding='utf-8') as f:
    spawner_code = f.read()

with open(os.path.join(scripts_dir, 'main.js'), 'r', encoding='utf-8') as f:
    main_code = f.read()

full_js_code = wiring_code + '\n\n' + spawner_code + '\n\n' + main_code + '\n\nPOWATER.update(runtimeScene);'

# 6. Events
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
            # House 1
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', '240', '260', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Water', 'house.PointX("Point")', 'house.PointY("Point") - 20', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Electricity', 'house.PointX("Point")', 'house.PointY("Point")', '']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Water']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Electricity']},
            # House 2
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', '880', '220', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Water', 'house.PointX("Point")', 'house.PointY("Point") - 20', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Electricity', 'house.PointX("Point")', 'house.PointY("Point")', '']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Water']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Electricity']},
            # House 3
            {'type': {'value': 'Create'}, 'parameters': ['', 'house', '560', '480', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Water', 'house.PointX("Point")', 'house.PointY("Point") - 20', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Electricity', 'house.PointX("Point")', 'house.PointY("Point")', '']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Water']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Electricity']},
        ]
    },
    {
        'type': 'BuiltinCommonInstructions::JsCode',
        'inlineCode': full_js_code,
        'parameterObjects': '',
        'events': []
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
            {'type': {'value': 'TextContainerCapability::TextContainerBehavior::SetValue'}, 'parameters': ['Water', 'Text', '=', '"Water: " + house.Water']},
            {'type': {'value': 'TextContainerCapability::TextContainerBehavior::SetValue'}, 'parameters': ['Electricity', 'Text', '=', '"Elec: " + house.Electricity']},
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
            {'type': {'value': 'Create'}, 'parameters': ['', 'Water', 'house.PointX("Point")', 'house.PointY("Point") - 20', '']},
            {'type': {'value': 'Create'}, 'parameters': ['', 'Electricity', 'house.PointX("Point")', 'house.PointY("Point")', '']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Water']},
            {'type': {'value': 'LinkedObjects::LinkObjects'}, 'parameters': ['', 'house', 'Electricity']},
            {'type': {'value': 'ResetTimer'}, 'parameters': ['', '"spawn"']}
        ]
    }
]

with open(project_path, 'w', encoding='utf-8') as f:
    json.dump(project, f, indent=2, ensure_ascii=False)

print('SUCCESS: POWATER CROPS..json updated successfully!')
