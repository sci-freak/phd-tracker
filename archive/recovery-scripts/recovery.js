const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'phd-tracker', 'Local Storage', 'leveldb');
const outputPath = 'recovered_data_final.json';

function extractAll(buffer) {
    let printable = '';
    for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c >= 32 && c <= 126) printable += String.fromCharCode(c);
        else printable += ' ';
    }
    const results = [];
    let pos = 0;
    while ((pos = printable.indexOf('university', pos)) !== -1) {
        const grabFirstStringAfter = (key, start) => {
            const kPos = printable.indexOf(key, start);
            if (kPos === -1 || kPos > start + 1000) return "";
            const segment = printable.substring(kPos + key.length, kPos + key.length + 100);
            const match = segment.match(/"([^"]{2,})"/);
            if (match) return match[1];
            // If no quotes, try grabbing anything alphanumeric
            const altMatch = segment.match(/([A-Za-z0-9\s.,()-]{2,})/);
            return altMatch ? altMatch[1].trim() : "";
        };
        const app = {
            university: grabFirstStringAfter('university', pos - 5) || "Unknown",
            program: grabFirstStringAfter('program', pos) || "PhD",
            deadline: grabFirstStringAfter('deadline', pos),
            status: grabFirstStringAfter('status', pos) || "Not Started",
            notes: "",
            files: []
        };
        if (app.university !== "Unknown" && app.university.length < 100) {
            results.push(app);
        }
        pos = printable.indexOf('university', pos + 10);
        if (pos === -1) break;
    }
    return results;
}

try {
    let all = [];
    fs.readdirSync(appDataPath).forEach(f => {
        if (f.endsWith('.ldb') || f.endsWith('.log')) {
            all.push(...extractAll(fs.readFileSync(path.join(appDataPath, f))));
        }
    });
    const seen = new Set();
    const unique = all.filter(a => {
        const k = `${a.university}|${a.program}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2));
    console.log(`Recovered ${unique.length} entries. Location: ${path.resolve(outputPath)}`);
} catch (e) {
    console.error(e);
}
