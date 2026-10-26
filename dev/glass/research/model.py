import sys, os
sys.path.insert(0, sys.argv[1]); from align import rgb
L=sys.argv[1]; S=2; M=40; W=700; H=54
def px(R,x,y): o=int(round(x*S))*3; r=R[int(round(y*S))]; return r[o:o+3]
lum=lambda c: .2126*c[0]+.7152*c[1]+.0722*c[2]
# 1. Tone curve at the centre, fine.
lut=[]
for f in sorted(os.listdir(L+'/lut'), key=lambda n:int(n[1:-4])):
    R,_,_=rgb(L+'/lut/'+f); v=int(f[1:-4]); lut.append((v, round(lum(px(R,M+W/2,M+H/2)),1)))
print('tone', lut)
# Fit out = a + b*in (least squares) and report residual.
n=len(lut); sx=sum(a for a,_ in lut); sy=sum(b for _,b in lut); sxx=sum(a*a for a,_ in lut); sxy=sum(a*b for a,b in lut)
b=(n*sxy-sx*sy)/(n*sxx-sx*sx); a=(sy-b*sx)/n
print('linear fit out = %.1f + %.3f*in, max residual %.1f' % (a,b,max(abs(y-(a+b*x)) for x,y in lut)))
inv=lambda v: max(0,min(255,(v-a)/b))
# 2. Vertical ramp: which source row each glass row shows, at the centre column (sampled row = inverse tone * total height).
R,_,_=rgb(L+'/vramp.png'); Ht=H+2*M
print('vramp centre column: y_in_bar -> source shift (pt)', [(y, round(inv(lum(px(R,M+W/2,M+y)))/255*Ht-(M+y),2)) for y in (0.5,1,1.5,2,3,4,5,6,8,10,13,16,20,27,34,38,41,44,46,48,49,50,51,51.5,52,52.5,53,53.5)])
# Same along the left cap's centre row with the horizontal ramp (ramp covers x 0..160pt).
R,_,_=rgb(L+'/hrampL.png')
print('hrampL centre row: x_in_bar -> source shift (pt)', [(x, round(inv(lum(px(R,M+x,M+H/2)))/255*160-(M+x),2)) for x in (0.5,1,1.5,2,3,4,5,6,8,10,13,16,20,27,34,45,60,80)])
