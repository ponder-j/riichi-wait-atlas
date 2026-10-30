#include "shape-helpers.hpp"
#include <cassert>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>
using namespace std;
int c[34]={};array<array<int,3>,55>melds;vector<ShapeKey>wins;
ShapeKey packWin(){return (ShapeKey(shapeBlock(c,0,9,6))<<67)|(ShapeKey(shapeBlock(c,9,9,6))<<43)|(ShapeKey(shapeBlock(c,18,9,6))<<19)|shapeBlock(c,27,7,6);}
void decodeWin(ShapeKey k){uint32_t b[4]={uint32_t(k>>67),uint32_t(k>>43)&16777215,uint32_t(k>>19)&16777215,uint32_t(k)&524287};for(int s=0;s<4;s++)for(int j=(s==3?6:8);j>=0;j--){c[(s==3?27:s*9)+j]=b[s]%6;b[s]/=6;}}
bool ordered(){return shapeBlock(c,0,9,6)>=shapeBlock(c,9,9,6)&&shapeBlock(c,9,9,6)>=shapeBlock(c,18,9,6)&&c[27]>=c[28]&&c[28]>=c[29]&&c[29]>=c[30]&&c[31]>=c[32]&&c[32]>=c[33];}
void generate(int depth,int first){if(depth==4){for(int p=0;p<34;p++)if(c[p]<=3){c[p]+=2;int fives=0;for(int v:c)fives+=v==5;if(fives<=1&&ordered())wins.push_back(packWin());c[p]-=2;}return;}for(int j=first;j<55;j++){bool ok=true;for(int t:melds[j])if(++c[t]>5)ok=false;if(ok)generate(depth+1,j);for(int t:melds[j])--c[t];}}
pair<ShapeKey,int> canonicalCandidate(int draw){array<pair<uint32_t,int>,3>s={{{shapeBlock(c,0,9),0},{shapeBlock(c,9,9),1},{shapeBlock(c,18,9),2}}};sort(s.begin(),s.end(),[](auto a,auto b){return a.first>b.first||(a.first==b.first&&a.second<b.second);});int newDraw=draw;for(int j=0;j<3;j++)if(draw<27&&s[j].second==draw/9)newDraw=j*9+draw%9;array<pair<int,int>,7>h;for(int j=0;j<7;j++)h[j]={c[27+j],27+j};auto cmp=[](auto a,auto b){return a.first>b.first||(a.first==b.first&&a.second<b.second);};sort(h.begin(),h.begin()+4,cmp);sort(h.begin()+4,h.end(),cmp);uint32_t honors=0;for(int j=0;j<7;j++){honors=honors*5+h[j].first;if(h[j].second==draw)newDraw=27+j;}return {(ShapeKey(s[0].first)<<59)|(ShapeKey(s[1].first)<<38)|(ShapeKey(s[2].first)<<17)|honors,newDraw};}
int main(int argc,char**argv){string dir=argc>1?argv[1]:"data/shape-raw";filesystem::create_directories(dir);int k=0;for(int t=0;t<34;t++)melds[k++]={t,t,t};for(int s=0;s<3;s++)for(int j=0;j<7;j++)melds[k++]={s*9+j,s*9+j+1,s*9+j+2};generate(0,0);sort(wins.begin(),wins.end());wins.erase(unique(wins.begin(),wins.end()),wins.end());cerr<<"canonical wins including one fifth copy: "<<wins.size()<<endl;
 vector<ShapeKey>edges;edges.reserve(wins.size()*10);for(auto win:wins){decodeWin(win);int fifth=-1;for(int t=0;t<34;t++)if(c[t]==5)fifth=t;for(int t=0;t<34;t++)if(c[t]&&(fifth<0||fifth==t)){c[t]--;auto candidate=canonicalCandidate(t);edges.push_back((candidate.first<<6)|candidate.second);c[t]++;}}wins.clear();wins.shrink_to_fit();sort(edges.begin(),edges.end());cerr<<"candidate edges: "<<edges.size()<<endl;
 array<ofstream,14>outs;array<uint64_t,14>totals{};for(int n=3;n<=13;n++)outs[n].open(dir+"/"+to_string(n)+".bin",ios::binary);
 auto emit=[&](ShapeKey key,uint64_t mask){decodeShapeKey(key,c);uint32_t suits[3]={shapeBlock(c,0,9),shapeBlock(c,9,9),shapeBlock(c,18,9)};for(int i=0;i<3;i++)for(int j=i+1;j<3;j++)if(suits[i]==suits[j]){uint64_t m=((mask>>(i*9))|(mask>>(j*9)))&511;mask|=(m<<(i*9))|(m<<(j*9));}for(int i=27;i<34;i++)for(int j=i+1;j<(i<31?31:34);j++)if(c[i]==c[j]&&((mask>>i|mask>>j)&1))mask|=(1ull<<i)|(1ull<<j);
  int pairs=0,singles=0,single=-1;bool other=false;for(int t=0;t<34;t++){if(c[t]==2)pairs++;else if(c[t]==1){singles++;single=t;}else if(c[t])other=true;}if(!other&&pairs==6&&singles==1)mask|=1ull<<single;
  int n=__builtin_popcountll(mask);if(n<3)return;assert(n<=13);uint8_t r[18];int j=0;for(int t=0;t<34;t++)for(int q=0;q<c[t];q++)r[j++]=t;assert(j==13);for(int q=0;q<5;q++)r[13+q]=(mask>>(8*q))&255;outs[n].write((char*)r,18);totals[n]++;
 };
 for(size_t i=0;i<edges.size();){auto key=edges[i]>>6;uint64_t mask=0;do{mask|=1ull<<uint8_t(edges[i]&63);i++;}while(i<edges.size()&&(edges[i]>>6)==key);emit(key,mask);}
 fill(c,c+34,0);uint64_t kokushi=0;for(int t:{0,8,9,17,18,26,27,28,29,30,31,32,33}){c[t]=1;kokushi|=1ull<<t;}emit(shapeKey(c),kokushi);
 ofstream meta(dir+"/enumeration.json");meta<<"{\"recordBytes\":18,\"counts\":{";for(int n=3;n<=13;n++){if(n>3)meta<<",";meta<<"\""<<n<<"\":"<<totals[n];cerr<<n<<" theoretical waits: "<<totals[n]<<endl;}meta<<"}}\n";
}
