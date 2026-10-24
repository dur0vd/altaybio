#!/usr/bin/env python3
"""Publish committed dist files to gh-pages without extra Git extensions."""
import subprocess
import sys

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

remote = sys.argv[1] if len(sys.argv) > 1 else 'origin'
subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--', 'dist'], check=True)
source = git('rev-parse', 'HEAD')
tree = git('rev-parse', 'HEAD:dist')
parents = []
if git('ls-remote', '--heads', remote, 'refs/heads/gh-pages'):
    subprocess.run(['git', 'fetch', remote, 'gh-pages'], check=True)
    parents = ['-p', git('rev-parse', 'FETCH_HEAD')]
commit = git('commit-tree', tree, *parents, '-m', f'Deploy website from {source}')
subprocess.run(['git', 'push', remote, f'{commit}:refs/heads/gh-pages'], check=True)
print('Published gh-pages:', commit)
