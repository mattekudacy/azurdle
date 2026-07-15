import { describe, expect, it } from "vitest";
import { isCorrectGuess, normalizeGuess } from "./guess";

describe("normalizeGuess", () => {
  it("lowercases and strips punctuation/spaces", () => {
    expect(normalizeGuess("Azure Kubernetes Service")).toBe("kubernetesservice");
  });

  it("strips a leading azure/microsoft brand prefix", () => {
    expect(normalizeGuess("Azure AD")).toBe("ad");
    expect(normalizeGuess("Microsoft Entra ID")).toBe("entraid");
  });

  it("leaves abbreviations untouched", () => {
    expect(normalizeGuess("AKS")).toBe("aks");
  });
});

describe("isCorrectGuess", () => {
  it("matches the exact answer regardless of case/spacing", () => {
    expect(isCorrectGuess("azure kubernetes service", "Azure Kubernetes Service", [])).toBe(
      true,
    );
  });

  it("matches via alias: AKS ≡ Azure Kubernetes Service", () => {
    expect(isCorrectGuess("AKS", "Azure Kubernetes Service", ["AKS"])).toBe(true);
  });

  it("matches via alias: Azure AD ≡ Microsoft Entra ID", () => {
    expect(isCorrectGuess("Azure AD", "Microsoft Entra ID", ["Azure AD", "Azure Active Directory"])).toBe(
      true,
    );
  });

  it("rejects an unrelated guess", () => {
    expect(isCorrectGuess("Azure Functions", "Azure Kubernetes Service", ["AKS"])).toBe(false);
  });
});
