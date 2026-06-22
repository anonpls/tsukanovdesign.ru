import sys
import os

INTERP = "/var/www/u3354621/data/flaskenv/bin/python"
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

project_dir = '/var/www/u3354621/data/www/tsukanovdesign.ru'
sys.path.insert(0, project_dir)
os.chdir(project_dir)

from app import app as application