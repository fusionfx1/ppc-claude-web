import { SITE_TEMPLATES } from "../../constants";

export const DEFAULT_TEMPLATE_ID = "classic";

export function getTemplateById(templateId) {
    return SITE_TEMPLATES.find(t => t.id === templateId) || SITE_TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID) || SITE_TEMPLATES[0];
}
