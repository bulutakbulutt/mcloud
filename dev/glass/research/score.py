# score.py <dir> <ref.png> <cand.png>...: mean abs error per region against Music's real bar.
import sys
sys.path.insert(0, sys.argv[1]); from align import rgb
R,w,h=rgb(sys.argv[2])
def err(C, region):
    x0,y0,x1,y1=region; e=n=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,3):
            o=x*3; e+=sum(abs(R[y][o+k]-C[y][o+k]) for k in range(3)); n+=3
    return e/n
regs={'bar':(80,80,1482,190),'top8':(130,80,1430,96),'bottom8':(130,174,1430,190),'leftcap':(80,80,140,190),'mid':(900,100,1200,170),'cardgap':(300,100,420,170),'outside':(0,0,1562,70)}
for p in sys.argv[3:]:
    C,_,_=rgb(p)
    print(p.split('/')[-1].ljust(22),' '.join(f'{k}={err(C,r):5.1f}' for k,r in regs.items()))
