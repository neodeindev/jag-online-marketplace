import { describe, expect, it } from "vitest";
import { ancestorIds, flattenCategories, visibleRows } from "@/lib/admin/category-tree";

const cat = (id: string, parent_id: string | null, sort_order = 0) => ({ id, parent_id, name: id, sort_order });

// fashion › women › dresses, fashion › men; electronics › phones
const categories = [
  cat("fashion", null, 0),
  cat("women", "fashion", 0),
  cat("dresses", "women", 0),
  cat("men", "fashion", 1),
  cat("electronics", null, 1),
  cat("phones", "electronics", 0),
];
const flat = flattenCategories(categories);
const names = (open: string[]) => visibleRows(flat, new Set(open)).map((r) => r.category.id);

describe("visibleRows", () => {
  it("shows only top-level categories when nothing is open", () => {
    expect(names([])).toEqual(["fashion", "electronics"]);
  });

  it("shows the children of open categories, keeping order", () => {
    expect(names(["fashion"])).toEqual(["fashion", "women", "men", "electronics"]);
    expect(names(["fashion", "women", "electronics"])).toEqual(flat.map((r) => r.category.id));
  });

  it("keeps a branch hidden while its parent is closed, even if the branch itself is open", () => {
    expect(names(["women"])).toEqual(["fashion", "electronics"]);
  });
});

describe("ancestorIds", () => {
  it("lists parents nearest first", () => {
    expect(ancestorIds(categories, "dresses")).toEqual(["women", "fashion"]);
    expect(ancestorIds(categories, "fashion")).toEqual([]);
  });

  it("stops at a missing parent or a loop", () => {
    expect(ancestorIds([cat("orphan", "gone")], "orphan")).toEqual([]);
    expect(ancestorIds([cat("a", "b"), cat("b", "a")], "a")).toEqual(["b", "a"]);
  });
});
