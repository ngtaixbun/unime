import {
  act,
  renderHook,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  useOverviewFilters,
} from "./useOverviewFilters";

describe("useOverviewFilters", () => {
  it("resets child filters when a parent changes", () => {
    const { result } = renderHook(
      () => useOverviewFilters(),
    );

    act(() => {
      result.current.openFilterSheet();
    });

    act(() => {
      result.current.updateDraftFilter(
        "region",
        "number:1",
      );
    });

    expect(
      result.current.draftFilters,
    ).toEqual({
      region: "number:1",
      amm: "all",
      supervisor: "all",
    });

    act(() => {
      result.current.updateDraftFilter(
        "amm",
        "string:001",
      );
    });

    expect(
      result.current.draftFilters,
    ).toEqual({
      region: "number:1",
      amm: "string:001",
      supervisor: "all",
    });

    act(() => {
      result.current.updateDraftFilter(
        "supervisor",
        "string:S01",
      );
    });

    act(() => {
      result.current.updateDraftFilter(
        "region",
        "number:2",
      );
    });

    expect(
      result.current.draftFilters,
    ).toEqual({
      region: "number:2",
      amm: "all",
      supervisor: "all",
    });
  });

  it("resets Supervisor when AMM changes", () => {
    const { result } = renderHook(
      () => useOverviewFilters(),
    );

    act(() => {
      result.current.updateDraftFilter(
        "supervisor",
        "number:16365",
      );
    });

    act(() => {
      result.current.updateDraftFilter(
        "amm",
        "string:002",
      );
    });

    expect(
      result.current.draftFilters,
    ).toEqual({
      region: "all",
      amm: "string:002",
      supervisor: "all",
    });
  });

  it("clears draft filters without changing applied filters until Apply", () => {
    const { result } = renderHook(
      () => useOverviewFilters(),
    );

    act(() => {
      result.current.openFilterSheet();
    });

    act(() => {
      result.current.updateDraftFilter(
        "region",
        "string:north",
      );
    });

    act(() => {
      result.current.applyFilters();
    });

    expect(
      result.current.appliedFilters.region,
    ).toBe("string:north");

    act(() => {
      result.current.openFilterSheet();
    });

    act(() => {
      result.current.clearDraftFilters();
    });

    expect(
      result.current.draftFilters,
    ).toEqual({
      region: "all",
      amm: "all",
      supervisor: "all",
    });

    expect(
      result.current.appliedFilters.region,
    ).toBe("string:north");

    expect(
      result.current.isFilterOpen,
    ).toBe(true);

    act(() => {
      result.current.applyFilters();
    });

    expect(
      result.current.appliedFilters,
    ).toEqual({
      region: "all",
      amm: "all",
      supervisor: "all",
    });
  });

  it("applies three levels and updates badge count", () => {
    const { result } = renderHook(
      () => useOverviewFilters(),
    );

    act(() => {
      result.current.openFilterSheet();
    });

    act(() => {
      result.current.updateDraftFilter(
        "region",
        "number:1",
      );
    });

    act(() => {
      result.current.updateDraftFilter(
        "amm",
        "string:001",
      );
    });

    act(() => {
      result.current.updateDraftFilter(
        "supervisor",
        "string:S01",
      );
    });

    act(() => {
      result.current.applyFilters();
    });

    expect(
      result.current.appliedFilters,
    ).toEqual({
      region: "number:1",
      amm: "string:001",
      supervisor: "string:S01",
    });

    expect(
      result.current.appliedFilterCount,
    ).toBe(3);

    expect(
      result.current.isFilterOpen,
    ).toBe(false);
  });
});
