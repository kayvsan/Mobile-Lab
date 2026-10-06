import os
for root, dirs, files in os.walk('c:/Users/KAMS/Documents/Project/Mobile-Lab/003-modular-apm'):
    if 'env' in root: continue
    for f in files:
        if f.endswith('.py'):
            lines = open(os.path.join(root, f), encoding='utf-8').readlines()
            for i, line in enumerate(lines):
                if '"extra"' in line or "'extra'" in line:
                    print(f"{root}/{f}:{i+1}: {line.strip()}")
