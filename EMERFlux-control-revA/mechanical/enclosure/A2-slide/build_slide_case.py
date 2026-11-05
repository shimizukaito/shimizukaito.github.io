import sys,json
from pathlib import Path
sys.path.insert(0,'/Applications/FreeCAD.app/Contents/Resources/lib')
import FreeCAD as A,Part,MeshPart,Mesh
r=Path(__file__).resolve().parent;V=A.Vector
B=lambda x,y,z,w,d,h:Part.makeBox(w,d,h,V(x,y,z))
W,D,H,T=130,125,50,2.4
# PCB dimensions from Rev.D and Akizuki official drawing.
boards=[('Driver',15,18,100,50),('PCA',29,82,72,33)]
base=B(0,0,0,W,D,H).cut(B(T,T,T,W,D-2*T,H)) # right side open

def rail(x,y,length,width):
 # Each rail only overlaps 0.8mm of board edge. Lateral allowance 0.3mm per side.
 sh=B(x,y-2.3,2.3,length,2,11.7)
 sh=sh.fuse(B(x,y-.3,9.4,length,1.1,1))
 sh=sh.fuse(B(x,y-.3,12.6,length,1.1,1.4))
 sh=sh.fuse(B(x,y+width+.3,2.3,length,2,11.7))
 sh=sh.fuse(B(x,y+width-.8,9.4,length,1.1,1))
 sh=sh.fuse(B(x,y+width-.8,12.6,length,1.1,1.4))
 return sh
for name,x,y,w,d in boards:
 base=base.fuse(rail(x-.4,y,w+.4,d))
 # End wall of each slot stops PCB without touching components.
 base=base.fuse(B(x-2.4,y-2.3,2.3,2,d+4.6,10.2))
# Relief at J13 body near rear edge, including insertion path and lateral play.
base=base.cut(B(94,67,12.5,36,1.3,2))
# Lid guides: grooves in front/rear wall, interrupted by open cable notches.
base=base.cut(B(2.4,1.2,46.7,129,1.3,3))
base=base.cut(B(2.4,122.5,46.7,129,1.3,3))
for x in [15,50,85]:base=base.cut(B(x,-1,28,30,5,23))
base=base.cut(B(53,122,28,24,5,23))
for y in range(18,108,7):base=base.cut(B(-1,y,16,5,3,20))
for x,y in [(30,9),(65,9),(100,9),(65,118)]:
 for off in [-2,2]:base=base.cut(B(x-2,y+off-1,-1,4,2,5))
# Strain relief for power cable near right edge, in free gap between boards.
for y in [72,78]:base=base.cut(B(113,y-1,-1,4,2,5))
# Blind key socket in floor; not a threaded joint.
base=base.cut(B(118.7,73.2,.8,6.6,3.6,3))
base=base.removeSplitter()
# Sliding top panel and right end wall form a single print.
cap=B(2.7,1.5,47,129.7,122,2.4).fuse(B(130,0,0,2.4,125,49.4))
cap=cap.cut(B(129,52,28,5,18,17))
for y in range(18,108,7):
 if not 46<y<73:cap=cap.cut(B(129,y,16,5,3,20))
# Stiff fins stop each PCB moving toward insertion opening; 0.3mm axial play.
cap=cap.fuse(B(115.3,40,10.4,17.1,2.4,38))
cap=cap.fuse(B(101.3,95,10.4,31.1,2.4,38))
for x in range(20,112,7):
 for y in [22,80]:
  if y==80 and x>=99:continue # do not cut the PCA stop fin attachment
  if y==22 and x>=113:continue
  cap=cap.cut(B(x,y,46.5,3,16,4))
cap=cap.cut(B(118.7,73.2,46.5,6.6,3.6,4)).removeSplitter()
key=B(119,73.5,1,6,3,48.4).fuse(B(117,73.5,49.4,10,3,5)).removeSplitter()
# Fit coupons use exactly the rail cross-section for each PCB width.
def coupon(width):
 s=B(0,0,0,20,width+6,2.4).fuse(rail(0,3,20,width))
 return s.removeSplitter()
shapes={'base':base,'sliding_cap':cap,'locking_key':key,'driver_slot_test':coupon(50),'pca_slot_test':coupon(33)}
assert base.common(cap).Volume<1e-6,'base-cap collision'
assert base.common(key).Volume<1e-6 and cap.common(key).Volume<1e-6
checks={}
for name,x,y,w,d in boards:
 pcb=B(x,y,10.4,w,d,1.6)
 assert base.common(pcb).Volume<1e-6 and cap.common(pcb).Volume<1e-6
 # All components must stay 0.8mm away from the board edge for groove lips.
 envelope=B(x+.85,y+.85,12,w-1.7,d-1.7,30)
 assert base.common(envelope).Volume<1e-6 and cap.common(envelope).Volume<1e-6
 for dx in [0,1,5,15,40,80,130]:
  moved=pcb.copy();moved.translate(V(dx,0,0));env=envelope.copy();env.translate(V(dx,0,0))
  assert base.common(moved).Volume<1e-6 and base.common(env).Volume<1e-6
 assert base.common(B(x,y,10.4,w+130,d,1.6)).Volume<1e-6
 checks[name]='nominal PCB and inset component envelope clear at 7 slide positions'
for dx in [0,.1,1,5,15,40,80,130]:
 s=cap.copy();s.translate(V(dx,0,0));assert base.common(s).Volume<1e-6
 for name,x,y,w,d in boards:
  assert s.common(B(x,y,10.4,w,d,1.6)).Volume<1e-6
  assert s.common(B(x+.85,y+.85,12,w-1.7,d-1.7,30)).Volume<1e-6
# Validate and export, orient cap outer top face on bed; key broad side on bed.
doc=A.newDocument('EmerFluxSlideA2');report={}
for name,shape in shapes.items():
 assert shape.isValid() and len(shape.Solids)==1,(name,'invalid')
 ob=doc.addObject('PartDesign::Feature',name);ob.Shape=shape
 printable=shape.copy()
 if name in ['sliding_cap','locking_key']:printable.rotate(V(0,0,0),V(1,0,0),180 if name=='sliding_cap' else 90)
 bb=printable.BoundBox;printable.translate(V(-bb.XMin,-bb.YMin,-bb.ZMin))
 mesh=MeshPart.meshFromShape(Shape=printable,LinearDeflection=.08,AngularDeflection=.15,Relative=False)
 file=r/'print'/f'EmerFlux-case-A2-{name}.stl';mesh.write(str(file));loaded=Mesh.Mesh(str(file));assert loaded.isSolid()
 report[name]={'valid_solid':True,'closed_stl':True,'print_dimensions_mm':[printable.BoundBox.XLength,printable.BoundBox.YLength,printable.BoundBox.ZLength]}
Part.makeCompound([base,cap,key]).exportStep(str(r/'EmerFlux-case-A2-assembly.step'))
for name,x,y,w,d in boards:
 ob=doc.addObject('PartDesign::Feature',name+'_PCB_reference');ob.Shape=B(x,y,10.4,w,d,1.6)
doc.recompute();doc.saveAs(str(r/'EmerFlux-case-A2.FCStd'))
report['fit_checks']=checks;report['cap_slide']='clear at 8 positions, locking key removed';report['slot']={'height_mm':2.2,'nominal_board_thickness_mm':1.6,'side_clearance_each_mm':.3,'edge_overlap_mm':.8};report['physical_tests']='not performed; slot fit, wire bends, retention and heat require real tests'
(r/'validation.json').write_text(json.dumps(report,indent=2));verts,faces=base.tessellate(.2);(r/'preview_mesh.json').write_text(json.dumps({'vertices':[[v.x,v.y,v.z] for v in verts],'faces':faces}));print(json.dumps(report,indent=2))

verts,faces=cap.tessellate(.2);(r/'cap_mesh.json').write_text(json.dumps({'vertices':[[v.x,v.y,v.z] for v in verts],'faces':faces}))
