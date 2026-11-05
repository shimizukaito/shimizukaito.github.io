import pcbnew as p
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=p.LoadBoard(str(root/'EmerFlux-11ch-driver.kicad_pcb'))
mm=p.FromMM
def pos(x,y):return p.VECTOR2I(mm(x),mm(y))
def text(t,x,y,layer=p.F_SilkS):
 z=p.PCB_TEXT(b);z.SetText(t);z.SetPosition(pos(x,y));z.SetTextSize(pos(1,1));z.SetTextThickness(mm(.15));z.SetLayer(layer)
 if layer==p.B_SilkS:z.SetMirrored(True)
 b.Add(z)
for fp in b.GetFootprints():
 ref=fp.GetReference()
 if ref.startswith('H'):
  for pad in fp.Pads():pad.SetLocalClearance(mm(1.5))
 if ref in ['J13','F1']:
  for g in fp.GraphicalItems():
   if isinstance(g,p.PCB_SHAPE) and g.GetLayer()==p.F_SilkS:g.SetLayer(p.F_Fab)
   if hasattr(g,"GetText") and g.GetText()=='+12V   GND':fp.Remove(g)
 if ref=='C1':
  for g in fp.GraphicalItems():
   if hasattr(g,"GetText") and g.GetText()=='+':g.SetPosition(pos(64,38))
 if ref in ['U1','U2']:
  ox=p.ToMM(fp.GetPosition().x)
  for yy in [20,23.6]:
   z=p.PCB_SHAPE(b);z.SetShape(p.SHAPE_T_SEGMENT);z.SetStart(pos(ox+.5,yy));z.SetEnd(pos(ox+20.8,yy));z.SetWidth(mm(.15));z.SetLayer(p.F_SilkS);b.Add(z)
 # Save exact, reference-specific footprint library to avoid missing-library diagnostics.
 name='Audit_'+ref
 fp.SetFPID(p.LIB_ID('EmerFlux',name))
lib=root/'EmerFlux.pretty';lib.mkdir(exist_ok=True)
for fp in b.GetFootprints():p.PCB_IO_MGR.FindPlugin(p.PCB_IO_MGR.KICAD_SEXP).FootprintSave(str(lib),fp)
(root/'fp-lib-table').write_text('(fp_lib_table (version 7) (lib (name "EmerFlux") (type "KiCad") (uri "${KIPRJMOD}/EmerFlux.pretty") (options "") (descr "Audited EmerFlux through-hole footprints")))\n')
text('+12V',85,41.5);text('GND',90.08,41.5);text('-',73.2,43)
text('1:GND  2-12:PWM0-10',48,46)
text('EmerFlux Rev.A1  12V  TEST ONLY',48,47.8,p.B_SilkS)
text('+12V',85,41.5,p.B_SilkS);text('GND',90.08,41.5,p.B_SilkS)
p.SaveBoard(str(root/'EmerFlux-11ch-driver.kicad_pcb'),b)
(root/'EmerFlux-11ch-driver.kicad_dru').write_text('''(version 1)
(rule "JLCPCB 2oz clearance" (constraint clearance (min 0.2mm)))
(rule "JLCPCB 2oz track" (constraint track_width (min 0.2mm)))
(rule "JLCPCB 2oz annular ring" (constraint annular_width (min 0.254mm)))
(rule "JLCPCB holes" (constraint hole_size (min 0.5mm)))
(rule "JLCPCB edge" (constraint edge_clearance (min 0.3mm)))
(rule "JLCPCB hole clearance" (constraint hole_clearance (min 0.3mm)))
(rule "JLCPCB hole spacing" (constraint hole_to_hole (min 0.45mm)))
(rule "JLCPCB silk" (constraint silk_clearance (min 0.15mm)))
(rule "JLCPCB silk height" (constraint text_height (min 1mm)))
(rule "JLCPCB silk thickness" (constraint text_thickness (min 0.15mm)))
''')
