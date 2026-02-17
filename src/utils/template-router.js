import { generateLP, generateAstrodeckLoanPreview, generateApplyPage } from "./lp-generator";
import { generateAstroProject } from "./astro-generator";

export const DEFAULT_TEMPLATE_ID = "classic";

export function resolveTemplateId(site) {
  return site?.templateId || DEFAULT_TEMPLATE_ID;
}

export function generateHtmlByTemplate(site) {
  switch (resolveTemplateId(site)) {
    case "astrodeck-loan":
      return generateAstrodeckLoanPreview(site);
    case "classic":
    default:
      return generateLP(site);
  }
}

export function generateAstroProjectByTemplate(site) {
  switch (resolveTemplateId(site)) {
    case "astrodeck-loan":
    case "classic":
    default:
      return generateAstroProject(site);
  }
}

export function generateApplyPageByTemplate(site) {
  return generateApplyPage(site);
}
