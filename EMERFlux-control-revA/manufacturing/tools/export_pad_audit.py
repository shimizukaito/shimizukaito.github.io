import pcbnew as p,json,hashlib
from pathlib import Path
r=Path(__file__).resolve().parents[1];src=r/'EmerFlux-11ch-driver.kicad_pcb';b=p.LoadBoard(str(src));out=[]
for f in b.GetFootprints():
 for a in f.Pads():out.append(dict(ref=f.GetReference(),pin=a.GetNumber(),x=p.ToMM(a.GetPosition().x),y=p.ToMM(a.GetPosition().y),hole=p.ToMM(a.GetDrillSize().x),net=a.GetNetname()))
(r/'jlcpcb/evidence/pcb-pads.json').write_text(json.dumps(out,indent=2))
(r/'jlcpcb/evidence/final-pcb-sha256.txt').write_text(hashlib.sha256(src.read_bytes()).hexdigest()+'\n')
print('Pads',len(out))
