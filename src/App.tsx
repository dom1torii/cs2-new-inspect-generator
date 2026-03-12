import { useEffect, useState } from "react";
import protobuf from "protobufjs";
import CRC32 from "crc-32";
import parseDiff from "parse-diff";
import "./App.css";

const econ = {
  nested: {
    CEconItemPreviewDataBlock: {
      nested: {
        Sticker: {
          fields: {
            slot: { type: "uint32", id: 1 },
            sticker_id: { type: "uint32", id: 2 },
            wear: { type: "float", id: 3 },
            scale: { type: "float", id: 4 },
            rotation: { type: "float", id: 5 },
            tint_id: { type: "uint32", id: 6 },
          },
        },
      },
      fields: {
        accountid: { type: "uint32", id: 1 },
        itemid: { type: "uint64", id: 2 },
        defindex: { type: "uint32", id: 3 },
        paintindex: { type: "uint32", id: 4 },
        rarity: { type: "uint32", id: 5 },
        quality: { type: "uint32", id: 6 },
        paintwear: { type: "uint32", id: 7 },
        paintseed: { type: "uint32", id: 8 },
        killeaterscoretype: { type: "uint32", id: 9 },
        killeatervalue: { type: "uint32", id: 10 },
        customname: { type: "string", id: 11 },
        stickers: { rule: "repeated", type: "Sticker", id: 12 },
        inventory: { type: "uint32", id: 13 },
        origin: { type: "uint32", id: 14 },
        questid: { type: "uint32", id: 15 },
        dropreason: { type: "uint32", id: 16 },
        musicindex: { type: "uint32", id: 17 },
        entindex: { type: "int32", id: 18 },
      },
    },
  },
};

const defIndexMap: Record<string, number> = {
  weapon_deagle: 1,
  weapon_elite: 2,
  weapon_fiveseven: 3,
  weapon_glock: 4,
  weapon_ak47: 7,
  weapon_aug: 8,
  weapon_awp: 9,
  weapon_famas: 10,
  weapon_g3sg1: 11,
  weapon_galilar: 13,
  weapon_m249: 14,
  weapon_m4a1: 16,
  weapon_mac10: 17,
  weapon_p90: 19,
  weapon_mp5sd: 23,
  weapon_ump45: 24,
  weapon_xm1014: 25,
  weapon_bizon: 26,
  weapon_mag7: 27,
  weapon_negev: 28,
  weapon_sawedoff: 29,
  weapon_tec9: 30,
  weapon_taser: 31,
  weapon_hkp2000: 32,
  weapon_mp7: 33,
  weapon_mp9: 34,
  weapon_nova: 35,
  weapon_p250: 36,
  weapon_scar20: 38,
  weapon_sg556: 39,
  weapon_ssg08: 40,
  weapon_flashbang: 43,
  weapon_hegrenade: 44,
  weapon_smokegrenade: 45,
  weapon_molotov: 46,
  weapon_decoy: 47,
  weapon_incgrenade: 48,
  weapon_c4: 49,
  weapon_m4a1_silencer: 60,
  weapon_usp_silencer: 61,
  weapon_cz75a: 63,
  weapon_revolver: 64,

  weapon_bayonet: 500,
  weapon_knife_css: 503,
  weapon_knife_flip: 505,
  weapon_knife_gut: 506,
  weapon_knife_karambit: 507,
  weapon_knife_m9_bayonet: 508,
  weapon_knife_tactical: 509,
  weapon_knife_falchion: 512,
  weapon_knife_survival_bowie: 514,
  weapon_knife_butterfly: 515,
  weapon_knife_push: 516,
  weapon_knife_cord: 517,
  weapon_knife_canis: 518,
  weapon_knife_ursus: 519,
  weapon_knife_gypsy_jackknife: 520,
  weapon_knife_outdoor: 521,
  weapon_knife_stiletto: 522,
  weapon_knife_widowmaker: 523,
  weapon_knife_skeleton: 525,
  weapon_knife_kukri: 526,

  studded_bloodhound_gloves: 5027,
  t_gloves: 5028,
  ct_gloves: 5029,
  sporty_gloves: 5030,
  slick_gloves: 5031,
  leather_handwraps: 5032,
  motorcycle_gloves: 5033,
  specialist_gloves: 5034,
  studded_hydra_gloves: 5035,
  studded_brokenfang_gloves: 4725,
};

type Skin = {
  id: number;
  name: string;
};

type Link = {
  name: string;
  link: string;
};

function App() {
  const [diffSkins, setDiffSkins] = useState<Skin[]>([]);
  const [checkedSkins, setCheckedSkins] = useState<number[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [defIdx, setDefIdx] = useState<number | null>(Object.values(defIndexMap)[0]);
  const [pattern, setPattern] = useState<number>(1);
  const [float, setFloat] = useState<number>(0);

  useEffect(() => {
    getDiffSkins();
  }, []);

  async function getDiffSkins() {
    const diffText = await fetch("/new-skins/diff.diff").then((r) => r.text());
    const files = parseDiff(diffText);
    const targetFile = "game/csgo/pak01_dir/scripts/items/items_game.txt";

    const skins: Skin[] = [];

    const file = files.find((f) => f.to === targetFile);
    if (!file) return skins;

    let currentId: number | null = null;

    for (const c of file.chunks) {
      for (const line of c.changes) {
        if (line.type !== "add") continue;

        const cleanLine = line.content.replace(/^[+-]\s*/, "");

        const idMatch = cleanLine.match(/^\s*"(\d+)"\s*$/);
        if (idMatch) {
          currentId = Number(idMatch[1]);
          continue;
        }

        const nameMatch = cleanLine.match(/^\s*"name"\s*"([^"]+)"/);
        if (nameMatch && currentId !== null) {
          skins.push({ id: currentId, name: nameMatch[1] });
          currentId = null;
        }
      }
    }
    setDiffSkins(skins);
  }

  // i barely understand whats happening here pls dont judge
  const generateInspect = (proto: Uint8Array) => {
    const buffer = new Uint8Array(1 + proto.length);
    buffer[0] = 0;
    buffer.set(proto, 1);

    const crc = CRC32.buf(buffer) >>> 0;
    const xoredCrc = (crc & 0xffff) ^ (proto.length * crc);

    const finalBuffer = new Uint8Array(buffer.length + 4);
    finalBuffer.set(buffer);

    const view = new DataView(finalBuffer.buffer);
    view.setUint32(buffer.length, xoredCrc >>> 0, false);

    return Array.from(finalBuffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  function getAllLinks() {
    const selectedSkins = diffSkins.filter((skin) => checkedSkins.includes(skin.id));
    const newLinks: Link[] = [];

    const root = protobuf.Root.fromJSON(econ);
    const EconItem = root.lookupType("CEconItemPreviewDataBlock");

    for (const skin of selectedSkins) {
      const message = EconItem.create({
        defindex: defIdx,
        paintindex: skin.id,
        paintseed: pattern,
        paintwear: floatToUint32BE(float),
      });
      const encoded = EconItem.encode(message).finish();
      const generatedPayload = generateInspect(encoded);
      newLinks.push({
        name: skin.name,
        link: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20${generatedPayload}`,
      });
    }

    setLinks(newLinks);
  }

  function floatToUint32BE(f: number): number {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setFloat32(0, f, false);
    return view.getUint32(0, false);
  }

  const handleCheck = (id: number) => {
    setCheckedSkins((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDefChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = defIndexMap[event.target.value];
    setDefIdx(idx);
  };

  return (
    <>
      <form>
        <label htmlFor="defindex">Choose item type: </label>
        <select name="defindex" id="defindex" onChange={handleDefChange}>
          {Object.entries(defIndexMap).map(([name, idx]) => (
            <option key={idx} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label htmlFor="pattern">Item pattern: </label>
        <input
          type="number"
          id="pattern"
          name="pattern"
          defaultValue={1}
          onChange={(e) => setPattern(Number(e.target.value))}
        />
        <label htmlFor="wear">Item float: </label>
        <input
          type="number"
          id="float"
          name="float"
          defaultValue={0}
          onChange={(e) => setFloat(Number(e.target.value))}
        />

        <div>
          {diffSkins.map((skin) => (
            <div key={skin.id}>
              <label htmlFor={skin.id.toString()}>{skin.name}</label>
              <input
                type="checkbox"
                id={skin.id.toString()}
                name={skin.name}
                checked={checkedSkins.includes(skin.id)}
                onChange={() => handleCheck(skin.id)}
              />
            </div>
          ))}
        </div>
      </form>
      {checkedSkins.length > 0 && <button onClick={getAllLinks}>Generate inspect links</button>}
      {links.map((link) => (
        <div key={link.name}>
          {`${link.name} - `}
          <a href={link.link}>{link.link}</a>
        </div>
      ))}
      <div>
        Made by <a href="https://domitori.xyz">domi</a>, thanks to{" "}
        <a href="https://github.com/dr3fty/cs2-inspect-gen">dr3fty</a>
      </div>
    </>
  );
}

export default App;
