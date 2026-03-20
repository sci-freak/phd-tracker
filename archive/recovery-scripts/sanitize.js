const fs = require('fs');
const path = require('path');

const inputPath = 'recovered_data.json';
const outputPath = 'cleaned_recovered_data.json';

try {
    const buffer = fs.readFileSync(inputPath);
    let printable = '';
    for (let i = 0; i < buffer.length; i++) {
        const charCode = buffer[i];
        if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
            printable += String.fromCharCode(charCode);
        }
    }

    console.log("Extracting entries via loose string matching...");

    const applications = [];
    
    // Look for all occurrences of "university" and then find subsequent keys
    // We'll use a sliding window approach.
    
    let pos = 0;
    while ((pos = printable.indexOf('university', pos)) !== -1) {
        
        const extractValue = (searchKey, startPos, endLimit) => {
            const keyPos = printable.indexOf(searchKey, startPos);
            if (keyPos === -1 || keyPos > endLimit) return null;
            // Find the first " AFTER the key
            const valStart = printable.indexOf('"', keyPos + searchKey.length);
            if (valStart === -1 || valStart > endLimit + 50) return null;
            const valEnd = printable.indexOf('"', valStart + 1);
            if (valEnd === -1) return null;
            return printable.substring(valStart + 1, valEnd);
        };

        // Find the "limit" for this object - roughly until the NEXT "university" or end of string
        let nextUni = printable.indexOf('university', pos + 10);
        if (nextUni === -1) nextUni = printable.length;

        const app = {
            university: extractValue('university', pos - 2, nextUni) || "Unknown",
            program: extractValue('program', pos, nextUni) || "PhD",
            deadline: extractValue('deadline', pos, nextUni) || "",
            status: extractValue('status', pos, nextUni) || "Not Started",
            notes: extractValue('notes', pos, nextUni) || "",
            files: []
        };

        if (app.university !== "Unknown") {
            applications.push(app);
            console.log(`Recovered: ${app.university}`);
        }
        pos = nextUni === printable.length ? -1 : nextUni;
        if (pos === -1) break;
    }

    if (applications.length > 0) {
        fs.writeFileSync(outputPath, JSON.stringify(applications, null, 2));
        console.log(`\nSUCCESS! Recovered ${applications.length} applications.`);
        console.log(`Final data saved to: ${path.resolve(outputPath)}`);
    } else {
        console.log("No applications found via loose matching.");
    }

} catch (err) {
    console.error("Error:", err.message);
}
