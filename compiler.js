const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const PORT = 3000; // Port for the live server and WebSocket

// Add this line at the top of your file to make websiteFolder globally accessible in this script
const rootWebsiteFolder = path.join(__dirname, 'website'); // GLOBAL ROOT DIRECTORY

// Function to parse files and replace [[ includes ]], with optional live reload injection
async function parseAndReplace(directory, outputDirectory, injectLiveReload = false) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const outputFilePath = path.join(outputDirectory, file);

        if (fs.statSync(filePath).isDirectory()) {
            if (file.startsWith('_')) {
                console.log(`Skipped directory: ${file}`);
                continue;
            }

            if (!fs.existsSync(outputFilePath)) {
                fs.mkdirSync(outputFilePath, { recursive: true });
            }
            await parseAndReplace(filePath, outputFilePath, injectLiveReload);
        } else {
            let content = fs.readFileSync(filePath, 'utf-8');
            const matches = content.match(/\[\[\s*([^\]]+?)\s*\]\]/g); // Match [[ ... ]]

            if (matches) {
                for (const match of matches) {
                    const fullMatch = match.match(/\[\[\s*(.*?)\s*\]\]/)[1];

                    // Check if the match contains parameters: e.g., file.html(key=value, ...)
                    const [includePathPart, paramsPart] = fullMatch.split(/\s*\((.*?)\)\s*/).filter(Boolean);
                    const includePath = includePathPart.trim();

                    const targetPath = path.join(rootWebsiteFolder, includePath);

                    if (fs.existsSync(targetPath)) {
                        let replacementContent = fs.readFileSync(targetPath, 'utf-8');

                        // If there are parameters, parse and apply them
                        if (paramsPart) {
                            const params = paramsPart
                                .split(',')
                                .map(pair => pair.trim().split('='))
                                .reduce((acc, [key, val]) => {
                                    acc[key.trim()] = val.trim();
                                    return acc;
                                }, {});

                            // Replace [key] in replacementContent with provided values
                            for (const [key, val] of Object.entries(params)) {
                                const varRegex = new RegExp(`\\[${key}\\]`, 'g');
                                replacementContent = replacementContent.replace(varRegex, val);
                            }
                        }

                        content = content.replace(match, replacementContent);
                    } else {
                        console.warn(`File not found: ${targetPath}`);
                        content = content.replace(match, `<!-- file [${includePath}] does not exist -->`);
                    }
                }
            }

            if (!file.startsWith('_')) {
                if (injectLiveReload && file.endsWith('.html')) {
                    const liveReloadScript = `
    <script>
        const socket = new WebSocket('ws://localhost:${PORT}');

        socket.addEventListener('open', () => {
            console.log('Connected to the live server');
        });

        socket.addEventListener('message', (event) => {
            if (event.data === 'reload') {
                location.reload();
            }
        });

        socket.addEventListener('close', () => {
            console.log('Disconnected from the live server');
        });
    </script>`;

                    if (content.includes('</body>')) {
                        content = content.replace('</body>', `${liveReloadScript}\n</body>`);
                    } else {
                        content += liveReloadScript;
                    }
                }

                fs.writeFileSync(outputFilePath, content, 'utf-8');
                console.log(`Processed: ${outputFilePath}`);
            } else {
                console.log(`Skipped file: ${file}`);
            }
        }
    }
}

// Watches files and triggers rebuild and client reload
function watchAndRebuild(sourceDir, outputDir, notifyClients) {
    console.log('Watching for file changes...');
    fs.watch(sourceDir, { recursive: true }, (eventType, filename) => {
        if (filename) {
            console.log(`File changed: ${filename}`);
            parseAndReplace(sourceDir, outputDir, true)
                .then(() => {
                    notifyClients();
                })
                .catch(err => console.error(err));
        }
    });
}

// Starts local web + websocket server
function startLiveServer(outputDir) {
    const server = http.createServer((req, res) => {
        const filePath = path.join(outputDir, req.url === '/' ? 'index.html' : req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200);
                res.end(data);
            }
        });
    });

    const wss = new WebSocket.Server({ server });

    const clients = [];
    wss.on('connection', (ws) => {
        clients.push(ws);
        ws.on('close', () => {
            const index = clients.indexOf(ws);
            if (index !== -1) {
                clients.splice(index, 1);
            }
        });
    });

    const notifyClients = () => {
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send('reload');
            }
        });
    };

    server.listen(PORT, () => {
        console.log(`Live server running at http://localhost:${PORT}`);
    });

    return notifyClients;
}

const websiteFolder = path.join(__dirname, 'website');
const outputFolder = path.join(__dirname, 'dist');

if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

const args = process.argv.slice(2);
if (args.includes('-watch')) {
    const notifyClients = startLiveServer(outputFolder);
    parseAndReplace(websiteFolder, outputFolder, true)
        .then(() => watchAndRebuild(websiteFolder, outputFolder, notifyClients))
        .catch(err => console.error(err));
} else {
    parseAndReplace(websiteFolder, outputFolder, false).catch(err => console.error(err));
}
