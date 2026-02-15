/**
 * Test script for astro-generator.js
 * Verifies that the generator produces the correct compliance components and content.
 */

import { generateAstroProject } from './src/utils/astro-generator.js';

const mockSite = {
    brand: 'TestLoan',
    loanType: 'personal',
    colorId: 'blue',
    fontId: 'inter',
    radius: 'md',
    amountMin: 1000,
    amountMax: 50000,
    aprMin: 5.99,
    aprMax: 35.99,
    domain: 'test-loan.com',
    leadsGateFormId: 'lg-123',
};

console.log('--- Generating Astro Project ---');
const files = generateAstroProject(mockSite);
const filePaths = Object.keys(files);

console.log(`Total files generated: ${filePaths.length}`);

// 1. Check for expected new files
const expectedFiles = [
    'src/components/Modal.astro',
    'src/components/LegalPopups.astro',
    'src/components/ComplianceBlock.astro',
    'src/pages/index.astro'
];

console.log('\n--- Checking Expected Files ---');
expectedFiles.forEach(path => {
    if (files[path]) {
        console.log(`[PASS] Found: ${path} (${files[path].length} chars)`);
    } else {
        console.error(`[FAIL] Missing: ${path}`);
    }
});

// 2. Inspect Compliance Content
console.log('\n--- Inspecting Compliance Content ---');

const complianceBlock = files['src/components/ComplianceBlock.astro'];
if (complianceBlock) {
    const hasTriggers = complianceBlock.includes("document.getElementById('modal-privacy').showModal()");
    const hasNotALender = complianceBlock.includes("is a lead generator, not a lender");
    console.log(`ComplianceBlock - Modal Triggers: ${hasTriggers ? 'YES' : 'NO'}`);
    console.log(`ComplianceBlock - "Not a Lender" Statement: ${hasNotALender ? 'YES' : 'NO'}`);
}

const legalPopups = files['src/components/LegalPopups.astro'];
if (legalPopups) {
    const hasAprRange = legalPopups.includes('{aprMin}% to {aprMax}%');
    const hasRepayment = legalPopups.includes('61 days to 72 months');
    console.log(`LegalPopups - APR Range Correct ({aprMin}..{aprMax}): ${hasAprRange ? 'YES' : 'NO'}`);
    console.log(`LegalPopups - Repayment Terms: ${hasRepayment ? 'YES' : 'NO'}`);
}

const indexAstro = files['src/pages/index.astro'];
if (indexAstro) {
    const hasLegalPopups = indexAstro.includes('<LegalPopups />');
    const hasNavbarTriggers = indexAstro.includes("document.getElementById('modal-how-it-works').showModal()");
    console.log(`Index.astro - Includes LegalPopups: ${hasLegalPopups ? 'YES' : 'NO'}`);
    console.log(`Index.astro - Navbar Modal Triggers: ${hasNavbarTriggers ? 'YES' : 'NO'}`);
}

console.log('\n--- Test Verification Complete ---');
