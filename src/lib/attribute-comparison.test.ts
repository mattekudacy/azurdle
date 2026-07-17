import { describe, expect, it } from "vitest";
import { compareAttributes } from "./attribute-comparison";
import type { ServiceEntry } from "./service-entry";

const aksAnswer: ServiceEntry = {
  name: "Azure Kubernetes Service",
  category: "Containers",
  launchYear: 2018,
  computeModel: "Managed Service",
  pricingModel: "Per hour",
  awsEquivalent: "Amazon EKS",
};

describe("compareAttributes", () => {
  it("returns exact match on all fields when guess equals answer", () => {
    const result = compareAttributes(aksAnswer, aksAnswer);
    expect(result.category).toEqual({ value: "Containers", match: "exact" });
    expect(result.launchYear).toEqual({ value: 2018, match: "exact" });
    expect(result.computeModel).toEqual({ value: "Managed Service", match: "exact" });
    expect(result.pricingModel).toEqual({ value: "Per hour", match: "exact" });
  });

  it("returns launchYear higher when answer is newer than guess", () => {
    const guess: ServiceEntry = {
      name: "Azure Functions",
      category: "Compute",
      launchYear: 2016,
      computeModel: "Serverless",
      pricingModel: "Per request",
      awsEquivalent: "AWS Lambda",
    };
    const result = compareAttributes(guess, aksAnswer);
    expect(result.launchYear).toEqual({ value: 2016, match: "higher" });
  });

  it("returns launchYear lower when answer is older than guess", () => {
    const guess: ServiceEntry = {
      name: "Azure Container Apps",
      category: "Containers",
      launchYear: 2022,
      computeModel: "Serverless",
      pricingModel: "Per request",
      awsEquivalent: "AWS App Runner",
    };
    const result = compareAttributes(guess, aksAnswer);
    expect(result.launchYear).toEqual({ value: 2022, match: "lower" });
  });

  it("returns none for category mismatch", () => {
    const guess: ServiceEntry = {
      name: "Azure SQL Database",
      category: "Databases",
      launchYear: 2018,
      computeModel: "Managed Service",
      pricingModel: "Per hour",
      awsEquivalent: "Amazon RDS",
    };
    const result = compareAttributes(guess, aksAnswer);
    expect(result.category).toEqual({ value: "Databases", match: "none" });
    expect(result.launchYear).toEqual({ value: 2018, match: "exact" });
  });

  it("value always reflects the guessed service, not the answer", () => {
    const guess: ServiceEntry = {
      name: "Azure Container Instances",
      category: "Containers",
      launchYear: 2017,
      computeModel: "Serverless",
      pricingModel: "Per hour",
      awsEquivalent: "AWS Fargate",
    };
    const result = compareAttributes(guess, aksAnswer);
    expect(result.computeModel.value).toBe("Serverless");
    expect(result.category.match).toBe("exact");
    expect(result.launchYear.match).toBe("higher");
  });

  it("string comparisons are case-insensitive", () => {
    const guess: ServiceEntry = {
      ...aksAnswer,
      category: "CONTAINERS",
      computeModel: "managed service",
      pricingModel: "PER HOUR",
    };
    const result = compareAttributes(guess, aksAnswer);
    expect(result.category.match).toBe("exact");
    expect(result.computeModel.match).toBe("exact");
    expect(result.pricingModel.match).toBe("exact");
  });
});
