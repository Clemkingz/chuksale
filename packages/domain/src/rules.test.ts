import { describe, expect, it } from "vitest";
import { canRetry, countsTowardTotal } from "./contribution-status";
import { compare, formatAmount, fromStroops, isValidAmount, progressPercent, sum, toStroops } from "./money";
import { InvalidTransitionError, ReasonRequiredError, inBuilderGroup, isPubliclyVisible, transition } from "./project-status";

describe("project state machine", () => {
	it("lets a builder submit a draft", () => {
		expect(transition("draft", "submitted", "builder")).toBe("submitted");
	});
	it("rejects a builder approving their own project", () => {
		expect(() => transition("submitted", "approved", "builder")).toThrow(InvalidTransitionError);
	});
	it("rejects skipping review", () => {
		expect(() => transition("draft", "approved", "admin")).toThrow(InvalidTransitionError);
	});
	it("requires a reason to reject or request changes", () => {
		expect(() => transition("under_review", "rejected", "admin", "  ")).toThrow(ReasonRequiredError);
		expect(transition("under_review", "changes_requested", "admin", "Add team links")).toBe("changes_requested");
	});
	it("only approved + published is public", () => {
		expect(isPubliclyVisible({ status: "approved", visibility: "published" })).toBe(true);
		expect(isPubliclyVisible({ status: "approved", visibility: "unpublished" })).toBe(false);
		expect(isPubliclyVisible({ status: "submitted", visibility: "published" })).toBe(false);
	});
});

describe("money", () => {
	it("round-trips without float error", () => {
		expect(sum(["0.1", "0.2"])).toBe("0.3000000");
		expect(fromStroops(toStroops("12.3456789"))).toBe("12.3456789");
	});
	it("validates Stellar precision", () => {
		expect(isValidAmount("10")).toBe(true);
		expect(isValidAmount("10.12345678")).toBe(false);
		expect(isValidAmount("0")).toBe(false);
		expect(isValidAmount("-1")).toBe(false);
	});
	it("compares, formats and computes progress", () => {
		expect(compare("5", "5.0000000")).toBe(0);
		expect(formatAmount("1250.5000000")).toBe("1,250.5");
		expect(progressPercent("250", "1000")).toBe(25);
		expect(progressPercent("1", null)).toBeNull();
	});
});

describe("contribution status", () => {
	it("counts only confirmed", () => {
		expect(countsTowardTotal("confirmed")).toBe(true);
		expect(countsTowardTotal("pending")).toBe(false);
	});
	it("never allows retrying a pending payment", () => {
		expect(canRetry("pending")).toBe(false);
		expect(canRetry("failed")).toBe(true);
	});
});

describe("builder dashboard tabs (D18)", () => {
	it("puts not-yet-approved work under Pending and approved under Completed", () => {
		expect(inBuilderGroup("draft", "pending")).toBe(true);
		expect(inBuilderGroup("changes_requested", "pending")).toBe(true);
		expect(inBuilderGroup("approved", "pending")).toBe(false);
		expect(inBuilderGroup("approved", "completed")).toBe(true);
		expect(inBuilderGroup("rejected", "pending")).toBe(false);
		expect(inBuilderGroup("rejected", "completed")).toBe(false);
		expect(inBuilderGroup("rejected", "all")).toBe(true);
	});
});
