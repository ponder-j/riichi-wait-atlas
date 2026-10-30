#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>
using U128=__uint128_t;
using namespace std;
constexpr uint32_t SUIT_MASK=(1u<<21)-1;
uint32_t pw[9];
int counts[34]={};
array<array<int,3>,55> melds;
vector<U128> wins;
uint32_t block(int start,int n){uint32_t x=0;for(int i=0;i<n;i++) x=x*5+counts[start+i];return x;}
U128 pack(uint32_t a,uint32_t b,uint32_t c,uint32_t h){return (U128(a)<<59)|(U128(b)<<38)|(U128(c)<<17)|h;}
array<uint32_t,4> unpack(U128 key){return {uint32_t(key>>59),uint32_t(key>>38)&SUIT_MASK,uint32_t(key>>17)&SUIT_MASK,uint32_t(key)&((1u<<17)-1)};}
void decode(U128 key,int* out){auto b=unpack(key);for(int s=0;s<4;s++){int n=s==3?7:9;for(int i=n-1;i>=0;i--){out[(s==3?27:s*9)+i]=b[s]%5;b[s]/=5;}}}
void generate(int depth,int first){
 if(depth==4){
  for(int p=0;p<34;p++)if(counts[p]<=2){counts[p]+=2;
   auto a=block(0,9), b=block(9,9), c=block(18,9);
   bool honorsSorted=counts[27]>=counts[28]&&counts[28]>=counts[29]&&counts[29]>=counts[30]&&counts[31]>=counts[32]&&counts[32]>=counts[33];
   if(a>=b && b>=c && honorsSorted) wins.push_back(pack(a,b,c,block(27,7)));
   counts[p]-=2;
  }return;
 }
 for(int j=first;j<55;j++){
  bool ok=true;for(int t:melds[j])if(++counts[t]>4)ok=false;
  if(ok)generate(depth+1,j);
  for(int t:melds[j])--counts[t];
 }
}
uint64_t symmetry(uint64_t mask,const array<uint32_t,4>& b){
 for(int i=0;i<3;i++)for(int j=i+1;j<3;j++)if(b[i]==b[j]){
  auto m=((mask>>(9*i))|(mask>>(9*j)))&511;
  mask|=(m<<(9*i))|(m<<(9*j));
 }
 uint32_t h=b[3];int honors[7];for(int j=6;j>=0;j--){honors[j]=h%5;h/=5;}
 for(int i=0;i<7;i++)for(int j=i+1;j<(i<4?4:7);j++)if(honors[i]==honors[j]){
  bool value=((mask>>(27+i))|(mask>>(27+j)))&1;
  if(value)mask|=(1ull<<(27+i))|(1ull<<(27+j));
 }return mask;
}
int main(int argc,char** argv){
 string dir=argc>1?argv[1]:"dist/data";filesystem::create_directories(dir);
 for(int i=0,v=1;i<9;i++,v*=5)pw[i]=v;
 int k=0;for(int t=0;t<34;t++)melds[k++]={t,t,t};for(int s=0;s<3;s++)for(int i=0;i<7;i++)melds[k++]={s*9+i,s*9+i+1,s*9+i+2};
 generate(0,0);cerr<<"winning decompositions: "<<wins.size()<<endl;
 sort(wins.begin(),wins.end());wins.erase(unique(wins.begin(),wins.end()),wins.end());cerr<<"unique canonical standard wins: "<<wins.size()<<endl;
 vector<U128> candidates;candidates.reserve(wins.size()*11);
 int c[34];
 for(auto key:wins){auto b=unpack(key);decode(key,c);
  for(int t=0;t<34;t++)if(c[t]){
   auto h=b;int oldSuit=t/9,newSuit=oldSuit;
   h[oldSuit]-=pw[(oldSuit==3?6:8)-t%9];
   array<pair<uint32_t,int>,3> ordered={{{h[0],0},{h[1],1},{h[2],2}}};
   sort(ordered.begin(),ordered.end(),[](auto a,auto b){return a.first>b.first || (a.first==b.first&&a.second<b.second);});
   for(int j=0;j<3;j++){h[j]=ordered[j].first;if(ordered[j].second==oldSuit)newSuit=j;}
   int wait=oldSuit==3?t:newSuit*9+t%9;
   if(t>=27){
    array<pair<int,int>,7> honors;for(int j=0;j<7;j++)honors[j]={c[27+j]-(t==27+j),27+j};
    auto cmp=[](auto a,auto b){return a.first>b.first||(a.first==b.first&&a.second<b.second);};
    sort(honors.begin(),honors.begin()+4,cmp);sort(honors.begin()+4,honors.end(),cmp);
    h[3]=0;for(int j=0;j<7;j++){h[3]=h[3]*5+honors[j].first;if(honors[j].second==t)wait=27+j;}
   }
   auto hand=pack(h[0],h[1],h[2],h[3]);candidates.push_back((hand<<6)|wait);
  }
 }
 wins.clear();wins.shrink_to_fit();cerr<<"candidate hand/wait edges: "<<candidates.size()<<endl;
 sort(candidates.begin(),candidates.end());
 array<ofstream,14> outs;array<uint64_t,14> totals{},labeled{};
 for(int n=3;n<=13;n++)outs[n].open(dir+"/"+to_string(n)+".bin",ios::binary);
 uint64_t uniqueStandard=0,chiitoiAdded=0;
 auto emit=[&](U128 key,uint64_t mask){auto b=unpack(key);mask=symmetry(mask,b);decode(key,c);
  int pairs=0,singles=0,single=-1;bool other=false;for(int t=0;t<34;t++){if(c[t]==2)pairs++;else if(c[t]==1){singles++;single=t;}else if(c[t])other=true;}
  if(!other&&pairs==6&&singles==1){auto before=mask;mask|=1ull<<single;if(before!=mask)chiitoiAdded++;}
  int n=__builtin_popcountll(mask);if(n<3)return;assert(n<=13);
  // Portable fixed record: 13 sorted tile indices + five little-endian wait-mask bytes.
  uint8_t record[18];int j=0;for(int t=0;t<34;t++)for(int z=0;z<c[t];z++)record[j++]=t;assert(j==13);
  for(int q=0;q<5;q++)record[13+q]=(mask>>(8*q))&255;
  outs[n].write((char*)record,18);totals[n]++;
  int orbit=6;if(b[0]==b[1]&&b[1]==b[2])orbit=1;else if(b[0]==b[1]||b[1]==b[2]||b[0]==b[2])orbit=3;
  auto honorOrbit=[&](int start,int length){int v=length==4?24:6;int frequency[5]={};for(int j=start;j<start+length;j++)frequency[c[j]]++;for(int f:frequency)for(int k=2;k<=f;k++)v/=k;return v;};
  orbit*=honorOrbit(27,4)*honorOrbit(31,3);labeled[n]+=orbit;
 };
 for(size_t i=0;i<candidates.size();){auto key=candidates[i]>>6;uint64_t mask=0;do {mask|=1ull<<uint8_t(candidates[i]&63);i++;}while(i<candidates.size()&&(candidates[i]>>6)==key);uniqueStandard++;emit(key,mask);}
 // Thirteen orphans is the only special-only hand with at least three waits.
 uint64_t kokushi=0;fill(counts,counts+34,0);for(int t:{0,8,9,17,18,26,27,28,29,30,31,32,33}){counts[t]=1;kokushi|=1ull<<t;}
 emit(pack(block(0,9),block(9,9),block(18,9),block(27,7)),kokushi);
 ofstream meta(dir+"/enumeration.json");meta<<"{\n  \"recordBytes\":18,\n  \"standardTenpaiCanonical\":"<<uniqueStandard<<",\n  \"chiitoitsuNewWaits\":"<<chiitoiAdded<<",\n  \"counts\":{";
 for(int n=3;n<=13;n++){if(n>3)meta<<",";meta<<"\""<<n<<"\":"<<totals[n];cerr<<n<<" waits: "<<totals[n]<<" canonical / "<<labeled[n]<<" labeled"<<endl;}meta<<"},\n  \"labeledCounts\":{";for(int n=3;n<=13;n++){if(n>3)meta<<",";meta<<"\""<<n<<"\":"<<labeled[n];}meta<<"}\n}\n";
 cerr<<"standard tenpai canonical: "<<uniqueStandard<<"; seven-pairs new edges: "<<chiitoiAdded<<endl;
}
