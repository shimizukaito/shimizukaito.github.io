from pathlib import Path
import re,uuid
root=Path(__file__).resolve().parents[1]
s=(root/'EmerFlux-11ch-driver.before-audit.kicad_pcb').read_text()
def blocks(s,kind):
 pattern='('+kind+' '
 start=0
 while (start:=s.find(pattern,start))>=0:
  depth=0;quote=False;esc=False
  for end in range(start,len(s)):
   c=s[end]
   if quote:
    if esc:esc=False
    elif c=='\\':esc=True
    elif c=='"':quote=False
   elif c=='"':quote=True
   elif c=='(':depth+=1
   elif c==')':
    depth-=1
    if depth==0:break
  yield s[start:end+1];start=end+1

def txt(t,x,y,size=1):return f'(fp_text user "{t}" (at {x} {y}) (layer "F.SilkS") (effects (font (size {size} {size}) (thickness 0.15))))'
def pad(n,x,y,net,name,size=2,drill=1):
 shape='rect' if n=='1' else 'circle'
 nn=f'(net {net} "{name}")' if net else ''
 return f'(pad "{n}" thru_hole {shape} (at {x} {y}) (size {size} {size}) (drill {drill}) (layers "*.Cu" "*.Mask") {nn})'
for fp in list(blocks(s,'footprint')):
 ref=re.search(r'\(property "Reference" "([^"]+)"',fp)[1];new=fp
 if ref in ['U1','U2']:
  idx=0 if ref=='U1' else 6;count=6 if idx==0 else 5;x=17.62 if idx==0 else 65
  new=f'''(footprint "EmerFlux:TBD62783APG_DIP18_TopView" (layer "F.Cu") (at {x} 25.62)
  (property "Reference" "{ref}" (at 10.16 -3.81) (layer "F.SilkS") (effects (font (size 1.2 1.2) (thickness 0.2))))
  (property "Value" "TBD62783APG" (at 10.16 3) (layer "F.Fab") hide)
  (fp_rect (start -1.27 -7.01) (end 21.59 -0.61) (stroke (width 0.15) (type default)) (fill none) (layer "F.Fab"))
  (fp_line (start -1.5 -7.01) (end -1.5 -5.31) (stroke (width 0.2) (type default)) (layer "F.SilkS"))
  (fp_arc (start -1.5 -5.31) (mid 0 -3.81) (end -1.5 -2.31) (stroke (width 0.2) (type default)) (layer "F.SilkS"))
  (fp_line (start -1.5 -2.31) (end -1.5 -0.61) (stroke (width 0.2) (type default)) (layer "F.SilkS"))
  {txt('1',-2,0,1.0)}
'''
  for i in range(9):
   n=i+1;net=4+idx+i if i<count else 1;name=f'PWM{idx+i}' if i<count else 'GND'
   if n==9:net=3;name='+12V_PROTECTED'
   new+=pad(str(n),i*2.54,0,net,name)+'\n'
   n=18-i;net=15+idx+i if i<count else 0;name=f'PUMP{idx+i}_PLUS' if i<count else ''
   if n==10:net=1;name='GND'
   new+=pad(str(n),i*2.54,-7.62,net,name)+'\n'
  new+=')'
 elif ref.startswith('H'):
  new=new.replace('thru_hole','np_thru_hole')
 elif ref=='J13':
  new=new.replace('(at 85 42 0)','(at 85 45 0)').replace('(start -3.79 -6.65) (end 8.87 6.65)','(start -3.79 -9.31) (end 8.87 3.99)')
  new=new.replace('(at 0 -3 0)','(at 2.54 -5 0)').replace('"12V IN"','"+12V   GND"').replace('(at 2.54 -7.7)','(at 2.54 -11.1)')
  new=new[:-1]+pad('1',0,-7.62,2,'+12V_RAW',3.4,1.4)+pad('2',5.08,-7.62,1,'GND',3.4,1.4)+')'
 elif ref.startswith('J') and int(ref[1:])<=11:
  n=int(ref[1:])-1
  new=new.replace('(start -2 -2.5) (end 4.5 2.5)','(start -2.45 -3.5) (end 4.95 2.25)')
  new=new.replace('(size 2.3 2.3)','(size 2 2)')
  new=re.sub(r'\(fp_text user "P\d+ \+"[^\n]+',txt(f'{n} + -',1.25,4,1.0),new)
  new=new.replace('(at 0 -3 0)','(at 1.25 -4.7 0)')
 elif ref=='J12':new=new.replace('(size 2.3 2.3)','(size 2 2)')
 elif ref in ['C2','C3']:
  new=new.replace('(at -1.5 0)','(at -1.27 0)').replace('(at 1.5 0)','(at 1.27 0)').replace('(size 2.3 2.3)','(size 1.8 1.8)')
 s=s.replace(fp,new)
# Drop original tracks. Rebuild logical routing for correctly handed DIP footprints.
for b in list(blocks(s,'segment')):s=s.replace(b,'')
tracks=[]
def path(points,net,width,layer='F.Cu'):
 for a,b in zip(points,points[1:]):tracks.append(f'(segment (start {a[0]} {a[1]}) (end {b[0]} {b[1]}) (width {width}) (layer "{layer}") (net {net}) (uuid "{uuid.uuid4()}"))')
for n in range(11):
 x=17.62+n*2.54 if n<6 else 65+(n-6)*2.54
 outx=8+n*8.2
 path([(x,18),(x,17),(outx,8.5),(outx,6)],15+n,0.8)
 hx=36.54+n*2.54
 path([(hx,43),(hx,34),(x,29),(x,25.62)],4+n,0.3,'B.Cu')
# Power branch goes below inputs on front, signals remain on back.
path([(85,45),(85,37.38),(80.1,33)],2,2)
path([(75,33),(72,36),(37.94,36),(37.94,25.62)],3,2)
path([(72,36),(72,28),(85.32,28),(85.32,25.62)],3,2)
path([(66.25,43),(66.25,36)],3,1.2)
path([(2.73,31),(2.73,36),(37.94,36)],3,0.8)
path([(87.73,31),(85.32,31),(85.32,28)],3,0.8)
# ground plane pad connections use solid connection to remove thermal bottlenecks.
s=s.replace('(connect_pads (clearance 0.3))','(connect_pads yes (clearance 0.3))')
s=s.rstrip()[:-1]+'\n'+'\n'.join(tracks)+'\n)\n'
# Normalize fp text without effects, legacy minimal properties are parsed by KiCad on import.
(root/'EmerFlux-11ch-driver.kicad_pcb').write_text(s)
