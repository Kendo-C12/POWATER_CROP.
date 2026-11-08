#!/usr/bin/env python3
import os
import shutil
import json
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
prev_dir = '/mnt/c/Users/user/AppData/Local/Temp/GDTMP--1/preview'
if not os.path.exists(prev_dir) and os.path.exists(r'C:\Users\user\AppData\Local\Temp\GDTMP--1\preview'):
    prev_dir = r'C:\Users\user\AppData\Local\Temp\GDTMP--1\preview'

assets_dir = os.path.join(ROOT_DIR, 'assets')
scripts_dir = os.path.join(ROOT_DIR, 'scripts')
code0_path = os.path.join(prev_dir, 'code0.js')

if not os.path.exists(prev_dir):
    print('Preview dir does not exist yet (skipping live preview patch).')
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

# 1.05 Copy config/*.json to preview/config/ and load inline
config_dir = os.path.join(ROOT_DIR, 'config')
prev_config_dir = os.path.join(prev_dir, 'config')
os.makedirs(prev_config_dir, exist_ok=True)

merged_config = {}
global_cfg_path = os.path.join(config_dir, 'global.json')
if os.path.exists(global_cfg_path):
    shutil.copy2(global_cfg_path, os.path.join(prev_config_dir, 'global.json'))
    with open(global_cfg_path, 'r', encoding='utf-8') as gcf:
        merged_config = json.load(gcf)

merged_config['stages'] = {}
for stg_name in ['tutorial', 'bangkok', 'tokyo', 'rome', 'amsterdam']:
    stg_path = os.path.join(config_dir, f'{stg_name}.json')
    if os.path.exists(stg_path):
        shutil.copy2(stg_path, os.path.join(prev_config_dir, f'{stg_name}.json'))
        with open(stg_path, 'r', encoding='utf-8') as scf:
            merged_config['stages'][stg_name] = json.load(scf)

stage_cfg_inline = json.dumps(merged_config, ensure_ascii=False, indent=2)
print('config/*.json copied to preview/config/ directory.')

# 1.1 Sync data.js with POWATER CROPS..json
project_json_path = os.path.join(ROOT_DIR, 'POWATER CROPS..json')
if os.path.exists(project_json_path):
    with open(project_json_path, 'r', encoding='utf-8') as pf:
        proj_data = json.load(pf)
    proj_data.setdefault('usedResources', [{'name': r['name']} for r in proj_data.get('resources', {}).get('resources', [])])
    data_js_path = os.path.join(prev_dir, 'data.js')
    with open(data_js_path, 'w', encoding='utf-8') as df:
        df.write('gdjs.projectData = ' + json.dumps(proj_data) + ';\n')
    print('data.js updated in preview directory.')

# 2. Bundle all scripts in proper dependency order
scripts_order = ['config.js', 'audio.js', 'map.js', 'entities.js', 'engine.js', 'ui.js', 'main.js']
bundle = f'\n// === STAGE CONFIG (stage_config.json) ===\nglobalThis.POWATER_STAGE_CONFIG = {stage_cfg_inline};\n'
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

user_func_name = 'userFunc0x82b728'
if os.path.exists(code0_path):
    with open(code0_path, 'r', encoding='utf-8') as f:
        existing = f.read()
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
gdjs['TutorialCode'] = gdjs.MainCode;
gdjs['TokyoCode'] = gdjs.MainCode;
gdjs['RomeCode'] = gdjs.MainCode;
gdjs['AmsterdamCode'] = gdjs.MainCode;
gdjs['VeniceCode'] = gdjs.MainCode;
gdjs['EndlessCode'] = gdjs.MainCode;
'''

with open(code0_path, 'w', encoding='utf-8') as f:
    f.write(clean_code0)

scene_code_map = [
    ('code1.js', 'TutorialCode'),
    ('code2.js', 'TokyoCode'),
    ('code3.js', 'RomeCode'),
    ('code4.js', 'AmsterdamCode'),
]
for fname, code_ns in scene_code_map:
    cpath = os.path.join(prev_dir, fname)
    with open(cpath, 'w', encoding='utf-8') as cf:
        cf.write(f"gdjs.{code_ns} = gdjs.MainCode;\ngdjs['{code_ns}'] = gdjs.MainCode;\n")

print(f'SUCCESS: code0.js..code4.js cleanly written with {user_func_name}! Total size: {len(clean_code0)} bytes')
