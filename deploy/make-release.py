#!/usr/bin/env python3
"""Build upload-ready zips for the Windows server.

    python3 deploy/make-release.py            # site code only
    python3 deploy/make-release.py --data     # also package current content (data/)

Outputs go to release/:
  sfa-semicon-site.zip  - code, templates, assets, deploy scripts (no node_modules)
  sfa-semicon-data.zip  - db.json, uploads, backups, session key (only with --data)
"""
import sys
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'release'
SKIP_DIRS = {'node_modules', 'data', 'release', 'logs'}
SKIP_FILES = {'.DS_Store'}
# Stale on any machine where the admin password has since been changed.
SKIP_DATA = {'INITIAL_ADMIN_PASSWORD.txt', 'db.json.tmp'}


def add_tree(zf, base, prefix, skip_dirs, skip_files):
    count = 0
    for path in sorted(base.rglob('*')):
        rel = path.relative_to(base)
        # Skip listed folders and any dot-folders/files (editor and tool metadata).
        if not path.is_file() or any(part in skip_dirs or part.startswith('.') for part in rel.parts):
            continue
        # The WinSW binary and generated XML are per-server; install.ps1 recreates them.
        if rel.parts[:3] == ('deploy', 'windows', 'service'):
            continue
        if path.name in skip_files or path.name.endswith('.zip'):
            continue
        zf.write(path, f'{prefix}{rel.as_posix()}')
        count += 1
    return count


def main():
    OUT.mkdir(exist_ok=True)
    site = OUT / 'sfa-semicon-site.zip'
    with zipfile.ZipFile(site, 'w', zipfile.ZIP_DEFLATED) as zf:
        n = add_tree(zf, ROOT, 'sfa-semicon/', SKIP_DIRS, SKIP_FILES)
    print(f'{site.relative_to(ROOT)}  ({n} files, {site.stat().st_size / 1024:.0f} KB)')

    if '--data' in sys.argv:
        data_dir = ROOT / 'data'
        if not (data_dir / 'db.json').exists():
            sys.exit('No data/db.json found - nothing to package.')
        data = OUT / 'sfa-semicon-data.zip'
        with zipfile.ZipFile(data, 'w', zipfile.ZIP_DEFLATED) as zf:
            n = add_tree(zf, data_dir, 'data/', set(), SKIP_DATA)
        print(f'{data.relative_to(ROOT)}  ({n} files, {data.stat().st_size / 1024:.0f} KB) - built {datetime.now():%Y-%m-%d %H:%M}')


if __name__ == '__main__':
    main()
