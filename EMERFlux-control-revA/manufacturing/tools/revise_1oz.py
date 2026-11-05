import pcbnew as p
from pathlib import Path
r=Path(__file__).resolve().parents[1];b=p.LoadBoard(str(r/'archive-RevC-2oz/EmerFlux-11ch-driver.kicad_pcb'));mm=p.FromMM
def pt(x,y):return p.VECTOR2I(mm(x),mm(y))
for t in list(b.GetTracks()):
 if t.GetNetname()=='+12V_RAW':b.RemoveNative(t)
 elif t.GetNetname().startswith('+12V_U') and t.GetWidth()==mm(1.2):t.SetWidth(mm(2))
def path(points,net,w):
 for a,c in zip(points,points[1:]):
  t=p.PCB_TRACK(b);t.SetStart(pt(*a));t.SetEnd(pt(*c));t.SetWidth(mm(w));t.SetLayer(p.F_Cu);t.SetNet(b.FindNet(net));b.Add(t)
path([(29.32,37.5),(85,37.5)],'+12V_RAW',4)
path([(85,45),(85,37.38)],'+12V_RAW',4)
path([(66.25,43),(66.25,37.5)],'+12V_RAW',1.2)
for x in [29.32,59.32]:path([(x,37.5),(x,33)],'+12V_RAW',2)
path([(85,37.38),(87,35.5),(89.32,33)],'+12V_RAW',2)
for g in b.GetDrawings():
 if hasattr(g,'GetText'):g.SetText(g.GetText().replace('Rev.C','Rev.D').replace('12V  TEST ONLY','12V  1oz TEST'))
p.ZONE_FILLER(b).Fill(b.Zones());p.SaveBoard(str(r/'EmerFlux-11ch-driver.kicad_pcb'),b)
