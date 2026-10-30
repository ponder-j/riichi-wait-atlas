"""Package every enumerated hand, CSV downloads and the public-domain tile assets."""
import csv, gzip, hashlib, io, json, pathlib, zipfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
raw = ROOT / 'data/raw'
public = ROOT / 'public'
meta = json.loads((raw / 'enumeration.json').read_text())
names = [f'{s}{n}' for s in ['Man', 'Pin', 'Sou'] for n in range(1, 10)] + ['Ton','Nan','Shaa','Pei','Haku','Hatsu','Chun']

def notation(tiles):
    return ''.join(''.join(str(t % 9 + 1) for t in tiles if t // 9 == s) + 'mpsz'[s] for s in range(4) if any(t // 9 == s for t in tiles))

allcsv = zipfile.ZipFile(public / 'downloads/all-hands-csv.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9)
checksums = {}
for n in range(3, 14):
    data = (raw / f'{n}.bin').read_bytes()
    assert len(data) == meta['counts'][str(n)] * 18
    checksums[str(n)] = hashlib.sha256(data).hexdigest()
    (public / 'data' / f'{n}.bin.gz').write_bytes(gzip.compress(data, compresslevel=9, mtime=0))
    text = io.StringIO(newline='')
    writer = csv.writer(text)
    writer.writerow(['id','wait_types','hand','waits','remaining_max','suit_count','honor_tiles'])
    for i in range(0, len(data), 18):
        hand = list(data[i:i+13])
        mask = int.from_bytes(data[i+13:i+18], 'little')
        waits = [t for t in range(34) if mask & (1 << t)]
        writer.writerow([f'{n}-{i//18+1:06d}', n, notation(hand), notation(waits), sum(4-hand.count(t) for t in waits), len(set(t//9 for t in hand if t<27)), sum(t>=27 for t in hand)])
    encoded = ('\ufeff' + text.getvalue()).encode('utf-8')
    allcsv.writestr(f'{n}-waits.csv', encoded)
    with zipfile.ZipFile(public / 'downloads' / f'{n}-waits-csv.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr(f'{n}-waits.csv', encoded)
allcsv.writestr('README.txt', '门清13张；每种牌至多4枚；恰好n种听牌；万筒索全部6种整体置换合并，东南西北全部24种置换合并，白发中全部6种置换合并；不合并数字镜像。m=万,p=筒,s=索,z=字（1东2南3西4北5白6发7中）。remaining_max=只扣手牌的理论剩余张数。形状听牌，包含标准和牌、七对子、国士无双；不计牌河、振听及具体役种限制。完整口径和复现方式见网站。')
allcsv.close()
with zipfile.ZipFile(public / 'downloads/mahjong-tiles-svg.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted((public/'assets/tiles').iterdir()):
        z.write(p, p.name)
meta.update({'total': sum(meta['counts'].values()), 'sha256': checksums, 'tiles': names, 'verified': json.loads((ROOT/'reports/verification.json').read_text()), 'generatedDate': '2026-10-31'})
(ROOT/'src/meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n')
(public/'data/manifest.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'total':meta['total'], 'compressedBytes':sum(p.stat().st_size for p in (public/'data').glob('*.gz'))}))
