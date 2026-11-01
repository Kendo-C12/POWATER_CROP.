import os
import shutil

prev_dir = r'C:\Users\user\AppData\Local\Temp\GDTMP--1\preview'
assets_dir = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\assets'
scripts_dir = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\scripts'
code0_path = os.path.join(prev_dir, 'code0.js')

if not os.path.exists(prev_dir):
    print('Preview dir does not exist yet.')
    exit(0)

# 1. Copy all assets to preview root and assets/
for f in os.listdir(assets_dir):
    if f.endswith('.png'):
        src = os.path.join(assets_dir, f)
        shutil.copy2(src, os.path.join(prev_dir, f))
        prev_assets = os.path.join(prev_dir, 'assets')
        os.makedirs(prev_assets, exist_ok=True)
        shutil.copy2(src, os.path.join(prev_assets, f))
print('Assets copied to preview directory.')

# 1.1 Sync data.js with POWATER CROPS..json
project_json_path = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\POWATER CROPS..json'
if os.path.exists(project_json_path):
    import json
    with open(project_json_path, 'r', encoding='utf-8') as pf:
        proj_data = json.load(pf)
    # GDevelop's ResourceLoader requires usedResources list in projectData
    proj_data.setdefault('usedResources', [{'name': r['name']} for r in proj_data.get('resources', {}).get('resources', [])])
    data_js_path = os.path.join(prev_dir, 'data.js')
    with open(data_js_path, 'w', encoding='utf-8') as df:
        df.write('gdjs.projectData = ' + json.dumps(proj_data) + ';\n')
    print('data.js updated in preview directory.')

# 2. Bundle all scripts in proper dependency order
scripts_order = ['config.js', 'audio.js', 'map.js', 'entities.js', 'engine.js', 'ui.js', 'main.js']
bundle = ''
for s in scripts_order:
    with open(os.path.join(scripts_dir, s), 'r', encoding='utf-8') as sf:
        bundle += f'\n// === MODULE: {s} ===\n' + sf.read()

bundle += '''

// Main Game Controller invocation
if (typeof POWATER !== 'undefined' && POWATER.GameController) {
  if (!globalThis._powaterControllerInstance) {
    globalThis._powaterControllerInstance = new POWATER.GameController();
  }
  globalThis._powaterControllerInstance.update(runtimeScene);
}
'''

# 3. Detect userFunc name from code0.js if it exists, default to userFunc0x82b728
user_func_name = 'userFunc0x82b728'
if os.path.exists(code0_path):
    with open(code0_path, 'r', encoding='utf-8') as f:
        existing = f.read()
    import re
    m = re.search(r'gdjs\.MainCode\.(userFunc0x[a-f0-9]+)\(runtimeScene\);', existing)
    if m:
        user_func_name = m.group(1)

clean_code0 = f'''gdjs.MainCode = {{}};
gdjs.MainCode.localVariables = [];
gdjs.MainCode.idToCallbackMap = new Map();
gdjs.MainCode.GDhouseObjects1 = [];
gdjs.MainCode.GDhouseObjects2 = [];
gdjs.MainCode.GDgeneratorObjects1 = [];
gdjs.MainCode.GDgeneratorObjects2 = [];
gdjs.MainCode.GDsolarObjects1 = [];
gdjs.MainCode.GDsolarObjects2 = [];
gdjs.MainCode.GDwater_9595pumpObjects1 = [];
gdjs.MainCode.GDwater_9595pumpObjects2 = [];
gdjs.MainCode.GDwaste_9595filterObjects1 = [];
gdjs.MainCode.GDwaste_9595filterObjects2 = [];
gdjs.MainCode.GDair_9595filterObjects1 = [];
gdjs.MainCode.GDair_9595filterObjects2 = [];

gdjs.MainCode.{user_func_name} = function GDJSInlineCode(runtimeScene) {{
"use strict";
{bundle}
}};

gdjs.MainCode.eventsList0 = function(runtimeScene) {{
{{
  let isConditionTrue_0 = false;
  isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
  if (isConditionTrue_0) {{
  }}
}}
{{
  gdjs.MainCode.{user_func_name}(runtimeScene);
}}
}};

gdjs.MainCode.func = function(runtimeScene) {{
  runtimeScene.getOnceTriggers().startNewFrame();

  gdjs.MainCode.GDhouseObjects1.length = 0;
  gdjs.MainCode.GDhouseObjects2.length = 0;
  gdjs.MainCode.GDgeneratorObjects1.length = 0;
  gdjs.MainCode.GDgeneratorObjects2.length = 0;
  gdjs.MainCode.GDsolarObjects1.length = 0;
  gdjs.MainCode.GDsolarObjects2.length = 0;
  gdjs.MainCode.GDwater_9595pumpObjects1.length = 0;
  gdjs.MainCode.GDwater_9595pumpObjects2.length = 0;
  gdjs.MainCode.GDwaste_9595filterObjects1.length = 0;
  gdjs.MainCode.GDwaste_9595filterObjects2.length = 0;
  gdjs.MainCode.GDair_9595filterObjects1.length = 0;
  gdjs.MainCode.GDair_9595filterObjects2.length = 0;

  gdjs.MainCode.eventsList0(runtimeScene);

  gdjs.MainCode.GDhouseObjects1.length = 0;
  gdjs.MainCode.GDhouseObjects2.length = 0;
  gdjs.MainCode.GDgeneratorObjects1.length = 0;
  gdjs.MainCode.GDgeneratorObjects2.length = 0;
  gdjs.MainCode.GDsolarObjects1.length = 0;
  gdjs.MainCode.GDsolarObjects2.length = 0;
  gdjs.MainCode.GDwater_9595pumpObjects1.length = 0;
  gdjs.MainCode.GDwater_9595pumpObjects2.length = 0;
  gdjs.MainCode.GDwaste_9595filterObjects1.length = 0;
  gdjs.MainCode.GDwaste_9595filterObjects2.length = 0;
  gdjs.MainCode.GDair_9595filterObjects1.length = 0;
  gdjs.MainCode.GDair_9595filterObjects2.length = 0;

  return;
}};

gdjs['MainCode'] = gdjs.MainCode;
gdjs['VeniceCode'] = gdjs.MainCode;
gdjs['TokyoCode'] = gdjs.MainCode;
gdjs['EndlessCode'] = gdjs.MainCode;
'''

with open(code0_path, 'w', encoding='utf-8') as f:
    f.write(clean_code0)

print(f'SUCCESS: code0.js cleanly written with {user_func_name}! Total size: {len(clean_code0)} bytes')
