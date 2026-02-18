import { generateLP, generateAstrodeckLoanPreview, generateApplyPage } from "./lp-generator";
import { generateAstroProject, generatePDLLoansV1 } from "./astro-generator";

export const DEFAULT_TEMPLATE_ID = "classic";

function resolveTemplateId(site) {
  const tid = site?.templateId || DEFAULT_TEMPLATE_ID;
  console.log("[template-router] Resolving templateId:", site?.templateId, "-> using:", tid);
  return tid;
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
  const tid = resolveTemplateId(site);
  console.log("[template-router] generateAstroProjectByTemplate called with templateId:", tid);
  switch (tid) {
    case "pdl-loansv1":
      console.log("[template-router] Using generatePDLLoansV1");
      return generatePDLLoansV1(site);
    case "astrodeck-loan":
    case "classic":
    default:
      console.log("[template-router] Using generateAstroProject (classic)");
      return generateAstroProject(site);
  }
}

export function generateApplyPageByTemplate(site) {
  return generateApplyPage(site);
}
