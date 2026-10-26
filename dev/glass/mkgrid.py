import zlib, struct, sys
out=sys.argv[1]; W,H=1562,270
def save(name,f):
    raw=bytearray()
    for y in range(H):
        raw.append(0)
        for x in range(W): raw.extend(f(x/2,y/2))
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(f'{out}/{name}.png','wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',W,H,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw),6))+chunk(b'IEND',b''))
g=lambda v:(v,v,v)
save('grid', lambda x,y: g(255) if ((x-40)%8<1 or (y-40)%8<1) else g(0))
save('vedge', lambda x,y: g(255) if x>=390.5 else g(0))      # step at the bar's horizontal centre
save('hedge', lambda x,y: g(255) if y>=67.5 else g(0))       # step at the bar's vertical centre
save('checker', lambda x,y: g(255) if (int((x-40)//4)+int((y-40)//4))%2 else g(0))
print('ok')
