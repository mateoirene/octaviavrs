from pathlib import Path
import subprocess,sys,tarfile,sqlite3,json,hashlib,shutil,zipfile,datetime
work=Path(sys.argv[1]);root=work/'archivo de seguridad OCTAVIA WEB';root.mkdir(exist_ok=True);source=root/'fuente';source.mkdir(exist_ok=True)
archive=work/'source.tar'
with archive.open('wb') as handle:subprocess.run(['git','archive','HEAD'],stdout=handle,check=True)
with tarfile.open(archive) as handle:handle.extractall(source,filter='data')
# Añadir los recursos compilados que no se guardan en Git: motor, PBR, HDR y fotos.
shutil.copytree('dist',source/'dist',dirs_exist_ok=True)
data=root/'datos';data.mkdir(exist_ok=True);sql=work/'datos'/'produccion.sql';shutil.copy2(sql,data/'produccion.sql')
db=sqlite3.connect(data/'produccion.sqlite');db.executescript(sql.read_text());assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not db.execute('PRAGMA foreign_key_check').fetchall()
tables=[row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")]
counts={table:db.execute('SELECT COUNT(*) FROM "'+table.replace('"','""')+'"').fetchone()[0] for table in tables}
for name in ['market_listings','market_admins','garage_members','garage_profiles','gallery_folders','gallery_photos']:assert name in counts,name
def valid_image(mime,blob):
 return isinstance(blob,bytes) and len(blob)>0 and ((mime=='image/jpeg' and blob.startswith(b'\xff\xd8\xff')) or (mime=='image/png' and blob.startswith(b'\x89PNG')) or (mime=='image/webp' and blob.startswith(b'RIFF')))
photo_count=0
for table in ['market_photos','garage_photos','garage_profiles']:
 for mime,blob in db.execute('SELECT content_type,data FROM '+table+' WHERE data IS NOT NULL'):
  assert valid_image(mime,blob),(table,mime)
  photo_count+=1
# Las imágenes de galería siguen dentro de gallery_photos. Los vídeos dejan un
# BLOB vacío allí y conservan el archivo original, por fragmentos, en
# club_media_files/club_media_chunks.
for media_id,mime,blob in db.execute('SELECT id,content_type,data FROM gallery_photos WHERE data IS NOT NULL'):
 if mime.startswith('image/'):
  assert valid_image(mime,blob),('gallery_photos',media_id,mime)
  photo_count+=1
 else:
  assert mime in ('video/mp4','video/webm') and isinstance(blob,bytes) and len(blob)==0,(media_id,mime)
  assert db.execute('SELECT id FROM club_media_files WHERE id=?',(media_id,)).fetchone(),media_id
media_count=0
if 'club_media_files' in counts:
 for media_id,mime,size in db.execute('SELECT id,content_type,size FROM club_media_files'):
  chunks=db.execute('SELECT position,length(data),substr(data,1,16) FROM club_media_chunks WHERE file_id=? ORDER BY position',(media_id,)).fetchall()
  assert isinstance(size,int) and size>0 and chunks,media_id
  assert [row[0] for row in chunks]==list(range(len(chunks))),media_id
  assert all(row[1]>0 for row in chunks) and sum(row[1] for row in chunks)==size,media_id
  first=chunks[0][2]
  assert (mime.startswith('image/') and valid_image(mime,first)) or (mime=='video/mp4' and first[4:8]==b'ftyp') or (mime=='video/webm' and first.startswith(b'\x1aE\xdf\xa3')),(media_id,mime)
  media_count+=1
db.close();config=json.loads((work/'configuracion.json').read_text());config['databaseExport']['tables']=counts;config['databaseExport']['photoCount']=photo_count;config['databaseExport']['mediaFiles']=media_count;config['databaseExport']['sqliteIntegrity']='ok';config['databaseExport']['foreignKeys']='ok';(root/'MANIFIESTO.json').write_text(json.dumps(config,ensure_ascii=False,indent=2))
for name in ['LEEME-RAUL.md','RECUPERACION-PARA-CODEX.md','verificar.py','servidor-local.mjs']:
 shutil.copy2(Path('.github/backup')/name,root/name)
# Las cookies activas, contraseñas y claves de servicio no se extraen del entorno.
checks={str(path.relative_to(root)):hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(root.rglob('*')) if path.is_file()};(root/'SHA256SUMS.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
with zipfile.ZipFile(work/'archivo de seguridad OCTAVIA WEB.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as target:
 for path in sorted(root.rglob('*')):
  if path.is_file():target.write(path,str(path.relative_to(root.parent)))
print('BASE_DE_DATOS_VERIFICADA '+json.dumps({'tablas':len(tables),'registros':sum(counts.values()),'fotografias':photo_count,'integridad':'ok'}))
