const fs = require('fs');
const path = require('path');

const commandsMap = new Map();
const aliasMap = new Map();

function loadCommands() {
    const commandsDir = path.join(__dirname, '..', 'commands');
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        try {
            const mod = require(path.join(commandsDir, file));
            if (mod.commands && typeof mod.commands === 'object') {
                for (const [cmd, handler] of Object.entries(mod.commands)) {
                    commandsMap.set(cmd.toLowerCase(), { handler, file });
                }
            }
            if (mod.aliases && typeof mod.aliases === 'object') {
                for (const [alias, cmd] of Object.entries(mod.aliases)) {
                    aliasMap.set(alias.toLowerCase(), cmd.toLowerCase());
                }
            }
        } catch (e) {
            console.error(`Erreur chargement ${file}:`, e.message);
        }
    }
    console.log(`✅ ${commandsMap.size} commandes chargées, ${aliasMap.size} aliases`);
}

function getCommand(name) {
    const lower = name.toLowerCase();
    if (commandsMap.has(lower)) return commandsMap.get(lower);
    const resolved = aliasMap.get(lower);
    if (resolved && commandsMap.has(resolved)) return commandsMap.get(resolved);
    return null;
}

function getAllCommands() { return commandsMap; }
function getAllAliases() { return aliasMap; }

module.exports = { loadCommands, getCommand, getAllCommands, getAllAliases };
