import sys

import zlib, struct
def load(path):
    d=open(path,'rb').read();i=8;idat=b''
    while i<len(d):
        l=struct.unpack('>I',d[i:i+4])[0];t=d[i+4:i+8];c=d[i+8:i+8+l]
        if t==b'IHDR':w,h,bd,ct=struct.unpack('>IIBB',c[:10])
        if t==b'IDAT':idat+=c
        i+=12+l
    raw=zlib.decompress(idat);bpp=4 if ct==6 else 3;stride=w*bpp;rows=[];prev=bytearray(stride);p=0
    for r in range(h):
        f=raw[p];line=bytearray(raw[p+1:p+1+stride]);p+=1+stride
        for j in range(stride):
            a=line[j-bpp] if j>=bpp else 0;b=prev[j];c=prev[j-bpp] if j>=bpp else 0
            if f==1:line[j]=(line[j]+a)&255
            elif f==2:line[j]=(line[j]+b)&255
            elif f==3:line[j]=(line[j]+(a+b)//2)&255
            elif f==4:
                pp=a+b-c;pa=abs(pp-a);pb=abs(pp-b);pc=abs(pp-c);line[j]=(line[j]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
        rows.append(line);prev=line
    return rows,bpp,w,h

def rgb(path):
    """Loads a PNG as rows of RGB bytes, whatever its channel count."""
    R,bpp,w,h=load(path)
    if bpp==3: return R,w,h
    return [bytearray(b for i in range(w) for b in r[i*4:i*4+3]) for r in R],w,h
