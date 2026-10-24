from pathlib import Path
import json,hashlib,sqlite3,sys
root=Path(__file__).resolve().parent
checks=json.loads((root/'SHA256SUMS.json').read_text());bad=[]
for name,expected in checks.items():
 p=root/name
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:bad.append(name)
if bad:print('ERROR: archivos ausentes o modificados:',*bad,sep='\n');sys.exit(1)
db=sqlite3.connect('file:'+str(root/'datos/produccion.sqlite')+'?mode=ro',uri=True)
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
manifest=json.loads((root/'MANIFIESTO.json').read_text())
for table,count in manifest['databaseExport']['tables'].items():
 assert db.execute('SELECT COUNT(*) FROM "'+table.replace('"','""')+'"').fetchone()[0]==count,table
print('COPIA VERIFICADA: archivos, base de datos y recuentos coinciden.');db.close()
