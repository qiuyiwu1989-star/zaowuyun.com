# 造物云 DAM · 统一向量底座设计

> 一句话:**把 DAM 的真相源从「业务表」迁到「对象存储」——COS 里的每一张图,不管来自哪个桶、哪条管线、哪个产品,都被同一套 CLIP 向量底座索引,按「库(lib)」分面检索。** 往 COS 丢图 = 自动可被搜到。
>
> 关联:[[dam-zaowuyun-data-location]] · 上层规划见 `DAM产品规划.md`
> 起草:2026-06-25

---

## 一、现状诊断:不是「没检索」,是「每库复制一套」+「COS 大半没进表」

后端 `aha-art/pipeline/dam_api.py`(796 行,8091 端口)现在其实已经是**双库**:

- **生成区**:`gen_file`+`gen_clip`(105,260 图 / 94,886 向量),`/search` `/browse` 等端点,但每个查询**硬编码 `source='zaowuyun_team'`**——`infmonkeys` 7,889 张已在库甚至有向量,却被 source 过滤挡在外。
- **素材库**:独立扁平表 `zaowuyun_media`(13,990 图 / 13,117 向量),**另一整套** `/media/*` 端点(media/search、media/browse…),前端用 LIB 变量切换。

问题是两层:

1. **架构不可扩展**:每加一个库 = 复制一套表 + 一套端点 + 一段前端分支。再纳年画、真迹就要复制第三、第四套。这是维护灾难,也是为什么新数据迟迟进不来。
2. **COS 大半没进任何表**。最刺眼的活样本:COS `aha-1254041526/NewYearPaintings/` 有 **660 张年画**,数据库里一条没有——所以"年画数据量"查库结果≈0。图一直在,只是从没被扫描、登记、建向量。

这正是要改的根:**业务表只是 COS 的不完整投影,而且是"每库各投一张表"。要"所有 COS 图可检索",真相源必须是 COS 本身,而且必须收敛成一张统一资产表 + 一套带 lib 分面的端点。**

### COS 全景(账号下 15 桶,图主要在这几摊)

| 桶 / 前缀 | 图像数 | 现状 | 归属库 lib |
|---|---|---|---|
| `aha/artworks/_generated` | 105,260 | 仅 zaowuyun_team 97k 可搜 | generated |
| `aha/artworks/{wikiart,油画数据集,yishujia,nbfox}` | 208,855 | 在 `files` 表,DAM 未接 | artwork |
| `aha/zaowuyun/` | 13,118 | 已进 `zaowuyun_media`,有向量+`/media`端点(独立一套) | reference |
| `aha/NewYearPaintings/` | 660 | 未进库 | folk |
| `aha/jiangnan/` | 264 | 未进库 | exhibition |
| `aha/artists/` | 454 | 未进库 | artwork? |
| `zaowuyun-1254041526`(生成平台原始落点) | 海量(待扫) | 未进库 | generated-raw |
| `yishujia-1254041526`(名画库/抠图/扩图) | 待扫 | 未进库 | 按前缀分 |

CLIP 模型现状:OpenAI `ViT-B/32` → 512 维,与 `gen_clip.embedding_vec` 一致。**全域沿用此模型,向量空间统一。**

---

## 二、核心理念:COS 即真相源 + 统一底座 + 分面

```
        ┌─────────────── COS(多桶) ── 真相源 ───────────────┐
        │ aha/ : artworks _generated zaowuyun NewYearPaintings ...│
        │ zaowuyun-* : 生成原始落点    yishujia-* : 名画/抠图 ... │
        └───────────────────────┬───────────────────────────────┘
                                 │  扫描器(source adapter,增量)
                                 ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ dam_asset   一图一行,全域统一(bucket+cos_key 指回 COS)          │
   │   lib 分面 · source 细分 · sha256/phash 去重 · 软外键回指业务表 │
   ├──────────────────────────────────────────────────────────────┤
   │ dam_embedding  统一 CLIP 向量(vector 512, HNSW),一次编码全域可搜│
   └──────────────────────────────────────────────────────────────┘
        │ 业务元数据不搬家,按 lib 软外键取:                          │
        │   generated → gen_run(prompt/工作流/模型/seed)            │
        │   artwork   → works(图谱字段/作者/年代/风格)              │
        │   reference/folk → 仅 DAM 自带(分类/主色/标签)            │
                                 ▼
                  dam_api.py  统一检索(lib[]/source[] 分面)
```

设计三原则:
- **统一底座**:所有图共用一张资产表 + 一张向量表,一次编码全域可搜。
- **分面不混池**:默认按 lib 分面,可单库可跨库叠加;保住"生成式 DAM"的差异化,不退化成无差别图堆。
- **元数据不搬家**:`dam_asset` 用 `(ext_table, ext_id)` 软外键指回 `gen_run`/`works`,各产品的元数据原地不动,DAM 不破坏现有两个系统。

---

## 三、数据模型(DDL 草案)

```sql
-- 统一资产层:COS 里每张可检索的图一行
CREATE TABLE dam_asset (
  asset_id    bigserial PRIMARY KEY,
  bucket      text NOT NULL,              -- 'aha-1254041526' 等
  cos_key     text NOT NULL,              -- COS 对象键(真相源指针)
  lib         text NOT NULL,              -- 分面:generated/artwork/reference/folk/exhibition...
  source      text NOT NULL,              -- 细分来源:zaowuyun_team/infmonkeys/wikiart/nianhua-cos...
  sha256      text,                       -- 全局内容指纹
  phash       text, dhash text,           -- 感知去重
  width int, height int, bytes bigint, fmt text,
  thumb_key   text,                       -- 缩略图 COS key
  category    text, hue text,             -- 自动分类/主色(可选,沿用现有逻辑)
  ext_table   text,                       -- 软外键:'gen_run' | 'works' | NULL
  ext_id      text,                       -- 对应主键(instance_id / file_id)
  status      text NOT NULL DEFAULT 'active',
  indexed_at  timestamptz, created_at timestamptz DEFAULT now(),
  UNIQUE(bucket, cos_key)
);
CREATE INDEX ON dam_asset(lib);
CREATE INDEX ON dam_asset(source);
CREATE INDEX ON dam_asset(sha256);

-- 统一向量层
CREATE TABLE dam_embedding (
  asset_id    bigint PRIMARY KEY REFERENCES dam_asset(asset_id),
  model       text NOT NULL DEFAULT 'clip-vit-b32',  -- 留模型版本位
  embedding   vector(512) NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX ON dam_embedding USING hnsw (embedding vector_cosine_ops);
```

要点:
- `lib` 是检索分面的主轴;`source` 是更细的来源,用于过滤/统计/血统。
- `ext_table/ext_id` 让 generated 仍能拿到 prompt/工作流,artwork 仍能拿到图谱字段,reference/folk 没有就只用 DAM 自带字段。
- 去重策略:**库内去重,跨库保留**(同一张名画既是 artwork 又被生成引用,语义角色不同,不应跨库合并)。

---

## 四、入库管线:source adapter

每个 (桶, 前缀) 配一个 adapter,负责"把这摊 COS 对象登记成 dam_asset 并建向量":

```
扫桶(list,增量靠 marker / COS Inventory 清单)
  └ 对每个新对象:
       已在 dam_asset(bucket,cos_key)? → 跳过
       否则: 下载 → sha256/phash → 库内去重
              → 生成缩略图 → (可选)分类/主色
              → CLIP ViT-B/32 编码 → 写 dam_asset + dam_embedding
              → 按 adapter 规则打 lib/source/ext_table/ext_id
```

复用资产:已在 `gen_file`+`gen_clip` 且已有向量的 9.5 万张,**不重算**,直接搬进 dam_asset/dam_embedding(一次性迁移脚本)。

库(lib)枚举建议:
- `generated` — 造物云生成 97k + infmonkeys 7.9k(本命)
- `artwork` — wikiart/油画/yishujia/nbfox 真迹 20.8 万
- `reference` — zaowuyun/ 设计素材 13k(参考/灵感库)
- `folk` — NewYearPaintings 年画 660(+ 后续门神/民间美术)
- `exhibition` — jiangnan 江南展 264
- 其它桶按前缀语义新增

---

## 五、检索 API 升级(`dam_api.py`)

- 删除所有写死的 `source='zaowuyun_team'`,改走 `dam_asset` (+ `dam_embedding`)。
- 检索入参新增 `lib[]`(可多选分面)、`source[]`;默认可设全库或 generated,前端可切/叠加。
- `/search` 文搜图、`/similar` 图搜图都走统一 `dam_embedding`,分面在 join `dam_asset` 上过滤。
- 详情页按 `ext_table` 决定取哪套元数据视图(generated 显示血统,artwork 显示图谱)。
- `/stats`、`/categories`、`/timeline` 等聚合按 lib 维度重算。

---

## 六、增量自更新:丢进 COS 自动可搜

- 保留现有 3am cron(从生成平台增量灌新图)。
- 新增"COS 扫描"任务:对各桶做增量 list(开 **COS Inventory** 清单更省钱,或定时 marker 扫描),发现 `dam_asset` 里没有的新对象 → 自动进第四节管线。
- 效果:**任何往 COS 丢的新图,下一轮扫描后自动可被向量检索**——这就是你要的"所有存储进来的图都能检索"。

---

## 七、落地路径(不破坏现状,分阶段)

| 阶段 | 动作 | 量级 | 见效 |
|---|---|---|---|
| 0 | 建 `dam_asset` + `dam_embedding` 两表 | — | 底座就位 |
| 1 | 迁移现有两库(gen_file+gen_clip 含 infmonkeys、zaowuyun_media)进统一表,`dam_api` 端点收敛成一套带 lib 参数 | 复用 ~10.8 万现成向量,0 新建 | **生成区+素材库统一可搜、跨源、`/search` 和 `/media/search` 合一** |
| 2 | 扫 NewYearPaintings(660)+jiangnan(264)+artists(454),建向量入统一表 | ~1.4k 张新编码 | 年画/展览等小库上线,验证"扫桶即入库" |
| 3 | 灌 `files` 20.8 万真迹入 dam_asset,向量后台分批建 | 20.8 万张 CLIP 编码(大头) | DAM 成全域中枢 |
| 4 | 开 COS Inventory + 扫描 worker,覆盖剩余桶 | zaowuyun-*/yishujia-* | 丢图即可搜,闭环 |

---

## 八、待拍板 / 风险点

1. **20.8 万真迹的 CLIP 编码算力**:CPU 跑会非常慢,需确认本机/可用 GPU;否则阶段 3 要分批跑数天。是否值得把全部真迹纳入,还是先纳生成+素材+年画?
2. **模型版本锁定**:统一用 ViT-B/32(与存量一致,零返工)。若将来想升级到更强的 open_clip/SigLIP,`dam_embedding.model` 已留版本位,但需全量重编码——现在先不动。
3. **桶权限**:`~/.aha_cos.json` 的 secret 能否读 `zaowuyun-*`/`yishujia-*` 桶(阶段 4 需要),待验证。
4. **lib 命名与产品边界**:artwork 库其实是 aha.art 的内容,纳入 DAM 后两个产品共用底座——是 DAM 吞 aha,还是 DAM 只做"检索视图"不碰 aha 的业务?定位问题,需你定。
5. **对外可售?**:若 DAM 要对外,统一底座之上还需多租户/权限(规划 P2),本设计先做内部全域检索。
