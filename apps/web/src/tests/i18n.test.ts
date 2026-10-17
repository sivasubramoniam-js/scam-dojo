import { describe, it, expect } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import ta from "@/i18n/ta.json";
import te from "@/i18n/te.json";
import ja from "@/i18n/ja.json";
import id from "@/i18n/id.json";
import zh from "@/i18n/zh.json";

describe("i18n Key Parity across 7 JAPAC Languages", () => {
  const dictionaries = { en, hi, ta, te, ja, id, zh };
  const enKeys = Object.keys(en).sort();

  for (const [langCode, dict] of Object.entries(dictionaries)) {
    it(`${langCode}.json has identical key set to en.json`, () => {
      const keys = Object.keys(dict).sort();
      expect(keys).toEqual(enKeys);
    });

    it(`${langCode}.json contains no empty strings`, () => {
      for (const [key, val] of Object.entries(dict)) {
        expect(val.trim().length, `Empty ${langCode} value for key: ${key}`).toBeGreaterThan(0);
      }
    });
  }
});
