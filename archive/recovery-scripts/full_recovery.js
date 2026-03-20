const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'phd-tracker', 'Local Storage', 'leveldb');
const outputPath = path.join(__dirname, 'all_recovered_data.json');

// Chromium stores localStorage values as UTF-16LE with a 0x01 prefix byte
// We need to find the phd-applications key and decode its value

function tryDecodeUTF16LE(buffer, start, length) {
    let result = '';
    for (let i = start; i < start + length && i + 1 < buffer.length; i += 2) {
        const code = buffer[i] | (buffer[i + 1] << 8);
        if (code === 0) break;
        result += String.fromCharCode(code);
    }
    return result;
}

function findAllUTF16Strings(buffer) {
    // Look for sequences where every other byte is 0x00 (UTF-16LE ASCII range)
    const strings = [];
    let currentString = '';
    let inString = false;
    
    for (let i = 0; i < buffer.length - 1; i += 2) {
        const lo = buffer[i];
        const hi = buffer[i + 1];
        
        if (hi === 0 && lo >= 32 && lo <= 126) {
            currentString += String.fromCharCode(lo);
            inString = true;
        } else if (hi === 0 && (lo === 10 || lo === 13 || lo === 9)) {
            currentString += String.fromCharCode(lo);
        } else {
            if (inString && currentString.length > 5) {
                strings.push(currentString);
            }
            currentString = '';
            inString = false;
        }
    }
    if (currentString.length > 5) strings.push(currentString);
    
    // Also try odd-byte offset
    currentString = '';
    inString = false;
    for (let i = 1; i < buffer.length - 1; i += 2) {
        const lo = buffer[i];
        const hi = buffer[i + 1];
        
        if (hi === 0 && lo >= 32 && lo <= 126) {
            currentString += String.fromCharCode(lo);
            inString = true;
        } else if (hi === 0 && (lo === 10 || lo === 13 || lo === 9)) {
            currentString += String.fromCharCode(lo);
        } else {
            if (inString && currentString.length > 5) {
                strings.push(currentString);
            }
            currentString = '';
            inString = false;
        }
    }
    if (currentString.length > 5) strings.push(currentString);
    
    return strings;
}

try {
    const files = fs.readdirSync(appDataPath);
    console.log(`Scanning ${files.length} files in ${appDataPath}\n`);
    
    let allStrings = [];
    
    for (const file of files) {
        if (!file.endsWith('.ldb') && !file.endsWith('.log')) continue;
        const filePath = path.join(appDataPath, file);
        const buffer = fs.readFileSync(filePath);
        const strings = findAllUTF16Strings(buffer);
        
        if (strings.length > 0) {
            console.log(`${file}: found ${strings.length} text segments`);
            allStrings = [...allStrings, ...strings];
        }
    }
    
    // Now look for JSON arrays in the extracted strings
    console.log(`\nTotal text segments found: ${allStrings.length}`);
    
    let bestData = null;
    let bestCount = 0;
    
    for (const str of allStrings) {
        if (str.includes('[{') && str.includes('university')) {
            console.log(`\nFound potential JSON data (length: ${str.length})`);
            try {
                const data = JSON.parse(str);
                if (Array.isArray(data) && data.length > bestCount) {
                    bestData = data;
                    bestCount = data.length;
                    console.log(`  Valid JSON array with ${data.length} entries!`);
                }
            } catch (e) {
                console.log(`  Not valid JSON, trying to extract...`);
                // Try to find valid JSON within the string
                const start = str.indexOf('[');
                if (start !== -1) {
                    let balance = 0;
                    for (let i = start; i < str.length; i++) {
                        if (str[i] === '[') balance++;
                        if (str[i] === ']') balance--;
                        if (balance === 0) {
                            try {
                                const sub = str.substring(start, i + 1);
                                const data = JSON.parse(sub);
                                if (Array.isArray(data) && data.length > bestCount) {
                                    bestData = data;
                                    bestCount = data.length;
                                    console.log(`  Extracted valid JSON with ${data.length} entries!`);
                                }
                            } catch (e2) {}
                            break;
                        }
                    }
                }
            }
        }
    }
    
    if (bestData) {
        fs.writeFileSync(outputPath, JSON.stringify(bestData, null, 2));
        console.log(`\n=== SUCCESS! Recovered ${bestData.length} applications ===`);
        console.log(`Saved to: ${outputPath}`);
        console.log(`\nApplications found:`);
        bestData.forEach((app, i) => {
            console.log(`  ${i + 1}. ${app.university} - ${app.program} [${app.status}]`);
        });
    } else {
        console.log('\nNo valid JSON arrays found. Dumping all text segments for inspection...');
        const debugPath = path.join(__dirname, 'debug_strings.txt');
        fs.writeFileSync(debugPath, allStrings.join('\n===SEGMENT===\n'));
        console.log(`Debug output saved to: ${debugPath}`);
    }
    
} catch (err) {
    console.error('Error:', err.message);
}
