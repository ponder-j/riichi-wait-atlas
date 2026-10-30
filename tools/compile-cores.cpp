#include "shape-helpers.hpp"
#include <cassert>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>
using namespace std;
array<array<int,3>,55>melds;unordered_map<ShapeKey,uint64_t,KeyHash>cache;
int c[34];uint64_t target;bool limited,foundAtDepth,bestPair;int currentSize,bestSize;ShapeKey best,bestOrbit;vector<int>available;
uint64_t cachedWaits(bool pairProvided){auto key=shapeKey(c)|(ShapeKey(pairProvided)<<100);auto it=cache.find(key);if(it!=cache.end())return it->second;auto waits=shapeWaits(c,limited,pairProvided);cache.emplace(key,waits);return waits;}
void removeMelds(int remaining,int first,bool pairProvided){if(!remaining){if(cachedWaits(pairProvided)==target){foundAtDepth=true;auto key=shapeKey(c),orbit=canonicalCoreKey(c);if(currentSize<bestSize||(currentSize==bestSize&&(orbit<bestOrbit||(orbit==bestOrbit&&key<best)))){best=key;bestOrbit=orbit;bestSize=currentSize;bestPair=pairProvided;}}return;}for(int j=first;j<(int)available.size();j++){auto m=melds[available[j]];bool ok=m[0]==m[2]?c[m[0]]>=3:c[m[0]]&&c[m[1]]&&c[m[2]];if(!ok)continue;for(int t:m)c[t]--;removeMelds(remaining-1,j,pairProvided);for(int t:m)c[t]++;}}
uint16_t findCore(const uint8_t*r){fill(c,c+34,0);for(int j=0;j<13;j++)c[r[j]]++;target=0;for(int j=0;j<5;j++)target|=uint64_t(r[13+j])<<(j*8);available.clear();for(int j=0;j<55;j++){auto m=melds[j];if(m[0]==m[2]?c[m[0]]>=3:c[m[0]]&&c[m[1]]&&c[m[2]])available.push_back(j);}bestSize=13;best=shapeKey(c);bestOrbit=canonicalCoreKey(c);bestPair=false;
 for(int removed=3;removed>=1;removed--){currentSize=13-3*removed;foundAtDepth=false;removeMelds(removed,0,false);if(foundAtDepth)break;}
 // A two-tile meld-only fragment has at most two waits, so multiwait cores start at five tiles.
 for(int removed=2;removed>=0;removed--){currentSize=11-3*removed;if(currentSize>bestSize)continue;foundAtDepth=false;for(int p=0;p<34;p++)if(c[p]>=2){c[p]-=2;removeMelds(removed,0,true);c[p]+=2;}if(foundAtDepth)break;}
 int core[34];decodeShapeKey(best,core);uint16_t mask=bestPair?8192:0;for(int j=0;j<13;j++)if(core[r[j]]){mask|=1u<<j;core[r[j]]--;}return mask;
}
int main(){int k=0;for(int t=0;t<34;t++)melds[k++]={t,t,t};for(int s=0;s<3;s++)for(int j=0;j<7;j++)melds[k++]={s*9+j,s*9+j+1,s*9+j+2};for(bool mode:{true,false}){limited=mode;cache.clear();string dir=mode?"data/raw":"data/shape-raw";uint64_t total=0;for(int n=3;n<=13;n++){ifstream input(dir+"/"+to_string(n)+".bin",ios::binary);assert(input.good());ofstream output(dir+"/"+to_string(n)+".cores",ios::binary);uint8_t r[18];uint64_t count=0;while(input.read((char*)r,18)){auto mask=findCore(r);uint8_t b[2]={uint8_t(mask),uint8_t(mask>>8)};output.write((char*)b,2);count++;}total+=count;cerr<<(mode?"physical":"shape")<<" "<<n<<": "<<count<<" cores; cache "<<cache.size()<<endl;}cerr<<"processed "<<total<<" hands\n";}}
