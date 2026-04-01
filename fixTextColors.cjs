const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        let filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walk(filepath, callback);
        } else if (filepath.endsWith('.jsx')) {
            callback(filepath);
        }
    });
}

walk(path.join(__dirname, 'src'), (filepath) => {
    let content = fs.readFileSync(filepath, 'utf8');
    let newContent = content
        .replace(/dark:text-slate-600/g, 'dark:text-slate-300')
        .replace(/dark:text-slate-500/g, 'dark:text-slate-400');
    if (content !== newContent) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log("Updated text colors in " + filepath);
    }
});
