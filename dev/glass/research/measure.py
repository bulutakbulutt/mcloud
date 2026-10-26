import sys, math
sys.path.insert(0, sys.argv[1]); from align import rgb
D=sys.argv[2]
lum=lambda R,x,y: (lambda o: .2126*R[y][o]+.7152*R[y][o+1]+.0722*R[y][o+2])(x*3)
def rise(prof):  # 10-90% width in pt of a monotonic-ish step profile [(pos_pt, v)]
    lo=min(v for _,v in prof); hi=max(v for _,v in prof)
    a=lo+.1*(hi-lo); b=lo+.9*(hi-lo)
    x10=next(p for p,v in prof if v>=a); x90=next(p for p,v in prof if v>=b)
    return round(x90-x10,2), round(lo), round(hi)
for who in ('nativekey','ours'):
    R,w,h=rgb(f'{D}/{who}/vedge.png')
    yc=int((40+27)*2)
    prof=[(x/2,lum(R,x,yc)) for x in range(int(330*2),int(450*2))]
    r=rise(prof)
    R2,_,_=rgb(f'{D}/{who}/hedge.png')
    prof2=[(y/2,lum(R2,int(390*2),y)) for y in range(int(41*2),int(93*2))]
    r2=rise(prof2)
    G_,_,_=rgb(f'{D}/{who}/grid.png')
    vals=[lum(G_,x,yc) for x in range(int(300*2),int(500*2))]
    gm=(max(vals)-min(vals))
    C,_,_=rgb(f'{D}/{who}/checker.png')
    cv=[lum(C,x,yc) for x in range(int(300*2),int(500*2))]
    print(f'{who:7s} vertical edge 10-90%: {r[0]}pt (σ≈{r[0]/2.563:.2f}pt) range {r[1]}-{r[2]} | horizontal edge: {r2[0]}pt | 8pt grid ripple: {gm:.1f} | 4pt checker ripple: {max(cv)-min(cv):.1f}')
