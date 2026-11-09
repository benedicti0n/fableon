# Preview-only reference renderer. This is NOT the production Fableon renderer.
# Requires Pillow and ffmpeg on PATH. All artwork is loaded from this ZIP's assets.
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math, subprocess, sys
PARTS = Path(__file__).parent/'assets'/'premium-bird-v1'/'parts'
PREV = Path(__file__).parent/'previews'
(PREV/'frames').mkdir(parents=True,exist_ok=True)
def put_part(canvas,name,at,pivot,angle=0,scale=1):
 src=Image.open(PARTS/(name+'.png')).convert('RGBA')
 if scale!=1:
  src=src.resize((int(src.width*scale),int(src.height*scale)),Image.Resampling.LANCZOS)
  pivot=(pivot[0]*scale,pivot[1]*scale)
 side=round(max(src.size)*2.9)+20
 buf=Image.new('RGBA',(side,side),(0,0,0,0));mid=(side//2,side//2)
 buf.alpha_composite(src,(int(mid[0]-pivot[0]),int(mid[1]-pivot[1])))
 if angle:
  buf=buf.rotate(-angle,Image.Resampling.BICUBIC,expand=False)
 canvas.alpha_composite(buf,(int(at[0]-mid[0]),int(at[1]-mid[1])))

def smooth(t):return (3*t*t-2*t*t*t)
def lerp(a,b,t):return a+(b-a)*t
# x/y correspond to the new local reconstructed body's top-left, exact source-space pivot settings documented below.
# global rig has parent body, child head, wings, legs. Preview uses a single equivalent set of scene-space joints.
def paint_bird(canvas, frame=47, fixed_pose=None):
 if fixed_pose is not None:
  sample={'neutral':47,'raised':3,'lowered':6,'approach':24,'perched':47}
  frame=sample[fixed_pose]
 if frame<30:
  t=smooth(frame/30)
  x=lerp(100,300,t); y=lerp(70,225,t)
 else:
  x=300;y=225+ (7*math.sin((frame-30)/17*math.pi)*math.exp(-(frame-30)/10))
 # local joints in body coords; stable art registration
 body=(x,y)
 head=(x+151,y-34)
 wing=(x+145,y+65)
 farwing=(x+163,y+51)
 tail=(x+77,y+114)
 # Keep the toe contact height stable after the first landing frame.
 contactCompensation=(y-225) if frame>=30 else 0
 legL=(x+142,y+145-contactCompensation)
 legR=(x+193,y+145-contactCompensation)
 eye=(head[0]+140,head[1]+56)
 beak=(head[0]+175,head[1]+65)
 if frame<16:
  cycle=math.sin(frame*2*math.pi/8)
  nearAng=35+57*cycle
  farAng=20-32*cycle
 elif frame<30:
  t=smooth((frame-16)/14)
  nearAng=lerp(30,96,t)
  farAng=lerp(20,58,t)
 elif frame<=38:
  t=smooth((frame-30)/8)
  nearAng=lerp(96,8,t)
  farAng=lerp(58,12,t)
 else:
  nearAng=8;farAng=12
 put_part(canvas,'tail',tail,(118,18),angle=12,scale=.9)
 put_part(canvas,'wing-far',farwing,(147,25),angle=farAng,scale=.94)
 put_part(canvas,'leg-left',legL,(53,13),angle=0,scale=.63)
 put_part(canvas,'leg-right',legR,(53,12),angle=0,scale=.64)
 # intact wing-free body always renders, so moving wings do not reveal duplicate feathers.
 put_part(canvas,'body',(x,y),(0,0),angle=0,scale=1)
 put_part(canvas,'wing-near',wing,(148,23),angle=nearAng,scale=1)
 # the clean head is eye/beak free; those two are separate composites
 put_part(canvas,'head',head,(0,0),angle=0,scale=1)
 put_part(canvas,'beak',beak,(8,22),angle=0,scale=.72)
 put_part(canvas,'eye',eye,(22,22),angle=0,scale=.62)
 return (x,y)

def background(size=(960,540)):
 out=Image.new('RGBA',size,(26,39,42,255));d=ImageDraw.Draw(out,'RGBA')
 # branch registration and shadow: diagnostic only, explicitly not new premium forest art
 y=442
 d.line([(130,y+8),(912,y+8)],fill=(19,22,22,130),width=24)
 d.line([(130,y),(915,y-9)],fill=(113,84,53,255),width=21)
 d.line([(145,y-5),(902,y-14)],fill=(150,117,75,255),width=6)
 return out

selected={'wings-raised':3,'wings-lowered':6,'approach':24,'contact':30,'perched':47}
for name,frame in selected.items():
    c=background(); paint_bird(c,frame); c.convert('RGB').save(PREV/f'{name}.png')
thumb=(576,324)
sheet=Image.new('RGB',(3*thumb[0]+4*20,2*(thumb[1]+56)+30),(13,17,19))
d=ImageDraw.Draw(sheet)
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',26)
except OSError: font=ImageFont.load_default()
for i,(name,frame) in enumerate(selected.items()):
    x=20+(i%3)*(thumb[0]+20);y=20+(i//3)*(thumb[1]+56)
    im=Image.open(PREV/f'{name}.png').resize(thumb,Image.Resampling.LANCZOS)
    sheet.paste(im,(x,y));d.text((x,y+330),f'{name} - frame {frame}',font=font,fill=(238,237,224))
sheet.save(PREV/'pose-contact-sheet.png')
for frame in range(48):
    c=background();paint_bird(c,frame)
    c.convert('RGB').save(PREV/'frames'/f'frame-{frame:03}.png')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','24','-i',str(PREV/'frames'/'frame-%03d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p',str(PREV/'registration-motion-test.mp4')],check=True)
print('Generated',PREV/'registration-motion-test.mp4')
