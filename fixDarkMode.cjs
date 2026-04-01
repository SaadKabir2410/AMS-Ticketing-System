const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdir(dir, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filepath = path.join(dir, file);
            fs.stat(filepath, (err, stats) => {
                if (stats.isDirectory()) {
                    walk(filepath, callback);
                } else if (stats.isFile() && filepath.endsWith('.jsx')) {
                    callback(filepath);
                }
            });
        });
    });
}

walk(path.join(__dirname, 'src'), (filepath) => {
    let content = fs.readFileSync(filepath, 'utf8');
    let newContent = content
        .replace(/dark:border-white\/10/g, 'dark:border-slate-700')
        .replace(/dark:border-white\/5/g, 'dark:border-slate-800')
        .replace(/dark:bg-white\/5/g, 'dark:bg-slate-800')
        .replace(/dark:bg-white\/2/g, 'dark:bg-slate-800/50')
        .replace(/dark:bg-white\/10/g, 'dark:bg-slate-700')
        .replace(/dark:bg-slate-900\/40/g, 'dark:bg-slate-900 h-full w-full')   // Modal backdrop
        .replace(/dark:bg-slate-900\/50/g, 'dark:bg-slate-800');  // Inputs

    if (content !== newContent) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log('Updated ' + filepath);
    }
});
