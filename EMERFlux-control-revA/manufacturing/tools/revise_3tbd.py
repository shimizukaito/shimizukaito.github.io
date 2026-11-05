import pcbnew as p
from pathlib import Path
r=Path(__file__).resolve().parents[1];b=p.LoadBoard(str(r/'archive-2TBD/EmerFlux-11ch-driver.kicad_pcb'));mm=p.FromMM
def pt(x,y):return p.VECTOR2I(mm(x),mm(y))
fps={f.GetReference():f for f in b.GetFootprints()};plug=p.PCB_IO_MGR.FindPlugin(p.PCB_IO_MGR.KICAD_SEXP)
u=plug.FootprintLoad(str(r/'EmerFlux.pretty'),'Audit_U1',False);u.SetReference('U3');b.Add(u);fps['U3']=u
c=plug.FootprintLoad(str(r/'EmerFlux.pretty'),'Audit_C3',False);c.SetReference('C4');b.Add(c);fps['C4']=c
for ref,x,base,count in [('U1',9,0,4),('U2',39,4,4),('U3',69,8,3)]:
 f=fps[ref];f.SetPosition(pt(x,25.62));f.SetFPID(p.LIB_ID('EmerFlux','Audit_'+ref))
 for pad in f.Pads():
  n=int(pad.GetNumber());net=''
  if n==9:net='+12V_PROTECTED'
  elif n==10:net='GND'
  elif n<=8:net=f'PWM{base+n-1}' if n<=count else 'GND'
  elif n>=11:
   i=18-n
   net=f'PUMP{base+i}_PLUS' if i<count else ''
  pad.SetNet(b.FindNet(net) if net else b.FindNet(0))
for ref,x,y in [('C2',33,29),('C3',63,29),('C4',93,31)]:
 f=fps[ref];f.SetPosition(pt(x,y));f.SetFPID(p.LIB_ID('EmerFlux','Audit_'+ref))
 for pad in f.Pads():pad.SetNet(b.FindNet('+12V_PROTECTED' if pad.GetNumber()=='1' else 'GND'))
for g in list(b.GetDrawings()):
 if isinstance(g,p.PCB_SHAPE) and g.GetLayer()==p.F_SilkS:b.RemoveNative(g)
 elif hasattr(g,'GetText'):
  s=g.GetText().replace('TBD62783APG x2','TBD62783APG x3').replace('Rev.A1','Rev.B').replace('Rev.A','Rev.B');g.SetText(s)
for x in [9,39,69]:
 for y in [20,23.6]:
  g=p.PCB_SHAPE(b);g.SetShape(p.SHAPE_T_SEGMENT);g.SetStart(pt(x+.5,y));g.SetEnd(pt(x+20.8,y));g.SetWidth(mm(.15));g.SetLayer(p.F_SilkS);b.Add(g)
# Remove old tracks using native API before creating replacement routing.
for t in list(b.GetTracks()):b.RemoveNative(t)
def path(points,net,w,layer=p.F_Cu):
 for a,c in zip(points,points[1:]):
  t=p.PCB_TRACK(b);t.SetStart(pt(*a));t.SetEnd(pt(*c));t.SetWidth(mm(w));t.SetLayer(layer);t.SetNet(b.FindNet(net));b.Add(t)
for n in range(11):
 group=min(n//4,2);i=n-4*group;x=[9,39,69][group]+2.54*i;ox=8+8.2*n;hx=36.54+2.54*n
 path([(x,18),(x,17),(ox,8.5),(ox,6)],f'PUMP{n}_PLUS',.8)
 path([(hx,43),(hx,40),(x,29),(x,25.62)],f'PWM{n}',.3,p.B_Cu)
path([(85,45),(85,37.38),(80.1,33)],'+12V_RAW',2)
path([(75,33),(72,36),(29.32,36),(29.32,25.62)],'+12V_PROTECTED',2)
path([(59.32,36),(59.32,25.62)],'+12V_PROTECTED',2)
path([(75,33),(75,30),(89.32,30),(89.32,25.62)],'+12V_PROTECTED',2)
path([(66.25,43),(66.25,36)],'+12V_PROTECTED',1.2)
for vx,cx,cy in [(29.32,31.73,29),(59.32,61.73,29),(89.32,91.73,31)]:path([(vx,25.62),(vx,cy),(cx,cy)],'+12V_PROTECTED',.8)
for f in b.GetFootprints():plug.FootprintSave(str(r/'EmerFlux.pretty'),f)
p.SaveBoard(str(r/'EmerFlux-11ch-driver.kicad_pcb'),b)
