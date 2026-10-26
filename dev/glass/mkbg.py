# Pattern backgrounds at 2x for a 781x135pt window with the bar at (40,40) 701x55.
import zlib, struct, sys
out=sys.argv[1]; W,H=1562,270
def save(name, f):
    raw=bytearray()
    for y in range(H):
        raw.append(0)
        for x in range(W): raw.extend(f(x/2,y/2))
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(f'{out}/{name}.png','wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',W,H,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw),6))+chunk(b'IEND',b''))
g=lambda v:(v,v,v)
save('vstripes', lambda x,y: g(255) if (x-40)%20<2 else g(0))
save('hstripes', lambda x,y: g(255) if (y-40)%10<2 else g(0))
save('grays', lambda x,y: g(round(min(10,max(0,int((x-40)/(701/11))))*25.5)) if 40<=x<741 else g(0))
for v in (1,4,8,15,27): save(f'h{v}', lambda x,y,v=v: g(255) if 40+v-0.5<=y<40+v+0.5 else g(0))
for v in (1,4,8,15): save(f'v{v}', lambda x,y,v=v: g(255) if 40+v-0.5<=x<40+v+0.5 else g(0))
print('ok')
