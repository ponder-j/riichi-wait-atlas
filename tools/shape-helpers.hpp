#pragma once
#include <algorithm>
#include <array>
#include <cstdint>
#include <unordered_map>
using ShapeKey=__uint128_t;
struct KeyHash {size_t operator()(ShapeKey x)const {uint64_t a=x,b=x>>64;a^=b+0x9e3779b97f4a7c15ull+(a<<6)+(a>>2);return a;}};
inline uint32_t shapeBlock(const int*c,int start,int length,int base=5){uint32_t v=0;for(int j=0;j<length;j++)v=v*base+c[start+j];return v;}
inline ShapeKey shapeKey(const int*c){return (ShapeKey(shapeBlock(c,0,9))<<59)|(ShapeKey(shapeBlock(c,9,9))<<38)|(ShapeKey(shapeBlock(c,18,9))<<17)|shapeBlock(c,27,7);}
inline void decodeShapeKey(ShapeKey key,int*c){uint32_t b[4]={uint32_t(key>>59),uint32_t(key>>38)&2097151,uint32_t(key>>17)&2097151,uint32_t(key)&131071};for(int s=0;s<4;s++)for(int j=(s==3?6:8);j>=0;j--){c[(s==3?27:s*9)+j]=b[s]%5;b[s]/=5;}}
inline bool splitShapeMelds(int*c,int first=0){int t=first;while(t<34&&!c[t])t++;if(t==34)return true;if(c[t]>=3){c[t]-=3;bool ok=splitShapeMelds(c,t);c[t]+=3;if(ok)return true;}if(t<27&&t%9<=6&&c[t+1]&&c[t+2]){c[t]--;c[t+1]--;c[t+2]--;bool ok=splitShapeMelds(c,t);c[t]++;c[t+1]++;c[t+2]++;if(ok)return true;}return false;}
inline bool isShapeWin(int*c,int total){
 if(total==14){int pairs=0,orphans=0;bool pairsOnly=true,orphansOnly=true;for(int t=0;t<34;t++){if(c[t]==2)pairs++;else if(c[t])pairsOnly=false;if(t>=27||t%9==0||t%9==8){if(c[t])orphans++;}else if(c[t])orphansOnly=false;}if(pairsOnly&&pairs==7)return true;if(orphansOnly&&orphans==13)return true;}
 for(int p=0;p<34;p++)if(c[p]>=2){c[p]-=2;bool ok=splitShapeMelds(c);c[p]+=2;if(ok)return true;}return false;
}
inline uint64_t shapeWaits(int*c,bool limitCopies,bool pairProvided=false){int total=0;for(int t=0;t<34;t++)total+=c[t];uint64_t mask=0;for(int t=0;t<34;t++)if(!limitCopies||c[t]<4){c[t]++;if(pairProvided?splitShapeMelds(c):isShapeWin(c,total+1))mask|=1ull<<t;c[t]--;}return mask;}
inline ShapeKey canonicalCoreKey(const int*c){std::array<uint32_t,3>s={shapeBlock(c,0,9),shapeBlock(c,9,9),shapeBlock(c,18,9)};std::sort(s.begin(),s.end(),std::greater<uint32_t>());int h[7];std::copy(c+27,c+34,h);std::sort(h,h+4,std::greater<int>());std::sort(h+4,h+7,std::greater<int>());uint32_t honors=0;for(int v:h)honors=honors*5+v;return (ShapeKey(s[0])<<59)|(ShapeKey(s[1])<<38)|(ShapeKey(s[2])<<17)|honors;}
