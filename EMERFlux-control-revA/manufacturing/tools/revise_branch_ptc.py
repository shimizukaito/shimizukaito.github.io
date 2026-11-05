import pcbnew as p
from pathlib import Path
r=Path(__file__).resolve().parents[1]; b=p.LoadBoard(str(r/'archive-RevB-singlePTC/EmerFlux-11ch-driver.kicad_pcb'));mm=p.FromMM
def pt(x,y):return p.VECTOR2I(mm(x),mm(y))
fps={f.GetReference():f for f in b.GetFootprints()};plug=p.PCB_IO_MGR.FindPlugin(p.PCB_IO_MGR.KICAD_SEXP)
for i in range(1,4): b.Add(p.NETINFO_ITEM(b,f'+12V_U{i}'))
for t in list(b.GetTracks()):
 if t.GetNetname().startswith('+12V') or t.GetNetname() in ['PWM0','PWM1','PWM2','PWM3']:b.RemoveNative(t)
for i in range(1,4):
 ref=f'F{i}'
 if i>1:
  f=plug.FootprintLoad(str(r/'EmerFlux.pretty'),'Audit_F1',False);b.Add(f);fps[ref]=f
 f=fps[ref];f.SetReference(ref);f.SetValue('MF-R185_1.85A_30V');f.SetFPID(p.LIB_ID('EmerFlux','Audit_'+ref));f.SetPosition(pt(24.22+30*(i-1),33));f.Reference().SetPosition(pt(22+30*(i-1),30))
 for pad in f.Pads():pad.SetNet(b.FindNet(f'+12V_U{i}' if pad.GetNumber()=='1' else '+12V_RAW'))
 for pad in fps[f'U{i}'].Pads():
  if pad.GetNumber()=='9':pad.SetNet(b.FindNet(f'+12V_U{i}'))
 for pad in fps[f'C{i+1}'].Pads():
  if pad.GetNumber()=='1':pad.SetNet(b.FindNet(f'+12V_U{i}'))
for pad in fps['C1'].Pads():
 if pad.GetNumber()=='1':pad.SetNet(b.FindNet('+12V_RAW'))
fps['C4'].SetPosition(pt(93,28.5))
def path(points,net,w,layer=p.F_Cu):
 for a,c in zip(points,points[1:]):
  t=p.PCB_TRACK(b);t.SetStart(pt(*a));t.SetEnd(pt(*c));t.SetWidth(mm(w));t.SetLayer(layer);t.SetNet(b.FindNet(net));b.Add(t)
for n in range(4):
 x=9+2.54*n;hx=36.54+2.54*n
 path([(x,25.62),(x,37-n*.7),(hx,41-n*.7),(hx,43)],f'PWM{n}',.3,p.B_Cu)
path([(29.32,36),(85,36)],'+12V_RAW',2)
path([(85,45),(85,37.38),(85,36)],'+12V_RAW',2)
path([(66.25,43),(66.25,36)],'+12V_RAW',1.2)
for i in range(1,4):
 x=29.32+30*(i-1);net=f'+12V_U{i}'
 path(([(x,36),(x,33)] if i<3 else [(85,36),(87,35.5),(x,33)]),'+12V_RAW',2)
 path([(x-5.1,33),(x-5.1,30),(x,30),(x,25.62)],net,1.2)
 cy=28.5 if i==3 else 29
 path([(x,25.62),(x,cy),(x+2.41,cy)],net,.8)
for g in b.GetDrawings():
 if hasattr(g,'GetText'):g.SetText(g.GetText().replace('Rev.B','Rev.C'))
for f in b.GetFootprints():plug.FootprintSave(str(r/'EmerFlux.pretty'),f)
p.ZONE_FILLER(b).Fill(b.Zones());p.SaveBoard(str(r/'EmerFlux-11ch-driver.kicad_pcb'),b)
