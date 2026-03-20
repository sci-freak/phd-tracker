const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'phd-tracker', 'Local Storage', 'leveldb');
const outputPath = 'recovered_applications.json';

const uniRegex = /"university"\s*:\s*"([^"]+)"/g;
const progRegex = /"program"\s*:\s*"([^"]+)"/g;

try {
    const files = fs.readdirSync(appDataPath);
    const applications = [];
    const seen = new Set();
    
    for (const file of files) {
        if (!file.endsWith('.ldb') && !file.endsWith('.log')) continue;
        const subContent = fs.readFileSync(path.join(appDataPath, file), 'utf8');
        
        // Strip nulls from content before regex
        const content = subContent.replace(/\x00/g, '');
        
        let match;
        while ((match = uniRegex.exec(content)) !== null) {
            const uniName = match[1];
            // Look for the next program near here
            const subSection = content.substring(match.index, match.index + 200);
            const pMatch = /"program"\s*:\s*"([^"]+)"/.exec(subSection);
            
            const app = {
                university: uniName,
                program: pMatch ? pMatch[1] : "PhD",
                status: "Not Started",
                notes: "",
                files: []
            };
            
            const key = `${app.university}|${app.program}`.toLowerCase();
            if (!seen.has(key) && app.university.length < 100 && app.university.length > 2) {
                applications.push(app);
                seen.add(key);
            }
        }
    }

    if (applications.length > 0) {
        fs.writeFileSync(outputPath, JSON.stringify(applications, null, 2));
        console.log(`Recovered ${applications.length} applications.`);
    } else {
        // Final fallback: just search for any string that looks like University or Oxford or Imperial
        console.log("No exact JSON key matches found. The data might be stored differently.");
    }
} catch (e) {
    console.error(e);
}
