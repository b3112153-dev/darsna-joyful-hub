import { describe, expect, it } from "vitest";
import { avatarLayers, itemColor, SKIN } from "@/lib/avatar-figure";

describe("avatarLayers", () => {
  it("defaults to the basic beige/burgundy outfit with gender hairstyle", () => {
    const male = avatarLayers({}, "male");
    expect(male.outfit).toEqual({ top: "#e8d5b5", bottom: "#8c0610", crown: false });
    expect(male.hair.style).toBe("short");
    expect(avatarLayers({}, "female").hair.style).toBe("long");
    expect(male.skin).toBe(SKIN);
  });

  it("maps each outfit it00..it08 to distinct colors and gives it08 a crown", () => {
    const tops = new Set<string>();
    for (let n = 0; n <= 8; n++) {
      const l = avatarLayers({ outfit: `it${String(n).padStart(2, "0")}` });
      tops.add(l.top);
      expect(l.outfit.crown).toBe(n === 8);
    }
    expect(tops.size).toBe(9);
  });

  it("uses avatar.hairColor for females and brown otherwise", () => {
    expect(avatarLayers({ hairColor: "#8c0610" }, "female").hair.color).toBe("#8c0610");
    expect(avatarLayers({ hairColor: "#8c0610" }, "male").hair.color).not.toBe("#8c0610");
  });

  it("maps clothes it09-it17, traditional it28-it30, shoes it21-it23", () => {
    expect(avatarLayers({ clothes: "it09" }).clothes).toBe("#8c0610");
    expect(avatarLayers({ clothes: "it17" }).clothes).toBe("#334155");
    expect(avatarLayers({ clothes: "it08" }).clothes).toBeNull();
    expect(avatarLayers({ traditional: "it28" }).traditional).toBe("#f5f0e6");
    expect(avatarLayers({ traditional: "it30" }).traditional).toBe("#e6dcc3");
    expect(avatarLayers({ shoes: "it22" }).shoes).toBe("#1f3a5f");
  });

  it("maps accessories, pets it37-it46 and effects it47-it51", () => {
    const acc = avatarLayers({ accessory: "it24", glasses: "it34", watch: "it31" });
    expect(acc.cap).toBe("#8c0610");
    expect(acc.glasses).toBe("#d4a017");
    expect(acc.watch).toBe("#d4a017");
    expect(avatarLayers({ accessory: "it27" }).pendant).toBe("#d4a017");
    expect(avatarLayers({ pet: "it37" }).pet?.kind).toBe("cat");
    expect(avatarLayers({ pet: "it46" }).pet).not.toBeNull();
    expect(avatarLayers({ pet: "it47" }).pet).toBeNull();
    expect(avatarLayers({ effect: "it47" }).effect?.kind).toBe("sparkle");
    expect(avatarLayers({ effect: "it51" }).effect).not.toBeNull();
    expect(avatarLayers({ effect: "it52" }).effect).toBeNull();
  });

  it("exposes a per-item color for wardrobe icons", () => {
    expect(itemColor("it04", "outfit")).toBe("#e8762d");
    expect(itemColor("it29", "traditional")).toBe("#3a2a33");
    expect(itemColor("it21", "shoes")).toBe("#8c0610");
  });
});
