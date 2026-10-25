"""Modelo artístico propio inspirado en Octavia vRS facelift. No CAD oficial.
Dimensiones de referencia: Škoda Storyboard/Octavia RS, 4709×1829×1455 mm.
Geometría original, sin modelos extraídos ni materiales de terceros.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'build/cinematic');OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
groups={}
def group(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);groups[name]=o;return o
for name in ['chasis','capo','frontal','trasera','faros','porton','techo','panel_izq','panel_der','puerta_di','puerta_dd','puerta_ti','puerta_td','motor','transmision','suspension_di','suspension_dd','suspension_ti','suspension_td','freno_di','freno_dd','freno_ti','freno_td','rueda_di','rueda_dd','rueda_ti','rueda_td','salpicadero','pantalla','consola','asiento_i','asiento_d','asientos_traseros']:group(name)
def mat(name,color,metal=0,rough=.3,emit=0,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,alpha);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;n.inputs['Coat Weight'].default_value=.55 if metal>.3 else .08;n.inputs['Coat Roughness'].default_value=.15
 if alpha<1:
  if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
  else:m.blend_method='BLEND'
 n.inputs['Alpha'].default_value=alpha
 if emit:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emit
 return m
paint=mat('Rojo velvet metalizado',(.34,.012,.024),.68,.24);black=mat('Negro piano',(.004,.005,.006),.08,.34);rubber=mat('Neumático',(.014,.017,.018),0,.78);chrome=mat('Aleación mecanizada',(.57,.62,.66),.9,.21);steel=mat('Acero satinado',(.25,.29,.32),.85,.36);leather=mat('Suedia negra',(.024,.028,.032),0,.84);red=mat('Pinzas rojas',(.61,.012,.018),.18,.3);glass=mat('Vidrio ahumado',(.025,.050,.065),.06,.10,alpha=.60);white=mat('LED blanco',(.78,.91,1),0,.2,3);tail=mat('LED rojo',(.9,.007,.015),0,.21,2);screen=mat('Pantalla encendida',(.015,.12,.18),.1,.23,.4)
def finish(o,name,material,g,bevel=0):
 o.name=name;o.data.materials.append(material);o.parent=groups[g]
 if bevel:
  mod=o.modifiers.new('Aristas suavizadas','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for poly in o.data.polygons:poly.use_smooth=True
 return o

def box(name,loc,size,material,g,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material,g,bevel)
def mesh(name,verts,faces,material,g,solid=0):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);finish(o,name,material,g)
 if solid:
  mod=o.modifiers.new('Espesor de panel','SOLIDIFY');mod.thickness=solid;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def tube(name,points,r,material,g):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2;p=c.splines.new('POLY');p.points.add(len(points)-1)
 for v,co in zip(p.points,points):v.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);o.parent=groups[g];bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def cylinder(name,loc,r,depth,material,g,axis='X',vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object
 if axis=='X':o.rotation_euler.y=math.pi/2
 elif axis=='Y':o.rotation_euler.x=math.pi/2
 return finish(o,name,material,g,.003)
def torus(name,loc,major,minor,material,g,axis='X'):
 bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=10,location=loc,major_radius=major,minor_radius=minor);o=bpy.context.object
 if axis=='X':o.rotation_euler.y=math.pi/2
 elif axis=='Y':o.rotation_euler.x=math.pi/2
 return finish(o,name,material,g)
def text(name,body,loc,size,material,g,rot):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.align_x='CENTER';c.size=size;c.extrude=.0008;c.bevel_depth=.0003;c.font=bpy.data.fonts.load('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;o.parent=groups[g];o.data.materials.append(material);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
# Chasis abierto: largueros, piso, travesaños y escape, sin caja maciza.
box('Piso del habitáculo',(0,.25,.23),(1.48,2.8,.08),steel,'chasis')
for x in [-.68,.68]:box('Larguero',(x,.05,.2),(.09,3.9,.10),steel,'chasis')
for y in [-1.42,1.26]:box('Subchasis',(0,y,.26),(1.5,.22,.10),black,'chasis')
tube('Línea de escape',[(.27,-1.05,.24),(.32,-.2,.14),(.32,1.4,.16),(.55,2.1,.23)],.035,steel,'chasis')
# Paneles laterales y pasos de rueda perforados en geometría, no pintados.
for side,label in [(-1,'izq'),(1,'der')]:
 for a,b,g in [(-2.17,-.76,'panel_'+label),(-.745,.18,'puerta_di' if side<0 else 'puerta_dd'),(.195,1.10,'puerta_ti' if side<0 else 'puerta_td'),(1.115,2.22,'panel_'+label)]:
  verts=[];faces=[];ny=70;nz=12
  def topline(y):
   return .98 if -.70<y<1.45 else (.82+(.98-.82)*max(0,min(1,(y+2.17)/1.47)) if y<-.70 else .98-(y-1.45)/.77*.115)
  for j in range(ny+1):
   y=a+(b-a)*j/ny;bottom=.25
   for wy in [-1.425,1.256]:
    dy=y-wy
    if abs(dy)<.353:bottom=max(bottom,.335+math.sqrt(.353**2-dy**2))
   for k in range(nz+1):
    v=k/nz;z=bottom+(topline(y)-bottom)*v
    taper=.91-.07*max(0,min(1,(-y-1.45)/.75))-.06*max(0,min(1,(y-1.6)/.7))
    x=taper-.028*(2*v-1)**2+.009*math.sin(v*math.pi)
    verts.append((side*x,y,z))
  for j in range(ny):
   for k in range(nz):
    q=j*(nz+1)+k;faces.append((q,q+nz+1,q+nz+2,q+1) if side>0 else (q+1,q+nz+2,q+nz+1,q))
  o=mesh('Panel esculpido',verts,faces,paint,g,.018)
  # Pliegue longitudinal y tiradores discretos.
  if g.startswith('puerta'):
   tube('Línea de cintura',[(side*.915,a+.04,.91),(side*.921,b-.04,.91)],.005,paint,g)
   box('Tirador',(side*.916,b-.14,.91),(.025,.14,.025),black,g,.012)
 for wy in [-1.425,1.256]:
  pts=[(side*.914,wy+math.cos(t)*.353,.335+math.sin(t)*.353) for t in [math.pi*i/48 for i in range(49)]];tube('Labio del paso de rueda',pts,.009,paint,'panel_'+label)
 box('Talonera vRS',(side*.90,.16,.225),(.065,2.2,.09),black,'panel_'+label,.018)
# Capó curvado con nervaduras: malla de superficie bicurva.
verts=[];faces=[]
for j in range(21):
 y=-2.345+j/20*1.675
 for i in range(25):
  u=-1+i/12;w=.81+.025*j/20;z=.81+.17*j/20+.035*(1-u*u)+.014*math.exp(-((abs(u)-.59)/.08)**2);verts.append((u*w,y,z))
for j in range(20):
 for i in range(24):a=j*25+i;faces.append((a,a+1,a+26,a+25))
mesh('Capó esculpido',verts,faces,paint,'capo',.018)
# Cubierta delantera y parrilla trapezoidal.
verts=[];faces=[]
for j,(z,w) in enumerate([(.245,.84),(.32,.87),(.48,.88),(.65,.86),(.76,.83),(.81,.79)]):
 for i in range(33):
  u=-1+i/16;verts.append((u*w,-2.355+.135*u*u,z))
for j in range(5):
 for i in range(32):q=j*33+i;faces.append((q,q+1,q+34,q+33))
mesh('Paragolpes frontal esculpido',verts,faces,paint,'frontal',.028)
mesh('Marco de parrilla',[(-.65,-2.355,.77),(.65,-2.355,.77),(.56,-2.37,.50),(-.56,-2.37,.50)],[(0,1,2,3)],black,'frontal',.025)
for i in range(19):
 x=-.55+i*.061;box('Lama vertical parrilla',(x,-2.384,.635),(.016,.018,.205),black,'frontal',.005)
box('Entrada inferior',(0,-2.35,.35),(1.31,.025,.14),black,'frontal',.028)
for side in [-1,1]:
 box('Entrada lateral',(side*.73,-2.326,.43),(.18,.045,.21),black,'frontal',.025)
 for j in range(3):box('Aleta de aire',(side*.73,-2.36,.375+j*.055),(.15,.015,.009),steel,'frontal',.002)
box('Splitter frontal',(0,-2.315,.225),(1.78,.16,.055),black,'frontal')
text('Insignia vRS','vRS',(.35,-2.402,.65),.075,chrome,'frontal',(math.pi/2,0,0))
cylinder('Emblema frontal',(0,-2.37,.825),.048,.012,chrome,'capo','Y');text('Marca frontal','Š',(0,-2.38,.803),.063,black,'capo',(math.pi/2,0,0))
# Faros LED facetados, dos módulos y firma luminosa angular.
for side in [-1,1]:
 v=[(side*.62,-2.36,.79),(side*.87,-2.25,.80),(side*.90,-2.22,.68),(side*.66,-2.35,.68)];mesh('Óptica oscura',v,[(0,1,2,3)],black,'faros',.023)
 tube('Firma LED superior',[(side*.64,-2.373,.785),(side*.85,-2.29,.787),(side*.88,-2.25,.742)],.010,white,'faros')
 for x in [.70,.80]:box('Módulo Matrix LED',(side*x,-2.35+(x-.7)*.4,.735),(.047,.015,.029),white,'faros',.005)
# Techo y pilares finos; el interior existe desde el primer fotograma.
roofverts=[]
for j in range(13):
 y=-.12+j/12*1.12
 for i in range(17):u=-1+i/8;roofverts.append((u*.648,y,1.425+.025*(1-u*u)+.007*math.sin(j/12*math.pi)))
rooffaces=[]
for j in range(12):
 for i in range(16):a=j*17+i;rooffaces.append((a,a+1,a+18,a+17))
mesh('Techo',roofverts,rooffaces,paint,'techo',.018)
mesh('Parabrisas',[(-.80,-.68,.995),(.80,-.68,.995),(.645,-.12,1.425),(-.645,-.12,1.425)],[(0,1,2,3)],glass,'techo',.006)
for side in [-1,1]:
 tube('Pilar A',[(side*.815,-.70,.99),(side*.66,-.11,1.44)],.027,paint,'techo')
 tube('Marco del techo',[(side*.66,-.11,1.44),(side*.66,.97,1.44),(side*.80,1.73,1.00)],.025,paint,'techo')
 for points,g in [([(side*.805,-.66,1.0),(side*.658,-.10,1.405),(side*.66,.15,1.414),(side*.805,.15,1.0)],'puerta_di' if side<0 else 'puerta_dd'), ([(side*.805,.20,1.0),(side*.66,.20,1.414),(side*.66,.94,1.414),(side*.805,1.40,1.0)],'puerta_ti' if side<0 else 'puerta_td')]:
  mesh('Luna lateral',points,[(0,1,2,3)],glass,g,.005)
  tube('Marco negro de ventanilla',points+[points[0]],.012,black,g)
 box('Pilar B',(side*.80,.175,1.17),(.035,.06,.39),black,'techo')
 g='puerta_di' if side<0 else 'puerta_dd';tube('Soporte espejo',[(side*.85,-.58,1.03),(side*1.00,-.54,1.05)],.02,black,g);box('Retrovisor',(side*1.015,-.54,1.08),(.19,.16,.09),black,g,.04)
mesh('Luna trasera',[(-.65,1.01,1.42),(.65,1.01,1.42),(.79,1.79,.985),(-.79,1.79,.985)],[(0,1,2,3)],glass,'porton',.006)
mesh('Portón',[(-.79,1.79,.985),(.79,1.79,.985),(.78,2.25,.895),(-.78,2.25,.895)],[(0,1,2,3)],paint,'porton',.025)
box('Labio spoiler',(0,2.22,.934),(1.57,.095,.035),black,'porton',.015)
# Parte posterior, letras separadas y grupos ópticos con firma roja.
box('Paragolpes posterior',(0,2.25,.535),(1.66,.20,.52),paint,'trasera',.09)
box('Difusor',(0,2.31,.28),(1.48,.11,.16),black,'trasera',.03)
for x in [-.48,-.24,0,.24,.48]:box('Aleta del difusor',(x,2.35,.265),(.016,.15,.17),black,'trasera',.002)
for side in [-1,1]:
 box('Piloto trasero',(side*.64,2.355,.805),(.41,.026,.11),black,'porton',.018)
 tube('Firma LED trasera',[(side*.44,2.374,.84),(side*.82,2.374,.84),(side*.78,2.374,.76),(side*.54,2.374,.76)],.011,tail,'porton')
 box('Embellecedor escape',(side*.62,2.36,.28),(.25,.09,.11),chrome,'trasera',.028);box('Salida oscura',(side*.62,2.409,.28),(.21,.007,.07),black,'trasera',.02)
text('ŠKODA trasero','Š K O D A',(0,2.376,.84),.085,chrome,'porton',(math.pi/2,0,math.pi))
text('Octavia','OCTAVIA',(-.46,2.37,.71),.033,chrome,'porton',(math.pi/2,0,math.pi));text('Insignia trasera','vRS',(.64,2.37,.69),.06,chrome,'porton',(math.pi/2,0,math.pi))
box('Matrícula',(0,2.362,.60),(.48,.02,.10),black,'trasera',.005);text('Matrícula club','CLUB vRS',(0,2.375,.58),.05,chrome,'trasera',(math.pi/2,0,math.pi))
# Ruedas, discos, calipers y suspensión separados por conjunto.
for side,letter in [(-1,'i'),(1,'d')]:
 for wy,axle in [(-1.425,'d'),(1.256,'t')]:
  suffix=axle+letter;g='rueda_'+suffix;x=side*.805;z=.329
  torus('Neumático deportivo',(x,wy,z),.259,.069,rubber,g)
  for dx in [-.045,-.020,.020,.045]:torus('Canal del neumático',(x+dx,wy,z),.322,.004,black,g)
  torus('Aro de llanta',(side*.894,wy,z),.232,.012,chrome,g)
  cylinder('Barril de llanta',(x,wy,z),.225,.15,black,g)
  cylinder('Buje',(side*.908,wy,z),.048,.025,chrome,g)
  for n in range(10):
   t=n*math.pi/5+.15;pts=[(side*.911,wy+math.cos(t)*.04,z+math.sin(t)*.04),(side*.914,wy+math.cos(t+.14)*.22,z+math.sin(t+.14)*.22)];tube('Radio mecanizado',pts,.012,chrome,g)
  for n in range(5):t=n*math.tau/5;cylinder('Tornillo',(side*.927,wy+math.cos(t)*.029,z+math.sin(t)*.029),.005,.006,black,g,vertices=12)
  bg='freno_'+suffix;cylinder('Disco ventilado',(side*.82,wy,z),.19,.022,steel,bg)
  for n in range(24):
   t=n*math.tau/24;cylinder('Perforación disco',(side*.834,wy+math.cos(t)*.164,z+math.sin(t)*.164),.005,.002,black,bg,vertices=8)
  box('Pinza roja',(side*.84,wy-.145,z+.045),(.065,.085,.185),red,bg,.025)
  sg='suspension_'+suffix;tube('Brazo inferior',[(side*.26,wy-.14,.24),(side*.74,wy,.30),(side*.28,wy+.15,.24)],.023,steel,sg)
  cylinder('Amortiguador',(side*.63,wy,.57),.034,.46,steel,sg,'Z')
  helix=[(side*.63+.067*math.cos(t),wy+.067*math.sin(t),.44+t/(math.tau*6)*.32) for t in [i/120*math.tau*6 for i in range(121)]];tube('Muelle helicoidal',helix,.009,black,sg)
# Motor, transmisión, tubos y soportes; interpretación artística de 2.0 TSI transversal.
box('Bloque motor',(0,-1.15,.58),(.63,.58,.42),steel,'motor',.05)
box('Tapa 2.0 TSI',(0,-1.13,.817),(.67,.54,.075),black,'motor',.035)
for i in range(4):
 x=-.22+i*.145;box('Nervadura de tapa',(x,-1.13,.86),(.035,.46,.015),steel,'motor',.005)
 tube('Colector de admisión',[(x,-1.45,.76),(x,-1.57,.69),(x,-1.51,.50)],.035,black,'motor')
text('Identificación motor','2.0 TSI',(0,-1.15,.862),.065,chrome,'motor',(0,0,0))
box('Caja DSG',(.51,-1.16,.49),(.32,.53,.33),steel,'transmision',.045)
for j in range(7):box('Aleta DSG',(.51,-1.37+j*.065,.66),(.28,.014,.025),steel,'transmision',.004)
for x in [-.45,.45]:tube('Semieje',[(x,-1.425,.35),(x+(.27 if x>0 else -.27),-1.425,.35)],.028,steel,'transmision')
box('Radiador',(0,-1.91,.59),(1.12,.065,.37),black,'motor')
for i in range(18):box('Aleta radiador',(-.51+i*.06,-1.95,.59),(.012,.01,.34),steel,'motor',.001)
# Habitáculo completo: asientos, volante, salpicadero, pantalla y consola.
box('Salpicadero',(0,-.55,.92),(1.5,.31,.20),leather,'salpicadero',.07)
tube('Luz ambiental',[(-.70,-.385,.995),(.70,-.385,.995)],.005,tail,'salpicadero')
for x in [-.62,.30,.60]:box('Aireador',(x,-.379,.96),(.17,.025,.055),black,'salpicadero',.01)
box('Cuadro digital',(-.43,-.45,1.04),(.34,.035,.13),black,'salpicadero',.012)
box('Virtual Cockpit',(-.43,-.427,1.045),(.30,.007,.095),screen,'salpicadero',.007)
text('Velocímetro','0',(-.43,-.418,1.018),.055,white,'salpicadero',(math.pi/2,0,math.pi))
torus('Volante deportivo',(-.43,-.25,1.025),.153,.018,leather,'salpicadero','Y')
box('Centro del volante',(-.43,-.25,1.02),(.15,.06,.10),black,'salpicadero',.03)
for dx,dz in [(-.13,.02),(.13,.02),(0,-.12)]:tube('Radio volante',[(-.43,-.24,1.02),(-.43+dx,-.24,1.02+dz)],.017,chrome,'salpicadero')
box('Pantalla de 13 pulgadas',(.13,-.49,1.135),(.355,.027,.205),black,'pantalla',.014)
box('Navegación',(.13,-.472,1.135),(.327,.006,.174),screen,'pantalla',.008)
for i in range(4):tube('Calles navegador',[(-.005+i*.07,-.467,1.075),(.02+i*.07,-.467,1.18)],.0018,chrome,'pantalla')
box('Consola central',(0,-.02,.49),(.26,.78,.18),black,'consola',.04)
box('Selector DSG',(0,-.29,.595),(.075,.11,.04),chrome,'consola',.012)
for y in [.04,.22]:cylinder('Portavasos',(0,y,.588),.065,.01,rubber,'consola','Z')
box('Reposabrazos',(0,.35,.65),(.24,.27,.11),leather,'consola',.035)
for side,label in [(-1,'i'),(1,'d')]:
 g='asiento_'+label;x=side*.44
 box('Banqueta deportiva',(x,.18,.42),(.43,.48,.17),leather,g,.06)
 b=box('Respaldo deportivo',(x,.41,.78),(.43,.16,.67),leather,g,.065);b.rotation_euler.x=math.radians(-9)
 for dx in [-.19,.19]:box('Apoyo lateral',(x+dx,.32,.74),(.085,.23,.48),leather,g,.035)
 box('Reposacabezas',(x,.46,1.14),(.25,.10,.18),leather,g,.04)
 for dx in [-.16,.16]:tube('Costura roja',[(x+dx,.118,.51),(x+dx,.325,.51),(x+dx,.30,.96)],.003,red,g)
 text('Bordado vRS','vRS',(x,.306,.97),.047,chrome,g,(math.pi/2,0,math.pi))
box('Banqueta trasera',(0,1.06,.43),(1.31,.44,.15),leather,'asientos_traseros',.05)
box('Respaldo trasero',(0,1.29,.74),(1.31,.13,.57),leather,'asientos_traseros',.04)
for x in [-.45,0,.45]:box('Reposacabezas trasero',(x,1.29,1.06),(.23,.10,.16),leather,'asientos_traseros',.03)
# Reduce draw calls sin fusionar piezas que deben separarse.
for name,parent in groups.items():
 children=[o for o in parent.children if o.type=='MESH']
 if not children:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in children:o.select_set(True)
 bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'_geometria';o.parent=parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'octavia-art.glb'),export_format='GLB',export_materials='EXPORT',export_apply=True)
(OUT/'modelo.json').write_text(json.dumps({'autor':'Modelo artístico original creado para Club Octavia VRS','licencia':'Uso del club; representación artística, no modelo oficial ni CAD','grupos':list(groups),'referencia_dimensiones':'https://www.skoda.com.sg/octavia-RS/octavia-rs-fl','piezas_independientes':len(groups)},ensure_ascii=False,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'octavia-art.blend'))
print('MODELO_CINE_OK',len(groups), 'grupos')
