const { Level } = require('level');
const path = require('path');
const fs = require('fs');

const tmpPath = path.join(__dirname, 'leveldb_copy');
const outputPath = path.join(__dirname, 'all_recovered_data.json');

async function main() {
    const db = new Level(tmpPath, { createIfMissing: false, valueEncoding: 'buffer' });
    
    try {
        await db.open();
        
        for await (const [key, value] of db.iterator({ valueEncoding: 'buffer', keyEncoding: 'utf8' })) {
            const keyStr = typeof key === 'string' ? key : key.toString('utf8');
            
            if (keyStr.includes('phd-applications')) {
                console.log(`Found key: ${keyStr}`);
                console.log(`Raw value length: ${value.length} bytes`);
                
                // The value is prefixed with 0x00 then UTF-16LE encoded
                // Skip the first byte (0x00 prefix) and decode as UTF-16LE
                const utf16Data = value.slice(1); // skip prefix byte
                const decoded = utf16Data.toString('utf16le');
                
                console.log(`Decoded length: ${decoded.length} chars`);
                console.log(`First 200 chars: ${decoded.substring(0, 200)}`);
                
                try {
                    const parsed = JSON.parse(decoded);
                    fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
                    console.log(`\n=== SUCCESS! Recovered ${parsed.length} applications ===`);
                    parsed.forEach((app, i) => {
                        console.log(`  ${i + 1}. ${app.university} - ${app.program} [${app.status}]`);
                    });
                } catch (e) {
                    console.log(`Parse error: ${e.message}`);
                    // Try trimming trailing nulls
                    const trimmed = decoded.replace(/\0+$/, '');
                    try {
                        const parsed = JSON.parse(trimmed);
                        fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
                        console.log(`\n=== SUCCESS (trimmed)! Recovered ${parsed.length} applications ===`);
                        parsed.forEach((app, i) => {
                            console.log(`  ${i + 1}. ${app.university} - ${app.program} [${app.status}]`);
                        });
                    } catch (e2) {
                        fs.writeFileSync(outputPath, trimmed);
                        console.log(`Saved trimmed raw data to ${outputPath}`);
                    }
                }
                break;
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await db.close();
    }
}

main();
