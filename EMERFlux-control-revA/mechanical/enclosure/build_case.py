import sys,json,math
from pathlib import Path
sys.path.insert(0,'/Applications/FreeCAD.app/Contents/Resources/lib')
import FreeCAD as A,Part,MeshPart,Mesh
r=Path(__file__).resolve().parent;out=r/'print';out.mkdir(exist_ok=True)
V=A.Vector;W,D,H,T=130,125,50,2.4
B=lambda x,y,z,w,d,h:Part.makeBox(w,d,h,V(x,y,z))
C=lambda x,y,z,rad,h:Part.makeCylinder(rad,h,V(x,y,z))
driver=[(18.5,43),(111.5,43),(18.5,64),(111.5,64)]
pca=[(32,85),(98,85),(32,112),(98,112)]
lidholes=[(7,7),(123,7),(7,118),(123,118)]
base=B(0,0,0,W,D,H).cut(B(T,T,T,W-2*T,D-2*T,H))
for x,y in lidholes:
 base=base.fuse(B(x-4.8,y-4.8,0,9.6,9.6,H))
 base=base.cut(C(x,y,H-14,1.35,15))
for x,y in driver+pca:
 base=base.fuse(C(x,y,2.3,2.75,8.1));base=base.cut(C(x,y,3,1.35,8))
# Cable notches open at the top: insert preterminated wires with lid removed.
for x in [15,50,85]:base=base.cut(B(x,-1,28,30,5,23))
base=base.cut(B(W-3,52,28,5,18,23))
base=base.cut(B(53,D-3,28,24,5,23))
# Ventilation: 3mm bridges across vertical openings.
for y in range(18,108,7):
 base=base.cut(B(-1,y,14,5,3,22))
 if not 46<y<73:base=base.cut(B(W-3,y,14,5,3,22))
# Paired slots for 2.5mm cable ties; external feet provide underside clearance.
for x,y,rot in [(30,9,False),(65,9,False),(100,9,False),(120,60,True),(65,117,False)]:
 for off in [-2,2]:
  if rot:base=base.cut(B(x+off-1,y-2,-1,2,4,5))
  else:base=base.cut(B(x-2,y+off-1,-1,4,2,5))
base=base.removeSplitter()
lid=B(0,0,0,W,D,T)
for x,y in lidholes:lid=lid.cut(C(x,y,-1,1.7,5))
for x in range(20,112,7):
 for y in [22,80]:lid=lid.cut(B(x,y,-1,3,25,5))
lid=lid.removeSplitter()
# Footprint fit gauge: both boards' supports, no walls. Hole matching before full print.
gauge=B(0,0,0,W,D,1.2)
for x,y in driver+pca:gauge=gauge.cut(C(x,y,-1,1.6,4))
# Small screw-fit coupon, no electronics needed; test before printing housing.
coupon=B(0,0,0,44,14,8)
for i,d in enumerate([2.6,2.7,2.8,3.4]):coupon=coupon.cut(C(7+10*i,7,1,d/2,8))
doc=A.newDocument('EmerFluxCase');parts={};reports={}
for name,shape in [('base',base),('lid',lid),('fit_gauge',gauge),('screw_coupon',coupon)]:
 assert shape.isValid() and len(shape.Solids)==1,(name,'invalid')
 ob=doc.addObject('PartDesign::Feature',name);ob.Shape=shape;parts[name]=ob
 mesh=MeshPart.meshFromShape(Shape=shape,LinearDeflection=.08,AngularDeflection=.15,Relative=False)
 mesh.write(str(out/f'EmerFlux-case-A1-{name}.stl'))
 reread=Mesh.Mesh(str(out/f'EmerFlux-case-A1-{name}.stl'))
 assert reread.isSolid(),name
 reports[name]={'valid_solid':True,'stl_closed':True,'facets':reread.CountFacets,'bounds_mm':[shape.BoundBox.XLength,shape.BoundBox.YLength,shape.BoundBox.ZLength]}
# STEP manufacturing parts separate in one file, lid translated away to avoid overlap.
lidplaced=lid.copy();lidplaced.translate(V(145,0,0));Part.makeCompound([base,lidplaced]).exportStep(str(r/'EmerFlux-case-A1.step'))
# Assembly proxies for collision checking and inspection; not printed.
for name,(x,y,w,d) in {'Driver_PCB':(15,18,100,50),'PCA_PCB':(29,82,72,33)}.items():
 board=B(x,y,10.4,w,d,1.6)
 for hx,hy in (driver if name=='Driver_PCB' else pca):board=board.cut(C(hx,hy,10,1.6,3))
 assert base.common(board).Volume<1e-6
 ob=doc.addObject('PartDesign::Feature',name);ob.Shape=board
parts['lid'].Placement.Base=V(0,0,H)
# Check supported lid mating and nominal component envelopes (not exact component models).
assert base.common(parts['lid'].Shape).Volume<1e-6
for box in [B(15,18,12,100,50,30),B(29,82,12,72,33,30)]:assert base.common(box).Volume<1e-6
reports['clearance']={'board_bottom_z':10.4,'board_top_z':12,'lid_underside_z':50,'available_above_pcb_mm':38,'assumed_component_and_connector_height_mm':30,'nominal_top_margin_mm':8,'physical_fit_test_required':True}
doc.recompute();doc.saveAs(str(r/'EmerFlux-case-A1.FCStd'))
(r/'validation.json').write_text(json.dumps(reports,indent=2))
# Save tessellated geometry for a neutral isometric preview renderer.
verts,faces=base.tessellate(.25)
(r/'preview_mesh.json').write_text(json.dumps({'vertices':[[v.x,v.y,v.z] for v in verts],'faces':faces}))
print(json.dumps(reports,indent=2))
