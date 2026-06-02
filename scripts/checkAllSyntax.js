const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'tests', 'scripts'];

const collectJsFiles = (dirPath, bucket = []) => {
    if (!fs.existsSync(dirPath)) return bucket;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            collectJsFiles(fullPath, bucket);
            continue;
        }
        if (entry.isFile() && fullPath.endsWith('.js')) {
            bucket.push(fullPath);
        }
    }
    return bucket;
};

const files = TARGET_DIRS.flatMap((dirName) => collectJsFiles(path.join(ROOT, dirName)));
let hasError = false;

for (const filePath of files) {
    try {
        const source = fs.readFileSync(filePath, 'utf8');
        new vm.Script(source, { filename: filePath });
    } catch (error) {
        hasError = true;
        process.stderr.write(`\n[syntax-error] ${filePath}\n`);
        if (error?.stack) process.stderr.write(`${error.stack}\n`);
    }
}

if (hasError) {
    process.exit(1);
}

process.stdout.write(`Checked ${files.length} JS files: syntax OK.\n`);
