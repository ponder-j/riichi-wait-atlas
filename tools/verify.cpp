// Independent verification: try each of 34 draws with a recursive pair/meld solver.
#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <set>
#include <vector>
using namespace std;
int c[34];
bool meldable(int start=0){int t=start;while(t<34&&!c[t])t++;if(t==34)return true;
 if(c[t]>=3){c[t]-=3;bool ok=meldable(t);c[t]+=3;if(ok)return true;}
 if(t<27&&t%9<=6&&c[t+1]&&c[t+2]){c[t]--;c[t+1]--;c[t+2]--;bool ok=meldable(t);c[t]++;c[t+1]++;c[t+2]++;if(ok)return true;}
 return false;
}
bool winning(){int pairs=0,orphans=0;bool onlyPairs=true,onlyOrphans=true;
 for(int t=0;t<34;t++){if(c[t]==2)pairs++;else if(c[t])onlyPairs=false;if(t>=27||t%9==0||t%9==8){if(c[t])orphans++;}else if(c[t])onlyOrphans=false;}
 if(onlyPairs&&pairs==7)return true;if(onlyOrphans&&orphans==13)return true;
 for(int p=0;p<34;p++)if(c[p]>=2){c[p]-=2;bool ok=meldable();c[p]+=2;if(ok)return true;}return false;
}
uint64_t waits(){uint64_t m=0;for(int t=0;t<34;t++)if(c[t]<4){c[t]++;if(winning())m|=1ull<<t;c[t]--;}return m;}
array<int,34> handKey(){array<int,34> k;copy(c,c+34,k.begin());return k;}
int main(int argc,char**argv){string dir=argc>1?argv[1]:"data/raw";uint64_t checked=0;set<array<int,34>> pure;array<uint64_t,14> totals{};
 for(int n=3;n<=13;n++){ifstream f(dir+"/"+to_string(n)+".bin",ios::binary);assert(f.good());uint8_t r[18];array<int,34> last{};bool first=true;
  while(f.read((char*)r,18)){fill(c,c+34,0);for(int i=0;i<13;i++){assert(r[i]<34);if(i)assert(r[i]>=r[i-1]);c[r[i]]++;}for(int t=0;t<34;t++)assert(c[t]<=4);
   uint64_t m=0;for(int j=0;j<5;j++)m|=uint64_t(r[13+j])<<(8*j);assert(__builtin_popcountll(m)==n);assert(waits()==m);
   array<array<int,9>,3> suits;for(int s=0;s<3;s++)copy(c+s*9,c+s*9+9,suits[s].begin());assert(suits[0]>=suits[1]&&suits[1]>=suits[2]);
   assert(c[27]>=c[28]&&c[28]>=c[29]&&c[29]>=c[30]);assert(c[31]>=c[32]&&c[32]>=c[33]);
   auto key=handKey();assert(first||key>last);first=false;last=key;
   bool pureHand=true;for(int t=9;t<34;t++)if(c[t])pureHand=false;if(pureHand)pure.insert(key);
   checked++;totals[n]++;
  }assert(f.eof());cerr<<"verified "<<n<<": "<<totals[n]<<endl;
 }
 // Exhaustive independent completeness check over all 93,600 one-suit 13-tile hands.
 uint64_t allPure=0,pureTenpai=0;auto enumerate=[&](auto&& self,int t,int left)->void{if(t==9){if(left)return;allPure++;auto m=waits();if(__builtin_popcountll(m)>=3){pureTenpai++;assert(pure.count(handKey()));}return;}for(int q=0;q<=min(4,left);q++){c[t]=q;self(self,t+1,left-q);}c[t]=0;};fill(c,c+34,0);enumerate(enumerate,0,13);assert(pureTenpai==pure.size());
 cerr<<"PASS: all "<<checked<<" records, every legal draw; "<<allPure<<" pure-suit hands exhaustively checked, "<<pureTenpai<<" retained.\n";
 ofstream report("reports/verification.json");report<<"{\"ok\":true,\"records\":"<<checked<<",\"drawTests\":"<<checked*34<<",\"pureSuitHands\":"<<allPure<<",\"pureSuitRetained\":"<<pureTenpai<<"}\n";
}
