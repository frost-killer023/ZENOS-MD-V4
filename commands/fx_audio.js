const { downloadMedia } = require('../lib/helper');
const fs = require('fs-extra');
const path = require('path');

async function getAudioBuffer(msg, sock) {
    const direct = await downloadMedia(msg, sock);
    if (direct && direct.type === 'audio') return direct.buffer;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    const fakeMsg = { message: quoted, key: { remoteJid: msg.key.remoteJid } };
    const q = await downloadMedia(fakeMsg, sock);
    return (q && q.type === 'audio') ? q.buffer : null;
}

function applyAudioEffect(inputPath, outputPath, filters) {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        // Use system ffmpeg if available
        let cmd = ffmpeg(inputPath).audioFilters(filters).output(outputPath);
        cmd.on('end', resolve).on('error', reject).run();
    });
}

function createAudioEffect(name, filters, caption) {
    return async ({ sock, msg }) => {
        const buffer = await getAudioBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite un audio/vocal' });
        await sock.sendMessage(msg.key.remoteJid, { text: `⏳ Application de l'effet *${name}*...` });
        const tmpIn = path.join(__dirname, '..', 'data', `fx_in_${Date.now()}.mp3`);
        const tmpOut = path.join(__dirname, '..', 'data', `fx_out_${Date.now()}.mp3`);
        try {
            await fs.writeFile(tmpIn, buffer);
            await applyAudioEffect(tmpIn, tmpOut, filters);
            const result = await fs.readFile(tmpOut);
            await sock.sendMessage(msg.key.remoteJid, { audio: result, mimetype: 'audio/mpeg', ptt: true });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur effet audio: ${e.message}` });
        } finally {
            await fs.remove(tmpIn).catch(() => {});
            await fs.remove(tmpOut).catch(() => {});
        }
    };
}

const commands = {
    bass: createAudioEffect('Bass Boost', 'bass=g=20,dynaudnorm=f=200'),
    blown: createAudioEffect('Blown', 'acrusher=level_in=4:level_out=3:bits=8:mode=log'),
    deep: createAudioEffect('Deep Voice', 'atempo=0.8,asetrate=44100*0.85,aresample=44100'),
    earrape: createAudioEffect('Earrape', 'acrusher=level_in=8:level_out=18:bits=8:mode=log,dynaudnorm'),
    fast: createAudioEffect('Fast', 'atempo=1.5'),
    fat: createAudioEffect('Fat Voice', 'atempo=0.9,asetrate=44100*0.9,aresample=44100'),
    nightcore: createAudioEffect('Nightcore', 'atempo=1.15,asetrate=44100*1.25,aresample=44100'),
    reverse: createAudioEffect('Reverse', 'areverse'),
    robot: createAudioEffect('Robot', 'afftfilt=real=\'hypot(re,im)*cos(0)\':imag=\'hypot(re,im)*sin(0)\':win_size=512:overlap=0.75'),
    slow: createAudioEffect('Slow', 'atempo=0.75'),
    smooth: createAudioEffect('Smooth', 'equalizer=f=1000:width_type=o:width=2:g=-10,equalizer=f=5000:width_type=o:width=2:g=-10'),
    squirrel: createAudioEffect('Squirrel', 'atempo=1.3,asetrate=44100*1.5,aresample=44100'),
    muted: createAudioEffect('Muted', 'volume=0.2'),
    echo: createAudioEffect('Echo', 'aecho=0.8:0.9:1000:0.3'),
    reverb: createAudioEffect('Reverb', 'aecho=0.8:0.88:60:0.4,aecho=0.8:0.88:120:0.3'),
    chipmunk: createAudioEffect('Chipmunk', 'asetrate=44100*1.7,aresample=44100,atempo=0.9'),
    vibrato: createAudioEffect('Vibrato', 'vibrato=f=7:d=0.5'),
    tremolo: createAudioEffect('Tremolo', 'tremolo=f=5:d=0.8'),
    cave: createAudioEffect('Cave', 'aecho=0.8:0.9:500:0.5,aecho=0.8:0.9:1000:0.3'),
    underwater: createAudioEffect('Underwater', 'lowpass=f=500,aecho=1:0.5:100:0.5'),
    telephone: createAudioEffect('Telephone', 'highpass=f=300,lowpass=f=3400,aecho=0.8:0.4:20:0.3'),
    haunting: createAudioEffect('Haunting', 'vibrato=f=2:d=0.9,aecho=0.8:0.9:800:0.4'),
    distortion: createAudioEffect('Distortion', 'acrusher=level_in=4:level_out=4:bits=8:mode=log'),
    vintage: createAudioEffect('Vintage', 'highpass=f=200,lowpass=f=4000,aecho=0.3:0.3:30:0.2'),
    phaser: createAudioEffect('Phaser', 'aphaser=in_gain=0.4:out_gain=0.74:delay=3:decay=0.4:speed=0.5:type=triangular'),
    chorus: createAudioEffect('Chorus', 'chorus=0.5:0.9:50:0.4:0.25:2'),
    flanger: createAudioEffect('Flanger', 'flanger=delay=20:depth=10:speed=5'),
    lofi: createAudioEffect('Lo-Fi', 'lowpass=f=3000,aresample=22050,aresample=44100,aecho=0.4:0.4:80:0.2'),
    space: createAudioEffect('Space', 'aecho=0.9:0.9:2000:0.5,vibrato=f=0.5:d=0.3'),
    dark: createAudioEffect('Dark', 'atempo=0.85,asetrate=44100*0.8,aresample=44100,bass=g=15'),
    mono: createAudioEffect('Mono', 'pan=mono|c0=0.5*c0+0.5*c1'),
    radio: createAudioEffect('Radio', 'highpass=f=300,lowpass=f=3000,volume=1.5,aecho=0.3:0.3:20:0.1')
};

const aliases = {};

module.exports = { commands, aliases };
