"""Original editable Octavia-inspired Mk4 study. Metres, +Y forward in Blender.
No third-party model; not an official CAD replica. Run blender -b -P this_file.
"""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Source coordinates match Three: x lateral, y height, z rearward.
def coord(p):return (p[0],-p[2],p[1])
def material(name,color,metal=0,rough=.4,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
paint=material('Paint 1',(.025,.18,.31),.75,.23);black=material('Gloss black',(.012,.016,.019),.3,.24);rubber=material('Tyre',(.018,.021,.024),0,.88);glass=material('Glass',(.05,.12,.17),.2,.17);alloy=material('Machined alloy',(.55,.59,.62),.9,.23);brake=material('Caliper red',(.65,.015,.025),.2,.37);disc=material('Brake disc',(.24,.26,.28),.8,.45);lamp=material('Headlight',(.73,.87,1),.2,.12,2);tail=material('Brakelight',(.8,.012,.025),.2,.18,1.2);trim=material('Cabin trim',(.018,.022,.028),.05,.8);seat=material('Cabin upholstery',(.03,.035,.042),0,.95)
def mesh(name,verts,faces,mat,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata([coord(v) for v in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for p in data.polygons:p.use_smooth=smooth
 return o
def box(name,p,size,mat,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=coord(p));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:mod=o.modifiers.new('Manufactured edges','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def tube(name,pts,r,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=r;c.bevel_resolution=1;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,v in zip(s.points,pts):p.co=(*coord(v),1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
# Rounded continuous body with real open wheel arches, characteristic flat hood and liftback deck.
rings=[(-2.35,.86,.29,.84),(-2.22,.85,.24,.88),(-1.9,.906,.24,.92),(-1.39,.914,.24,.92),(-.85,.91,.24,.94),(.3,.914,.24,.97),(1.3,.914,.24,1.0),(1.86,.89,.27,.99),(2.2,.85,.3,.93),(2.35,.78,.32,.87)]
profile=[(-.75,0),(.75,0),(.985,.06),(1,.22),(.998,.69),(.975,.83),(.91,.96),(.78,1),(-.78,1),(-.91,.96),(-.975,.83),(-.998,.69),(-1,.22),(-.985,.06)]
verts=[];faces=[];steps=160;n=len(profile)
for i in range(steps+1):
 z=-2.35+4.7*i/steps;j=0
 while j<len(rings)-2 and z>rings[j+1][0]:j+=1
 a,b=rings[j:j+2];t=(z-a[0])/(b[0]-a[0]);w=a[1]+(b[1]-a[1])*t;lo=a[2]+(b[2]-a[2])*t;hi=a[3]+(b[3]-a[3])*t
 for x,y in profile:
  bottom=lo
  if abs(x)>.9:
   for axle in [-1.39,1.296]:
    dz=z-axle
    if abs(dz)<.365:bottom=max(bottom,.335+math.sqrt(.365**2-dz**2))
  verts.append((x*w,bottom+(hi-bottom)*y,z))
for i in range(steps):
 for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
faces += [tuple(reversed(range(n))),tuple(steps*n+j for j in range(n))];mesh('Body sculpted outer shell',verts,faces,paint)
# Greenhouse panels: separate windows and painted roof, with thin structural pillars.
for side in [-1,1]:
 mesh('Glass front door',[(side*.79,.96,-1.0),(side*.69,1.41,-.57),(side*.7,1.46,.08),(side*.79,1.0,.13)],[(0,1,2,3)],glass)
 mesh('Glass rear door',[(side*.79,1,.21),(side*.7,1.46,.18),(side*.69,1.4,.73),(side*.78,1.02,1.27)],[(0,1,2,3)],glass)
 mesh('Glass quarter',[(side*.78,1.02,1.35),(side*.69,1.37,.8),(side*.75,1.06,1.65)],[(0,1,2)],glass)
 for pts in [[(side*.81,.94,-1.08),(side*.69,1.43,-.59)],[(side*.7,1.46,.14),(side*.8,.98,.17)],[(side*.69,1.42,.76),(side*.78,1.03,1.71)]]:tube('Body pillar',pts,.024,paint if pts[0][2]!=.14 else black)
 tube('Window surround',[(side*.8,.98,-1.04),(side*.8,1.01,.2),(side*.78,1.03,1.68)],.012,black)
 tube('Shoulder crease',[(side*.897,.86,-1.95),(side*.919,.89,-.85),(side*.918,.92,.7),(side*.893,.95,1.85)],.005,paint)
 for z in [-.99,.18,1.19]:tube('Door shut line',[(side*.91,.88,z),(side*.916,.69,z),(side*.905,.33,z)],.003,black)
 box('Side skirt',(side*.908,.265,0),(.06,.075,2.0),black)
 for z in [-.5,.75]:box('Door handle',(side*.919,.85,z),(.02,.026,.17),black,.01)
 box('Mirror stem',(side*.85,1.01,-.72),(.18,.025,.05),black)
 box('Mirror shell',(side*.967,1.055,-.69),(.17,.09,.23),black,.04)
 box('Mirror reflector',(side*.968,1.055,-.565),(.12,.052,.008),alloy,.01)
mesh('Glass windshield',[(-.79,.96,-1.07),(.79,.96,-1.07),(.69,1.43,-.6),(-.69,1.43,-.6)],[(0,1,2,3)],glass)
mesh('Body roof',[(-.69,1.43,-.61),(.69,1.43,-.61),(.71,1.49,.16),(.68,1.43,.78),(-.68,1.43,.78),(-.71,1.49,.16)],[(0,1,2,3,4,5)],black)
for side in [-1,1]:tube('Body roof rail',[(side*.69,1.43,-.61),(side*.715,1.49,.16),(side*.68,1.43,.78),(side*.77,1.04,1.88)],.023,paint)
mesh('Glass rear screen',[(-.68,1.43,.78),(.68,1.43,.78),(.76,1.04,1.88),(-.76,1.04,1.88)],[(0,1,2,3)],glass)
for side in [-1,1]:tube('Hood pressed line',[(side*.38,.79,-2.17),(side*.48,.89,-1.75),(side*.51,.945,-1.1)],.006,paint)
# Frontal: six-sided grille and segmented angular LED housings, never a flat full-width chrome rectangle.
shape=[(-.49,.86),(.49,.86),(.64,.78),(.52,.51),(-.52,.51),(-.64,.78)]
mesh('Grille recess',[(x,y,-2.356) for x,y in shape],[tuple(range(6))],black,False)
tube('Grille black surround',[(x,y,-2.37) for x,y in shape]+[(-.49,.86,-2.37)],.018,black)
for i in range(-7,8):
 x=i*.068;tube('Grille vertical blade',[(x,.54,-2.373),(x,.78,-2.373),(x*.94,.84,-2.373)],.007,black)
for side in [-1,1]:
 pts=[(side*.53,.855,-2.377),(side*.86,.79,-2.365),(side*.85,.70,-2.365),(side*.59,.735,-2.382)]
 mesh('Headlamp housing',pts,[(0,1,2,3)],black,False)
 tube('Headlight arrow DRL',[pts[0],pts[1],pts[2],pts[3]],.009,lamp)
 for shift in [.0,.12]:box('Headlight projector',(side*(.62+shift),.78,-2.397),(.075,.04,.018),alloy,.008)
 box('Bumper side intake',(side*.72,.41,-2.375),(.24,.15,.08),black,.035)
 for y in [.39,.44]:box('Intake vane',(side*.72,y,-2.395),(.19,.009,.014),black,.004)
box('Lower intake',(0,.36,-2.34),(1.13,.14,.035),black,.02)
box('Front splitter',(0,.245,-2.28),(1.66,.04,.13),black,.015)
# Liftback rear: C-shaped crystalline tail lamps, lower reflector and restrained lip.
for side in [-1,1]:
 pts=[(side*.4,.9,2.35),(side*.82,.88,2.27),(side*.84,.79,2.27),(side*.73,.73,2.32),(side*.52,.76,2.36)]
 tube('Brakelight C signature',pts,.018,tail)
 tube('Tail reverse light',[(side*.5,.845,2.36),(side*.76,.83,2.32)],.008,lamp)
box('Hatch lip',(0,1.015,2.12),(1.57,.026,.12),black,.012)
box('Rear diffuser',(0,.3,2.3),(1.57,.16,.13),black,.02)
box('Rear reflector',(0,.42,2.37),(1.45,.017,.014),tail,.004)
for x in [-.45,-.23,0,.23,.45]:box('Diffuser fin',(x,.26,2.36),(.018,.12,.17),black,.004)
for side in [-1,1]:box('RS exhaust surround',(side*.64,.3,2.39),(.29,.09,.045),alloy,.025);box('RS exhaust outlet',(side*.64,.3,2.42),(.24,.056,.012),black,.018)
# Four wheel roots. Rotor geometry is independent of fixed red brake calipers.
for side in [-1,1]:
 for axle,label in [(-1.39,'F'),(1.296,'R')]:
  root=bpy.data.objects.new('Wheel_'+label+('L' if side<0 else 'R'),None);bpy.context.collection.objects.link(root);root.location=coord((side*.785,.335,axle))
  def parent(o):
   bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=root;o.matrix_world=world;return o
  profile=[(-.105,.244),(-.115,.27),(-.11,.31),(-.085,.332),(-.04,.335),(.04,.335),(.085,.332),(.11,.31),(.115,.27),(.105,.244)]
  v=[];f=[]
  for i in range(48):
   a=i*math.tau/48
   for x,r in profile:v.append((side*.785+x,.335+math.cos(a)*r,axle+math.sin(a)*r))
  for i in range(48):
   for j in range(len(profile)-1):a=i*len(profile)+j;b=((i+1)%48)*len(profile)+j;f.append((a,b,b+1,a+1))
  parent(mesh('Tyre continuous sidewall',v,f,rubber))
  for radius,depth,mat in [(.245,.2,black),(.205,.018,disc),(.048,.225,alloy)]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=coord((side*.785,.335,axle)),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Wheel disc';o.data.materials.append(mat);parent(o)
  for k in range(5):
   for shift in [-.065,.065]:
    a=k*math.tau/5+shift;v=[]
    for r,b in [(.055,-.12),(.23,-.045),(.23,.045),(.055,.12)]:v.append((side*.901,.335+math.cos(a+b)*r,axle+math.sin(a+b)*r))
    parent(mesh('Diamond cut twin spoke',v,[(0,1,2,3)],alloy,False))
  box('Fixed brake caliper',(side*.86,.36,axle+.16),(.045,.17,.08),brake,.015)
# Sculpted cockpit; all names retain Cabin classification for driver-camera visibility.
box('Cabin dashboard',(0,.91,-.88),(1.44,.19,.36),trim,.065)
box('Cabin floating display',(0,1.1,-.79),(.38,.19,.025),black,.012)
box('Cabin centre console',(0,.55,-.05),(.26,.3,1.05),trim,.04)
for side in [-1,1]:
 for z in [.3,1.24]:
  box('Cabin sport seat',(side*.43,.45,z),(.5,.17,.52),seat,.07);box('Cabin sport backrest',(side*.43,.83,z+.28),(.48,.62,.16),seat,.065);box('Cabin headrest',(side*.43,1.21 if z<1 else 1.04,z+.22),(.27,.23,.13),seat,.04)
bpy.ops.mesh.primitive_torus_add(major_radius=.155,minor_radius=.015,major_segments=40,minor_segments=8,location=coord((-.39,1,-.58)),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='Cabin steering wheel';o.data.materials.append(trim)
box('Cabin steering hub',(-.39,1,-.58),(.16,.1,.04),trim,.025)
for side in [-1,1]:box('Cabin steering spoke',(-.39+side*.1,.99,-.58),(.12,.025,.035),alloy,.006)
# Text as vector mesh: legible branding and registration without photographic billboards.
def text(body,p,size):
 c=bpy.data.curves.new('Badge '+body,'FONT');c.body=body;c.size=size;c.align_x='CENTER';o=bpy.data.objects.new('Badge '+body,c);bpy.context.collection.objects.link(o);o.location=coord(p);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(alloy)
text('S K O D A',(0,.84,2.375),.068);text('OCTAVIA',(-.49,.65,2.37),.04);text('vRS',(.62,.65,2.36),.055)
box('Registration',(0,.61,2.38),(.52,.11,.018),alloy,.006);text('CLUB VRS',(0,.58,2.393),.065)
# Apply modifiers and curve conversion once, export editable .blend and optimized glTF.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));out=os.path.join(root,'dist/assets/highway');os.makedirs(out,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'artifacts','octavia-mk4-study.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'octavia-mk4.glb'),export_format='GLB',export_yup=True,export_apply=True)
print('OCTAVIA_ORIGINAL_GLB_READY')
