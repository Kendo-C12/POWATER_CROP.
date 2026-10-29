import os
import shutil

prev_dir = r'C:\Users\user\AppData\Local\Temp\GDTMP--1\preview'
assets_dir = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\assets'
scripts_dir = r'c:\Users\user\Desktop\Folder\GDEV_POWATER\scripts'
code0_path = os.path.join(prev_dir, 'code0.js')

if not os.path.exists(prev_dir):
    print('Preview dir does not exist yet.')
    exit(0)

# 1. Copy all assets to preview
for f in os.listdir(assets_dir):
    if f.endswith('.png'):
        src = os.path.join(assets_dir, f)
        shutil.copy2(src, os.path.join(prev_dir, f))
        prev_assets = os.path.join(prev_dir, 'assets')
        os.makedirs(prev_assets, exist_ok=True)
        shutil.copy2(src, os.path.join(prev_assets, f))

# 2. Bundle scripts
scripts_order = ['config.js', 'audio.js', 'map.js', 'entities.js', 'engine.js', 'ui.js', 'main.js']
bundle = ''
for s in scripts_order:
    with open(os.path.join(scripts_dir, s), 'r', encoding='utf-8') as sf:
        bundle += f'\n// === MODULE: {s} ===\n' + sf.read()

bundle += '''
if (typeof POWATER !== 'undefined' && POWATER.GameController) {
  if (!globalThis._powaterControllerInstance) {
    globalThis._powaterControllerInstance = new POWATER.GameController();
  }
  globalThis._powaterControllerInstance.update(runtimeScene);
}
'''

# 3. Patch code0.js
if os.path.exists(code0_path):
    with open(code0_path, 'r', encoding='utf-8') as f:
        code0 = f.read()

    start_idx = code0.find('gdjs.MainCode.userFunc0x8ea9a8 = function')
    end_idx = code0.find('gdjs.MainCode.eventsList0 = function')
    last_close = code0.rfind('};', start_idx, end_idx) + 2

    header = 'gdjs.MainCode.userFunc0x8ea9a8 = function GDJSInlineCode(runtimeScene) {\n"use strict";\n'
    footer = '\n};'
    new_func = header + bundle + footer

    new_code0 = code0[:start_idx] + new_func + code0[last_close:]
    with open(code0_path, 'w', encoding='utf-8') as f:
        f.write(new_code0)

    print('SUCCESS: code0.js updated! New length:', len(new_code0))
