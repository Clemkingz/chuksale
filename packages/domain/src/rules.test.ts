import { describe, expect, it } from "vitest";
import { canRetry, countsTowardTotal } from "./contribution-status";
import { compare, formatAmount, fromStroops, isValidAmount, progressPercent, sum, toStroops } from "./money";
import { actionRequiresReason, availableActions, inBuilderGroup, isPubliclyVisible } from "./project-status";

describe("project actions (admin)", () => {
	it("offers review decisions only while a project waits for review", () => {
		expect(availableActions({ status: "submitted", published: false, featured: false })).toEqual(
			expect.arrayContaining(["start_review", "approve", "reject", "request_changes", "archive"]),
		);
		expect(availableActions({ status: "draft", published: false, featured: false })).toEqual([]);
	});
	it("only features published projects, and offers unfeature when featured", () => {
		expect(availableActions({ status: "approved", published: false, featured: false })).not.toContain("feature");
		expect(availableActions({ status: "approved", published: true, featured: true })).toContain("unfeature");
		expect(availableActions({ status: "approved", published: true, featured: true })).not.toContain("feature");
	});
	it("requires a reason to reject, request changes or archive", () => {
		expect(actionRequiresReason("reject")).toBe(true);
		expect(actionRequiresReason("request_changes")).toBe(true);
		expect(actionRequiresReason("archive")).toBe(true);
		expect(actionRequiresReason("approve")).toBe(false);
	});
	it("only approved + published is public", () => {
		expect(isPubliclyVisible({ status: "approved", published: true })).toBe(true);
		expect(isPubliclyVisible({ status: "approved", published: false })).toBe(false);
		expect(isPubliclyVisible({ status: "submitted", published: true })).toBe(false);
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
