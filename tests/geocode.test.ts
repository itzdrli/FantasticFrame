import { describe, expect, it } from "vitest";
import { placeFromAddress, roundCoord, validCoords } from "../shared/geocode";
import { exifEntriesFor, formatExif, splitCaption } from "../shared/render";

describe("place names from Nominatim addresses", () => {
  // Real zoom=10 answers (accept-language=en), trimmed to what is read
  it("names the city with its country", () => {
    expect(placeFromAddress({ city: "Kyoto", country: "Japan" })).toBe("Kyoto, Japan");
    expect(
      placeFromAddress({ city_district: "Paris", city: "Paris", country: "France" } as never),
    ).toBe("Paris, France");
  });

  it("prefers the city over a town inside it", () => {
    expect(placeFromAddress({ town: "Yushan", city: "Kunshan", country: "China" })).toBe(
      "Kunshan, China",
    );
  });

  it("names China's municipalities and Tokyo, not the district Nominatim calls the city", () => {
    expect(
      placeFromAddress({
        city: "Pudong",
        state: "Shanghai",
        "ISO3166-2-lvl4": "CN-SH",
        country: "China",
      }),
    ).toBe("Shanghai, China");
    expect(placeFromAddress({ city: "Shibuya", "ISO3166-2-lvl4": "JP-13", country: "Japan" })).toBe(
      "Tokyo, Japan",
    );
  });

  it("names Hong Kong on its own", () => {
    expect(
      placeFromAddress({ city: "Hong Kong", "ISO3166-2-lvl3": "CN-HK", country: "China" }),
    ).toBe("Hong Kong");
  });

  it("falls back to smaller places, then the country, then nothing", () => {
    expect(placeFromAddress({ village: "Hallstatt", country: "Austria" })).toBe(
      "Hallstatt, Austria",
    );
    expect(placeFromAddress({ country: "Singapore" })).toBe("Singapore");
    expect(placeFromAddress({})).toBeUndefined();
    expect(placeFromAddress(undefined)).toBeUndefined();
  });
});

describe("coordinates sent for a lookup", () => {
  it("are rounded to ~1 km", () => {
    expect(roundCoord(35.039444)).toBe(35.04);
    expect(roundCoord(-122.47831)).toBe(-122.48);
  });

  it("must be real coordinates", () => {
    expect(validCoords(35, 135)).toBe(true);
    expect(validCoords(91, 0)).toBe(false);
    expect(validCoords(0, -181)).toBe(false);
    expect(validCoords(Number.NaN, 0)).toBe(false);
  });
});

describe("location field", () => {
  it("formats the place text, trimmed, and is empty without one", () => {
    expect(formatExif({ location: "  Kyoto, Japan " }, "location")).toBe("Kyoto, Japan");
    expect(formatExif({ latitude: 35, longitude: 135 }, "location")).toBe("");
  });

  it("sits with the date in the split caption's secondary row", () => {
    const entries = exifEntriesFor(
      { model: "X-T5", location: "Kyoto, Japan", dateTimeOriginal: new Date(2026, 9, 23) },
      ["model", "dateTimeOriginal", "location"],
    );
    expect(splitCaption(entries).rightSub).toEqual(["2026/10/23", "Kyoto, Japan"]);
  });
});
