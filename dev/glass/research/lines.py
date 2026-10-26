import sys, math
sys.path.insert(0, sys.argv[1]); from align import rgb
L=sys.argv[1]; S=2; M=40; W=700; H=54
lum=lambda r,o: .2126*r[o]+.7152*r[o+1]+.0722*r[o+2]
def prof_col(R,xpt):  # vertical profile across the bar at x (pt), device px rows
    o=int(xpt*S)*3; return [(y/S-M, lum(R[y],o)) for y in range((M-20)*S,(M+H+20)*S)]
def prof_row(R,ypt):
    r=R[int(ypt*S)]; return [(x/S-M, lum(r,x*3)) for x in range((M-20)*S,(M+120)*S)]
def stats(p, lo_ref=20, inside=lambda t: True):
    # centroid and sigma of the excess over the local floor, only inside the bar
    pts=[(t,v) for t,v in p if inside(t)]
    floor=sorted(v for _,v in pts)[len(pts)//10]
    ex=[(t,max(0,v-floor)) for t,v in pts]; s=sum(e for _,e in ex)
    if s<1: return None
    c=sum(t*e for t,e in ex)/s; sd=math.sqrt(sum((t-c)**2*e for t,e in ex)/s)
    pk=max(ex,key=lambda q:q[1])
    return round(c,2), round(sd,2), round(pk[0],1), round(pk[1],1), round(floor,1)
print('horizontal lines (source y from bar top): displayed centroid, sigma, peak pos, peak excess, floor  [column at bar centre]')
for v in (-12,-8,-5,-3,-1,0,1,2,3,4,6,8,11,15,20,27):
    R,_,_=rgb(f'{L}/ln/h{v}.png')
    print(f'  src {v:>4}: ', stats(prof_col(R,M+W/2), inside=lambda t: 0<=t<=H))
print('vertical lines (source x from bar left): [row at bar centre]')
for v in (-12,-8,-5,-3,-1,0,1,2,3,4,6,8,11,15,20,27):
    R,_,_=rgb(f'{L}/ln/v{v}.png')
    print(f'  src {v:>4}: ', stats(prof_row(R,M+H/2), inside=lambda t: 0<=t<=W))
R,_,_=rgb(f'{L}/ln/dot.png')
print('dot: row', stats(prof_row(R,M+H/2)) , )
r=[(x/S-M-W/2, lum(R[int((M+H/2)*S)],x*3)) for x in range(int((M+W/2-20)*S),int((M+W/2+20)*S))]
print('dot row profile', [round(v,1) for _,v in r[::2]])
# Edge rim: device-pixel profile at the top edge (centre column) and left cap (centre row) for black/white/grey fields.
for name in ('black','white','gray-128'):
    R,_,_=rgb(f'{L}/{name}.png')
    col=[round(v) for _,v in prof_col(R,M+W/2)][18*S:26*S]; rowl=[round(v) for _,v in prof_row(R,M+H/2)][18*S:26*S]
    colb=[round(v) for _,v in prof_col(R,M+W/2)][(20+H-6)*S:(20+H+2)*S]
    print(f'{name}: top edge px -2..+6pt {col} | bottom edge -6..+2pt {colb} | left edge {rowl}')
